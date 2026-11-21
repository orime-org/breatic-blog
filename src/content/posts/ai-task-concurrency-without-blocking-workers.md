---
title: Limiting AI tasks without blocking workers
description: Separate running tasks from worker execution slots, delay excess work, and coordinate starts and cancellations under one database lock.
date: 2026-11-21
category: Engineering
author: Breatic team
draft: false
---

A person has two generation tasks running and submits a third. Suppose their allowance is two: the third task should wait, even if a worker is free. Another person's task may still be eligible to start.

Putting the third task to sleep inside a worker would use an execution slot for work that cannot begin. Rejecting it would make the user submit it again. Breatic records the wait in the database and puts the queue job back into a delayed state. A later pickup checks whether it can start.

The queue schedules another visit. A database transaction decides whether that visit is allowed to start work.

## Count tasks separately from worker handlers

There are two limits to keep apart:

| Limit | What it counts | What frees it |
| --- | --- | --- |
| Worker concurrency | Queue handlers executing at this moment | A handler returns or hands its job back to the queue |
| A person's running task allowance | Application tasks admitted to run, including work handled through later pickups | The task leaves the counted running lifecycle |

A worker can handle one step of a long task, defer its next check, and process something else. That does not mean the person has finished that task or earned another running slot. Increasing worker concurrency therefore does not replace admission control.

In Breatic, the gate counts a person's work across ordinary tasks and Timeline executions. It chooses the allowance from the Studio in which the new work runs, falling back to the person's membership when there is no owning Studio. The count follows the application's execution-budget and reporting-grace rules; it is not a count of every HTTP request an upstream provider might still have open.

## Check and start under the same lock

Checking a count and then starting outside the check allows a race. Two workers can both see one available slot and each take it.

The [admission service](https://github.com/orime-org/breatic/blob/b932b0d5e60942987380adb3365f6173c8ee3f3f/packages/domain/src/task/running-slot.service.ts) takes a PostgreSQL transaction-scoped advisory lock keyed to the person. Under that lock it checks that the task is still pending, counts running work, and either starts the task or records its wait. Cancellation and terminal cleanup of ordinary tasks use the same lock.

The decision includes two counts:

```text
R = counted running tasks and Timeline executions
W = eligible earlier waiters
L = the allowance for this task's Studio context

Start only when R + W < L.
```

An eligible earlier waiter belongs to the same person, was created earlier, was judged under the same allowance, and has been checked recently. Both ordinary tasks and Timeline executions contribute to these counts. The [repository queries](https://github.com/orime-org/breatic/blob/b932b0d5e60942987380adb3365f6173c8ee3f3f/packages/domain/src/task/task.repo.ts) compare the original database timestamp rather than round it through a JavaScript date.

Counting earlier waiters gives them precedence when slots become available. This is narrower than a global FIFO guarantee: work with a different allowance is not in the same waiting group, stale waiters stop contributing, and equal creation timestamps do not establish an order through this comparison.

The gate also bounds its attempt to acquire the lock. If it cannot acquire it in that window, it writes nothing and asks for another pickup after one polling interval. It does not hold a database transaction open for the whole queue wait.

## Delay the job instead of sleeping through the wait

When the gate records a wait, the task remains pending and its node rows gain a waiting indication. The service signals the caller with a `StillRunning` value carrying the next eligible check time.

The [worker handler](https://github.com/orime-org/breatic/blob/b932b0d5e60942987380adb3365f6173c8ee3f3f/packages/worker/src/handlers/dispatch.ts) hands the active job back to BullMQ:

```ts
await job.moveToDelayed(err.resumeAt, token);
throw new DelayedError();
```

The token identifies the current queue-job lock. `DelayedError` tells BullMQ that the processor deliberately delayed the job, so it should not complete it or treat it as a failed attempt. This follows BullMQ's documented [active-job delay pattern](https://docs.bullmq.io/patterns/process-step-jobs); its [retry accounting](https://docs.bullmq.io/patterns/stop-retrying-jobs) excludes this error from `attemptsMade`.

The handler no longer occupies an execution slot while the job is delayed. Each later pickup still takes worker time, a lock attempt, and database reads. To space out those checks, Breatic computes a delay from the running count and the number of earlier waiters, bounded by a configured maximum.

A delay schedules a recheck, not a promised start time. The worker must pick the job up again, and admission must still succeed then.

## Start the execution clock after admission

Time spent waiting for permission to start should not consume the task's execution budget.

For an admitted ordinary task, the transaction changes it from pending to running and sets its first `startedAt`. Its waiting node rows start then as well. An admitted Timeline execution takes its claim and receives its execution budget at that point. A later pickup of already-running work preserves the original start rather than granting a fresh budget each time.

Once the gate has recorded a slot wait, the corresponding deadline and harvesting paths recognize it as waiting. Merely accepting a fresh task into the queue does not give it that protection: a task the gate has never judged can still reach its existing deadline.

There is also a credit reservation to preserve. While an ordinary task waits, the gate renews its hold when it approaches expiry; admission renews it again. These are reservations inside Breatic's credit system, separate from payment-card authorizations. The earlier article on [results arriving before their bills](../generation-before-billing/) covers another reason a hold may need to outlive one worker pickup.

## Make cancellation race with the same decision

Consider a user cancelling just as a worker becomes ready to start their queued task.

The [queued cancellation path](https://github.com/orime-org/breatic/blob/b932b0d5e60942987380adb3365f6173c8ee3f3f/packages/domain/src/task/running-slot.service.ts) takes the person's advisory lock, conditionally changes a still-pending task to cancelled, and releases its credit hold in the same transaction. Node-row settlement and notifications follow that commit.

If cancellation commits first, the worker's locked recheck sees that the task is no longer pending. If admission wins first, the queued cancellation returns that it did not cancel the task. It does not pretend to have stopped work that already started.

This coordinates the application's pending-to-running decision. It does not make a remote model call exactly-once or revoke an upstream request that has already been accepted.

## Distinguish stale accounting from a lost job

An old waiting row creates two different questions: should it still hold newer work back, and will its queue job ever return?

After a configurable freshness window, the row stops contributing to the count of earlier waiters. Its age alone does not fail the task or release its credit hold.

A separate [waiting-task sweep](https://github.com/orime-org/breatic/blob/b932b0d5e60942987380adb3365f6173c8ee3f3f/packages/worker/src/handlers/slot-wait-sweep.ts) checks the associated queue job:

| Queue job observation | Sweep action |
| --- | --- |
| Missing, completed, failed, or reported as unknown | Fail the abandoned application task through the shared cleanup path and release its hold |
| Still in a live queue state, including delayed or active | Leave the task for that job and log the stale condition |
| Inspection or cleanup fails | Log the failure and leave it for a later sweep |

Dropping a stale waiter from an admission count and ending an abandoned task are separate operations. Combining them into one timeout would risk releasing resources while a live job could still return.

## Test the transitions that can overlap

The [integration suite](https://github.com/orime-org/breatic/blob/b932b0d5e60942987380adb3365f6173c8ee3f3f/packages/integration-tests/src/__tests__/running-task-gate.integration.test.ts) exercises the gate with PostgreSQL and Redis. It includes:

- Competing pickups that must respect the admission count.
- A live BullMQ job picked up repeatedly while blocked, without increasing `attemptsMade`.
- Cancellation racing with a pickup, with the credit hold released by the cancellation commit when cancellation wins.
- Waiting tasks surviving clock changes and deadline processing after entering the waiting state.
- Lost queue jobs, stale waiter accounting, and changes to the applicable allowance.

These checks concern state transitions and recovery, rather than a throughput claim. The queue remains responsible for scheduling pickups; the database remains responsible for serializing each person's start, cancellation, and cleanup decisions. Keeping those responsibilities separate lets a task wait without keeping a worker handler waiting alongside it.
