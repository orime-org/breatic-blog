---
title: When an AI generation finishes before its bill arrives
description: Separating result delivery from billing, keeping credits reserved, and resuming paid work through persistent tickets.
date: 2026-11-13T21:42:00+08:00
category: Engineering
author: Breatic team
discussion: 1515
---

A video generation finishes. The output has been saved and is ready to put on the canvas. The upstream service can tell us where the video is, but its billing endpoint cannot yet tell us what the run cost.

Should the user keep waiting for the video? Should we release the reserved credits? Should a retry generate another video?

In Breatic's latest model-provider migration, the result can be delivered while its cost is still pending. The task is complete, its credits remain reserved, and a later worker pickup handles the bill. That makes completion and billing separate states in the application.

## Give unknown costs an explicit state

A numeric cost field cannot distinguish a free call from a call whose price has not arrived. The provider layer returns a [cost value](https://github.com/orime-org/breatic/blob/faefc8b5244d06728de9768634fa3b76c92bcd86/packages/provider/src/cost.ts) with one of three states:

| Cost state | What the caller receives | What the worker does |
| --- | --- | --- |
| `known` | A dollar amount and its source | Includes the amount in the charge calculation |
| `pending` | A serializable lookup identifying the upstream and the call | Keeps the lookup for a later attempt |
| `missing` | A reason the amount could not be determined | Logs the missing cost; that portion contributes no charge |

A known amount can come from a reported cost, a billing query, or a price table. A pending amount carries a way to ask again. Treating both as ordinary numbers would lose the distinction between an amount we have and an amount we still need to retrieve.

## Deliver the result while keeping its credits reserved

For a successful media task with pending costs, the [completion path](https://github.com/orime-org/breatic/blob/faefc8b5244d06728de9768634fa3b76c92bcd86/packages/worker/src/handlers/dispatch.ts#L785) stores the result with the known portion of the cost and the outstanding lookups. It marks the task completed, extends its credit hold, and delivers the output to the canvas, history, and project activity feed. Those records carry a billing-pending indication.

The hold reserves Breatic credits within the application. It is separate from a card authorization or a Stripe payment. Keeping it prevents those credits from becoming available for another generation while this task still needs to be billed.

The task's own queue job then returns later to look up the cost. It reads the stored result rather than starting another generation. If delivery was interrupted after completion was recorded, the resumed path delivers the saved result before continuing with the bill.

This gives the user the output without making them wait for the final bill.

## Bound the wait for the bill

The [cost-wait state](https://github.com/orime-org/breatic/blob/faefc8b5244d06728de9768634fa3b76c92bcd86/packages/worker/src/handlers/cost-wait.ts) records the known cost, the upstream, the number of lookup attempts, and the end of the lookup window. Each subsequent delay is twice the preceding one. The attempt count and initial delay are configuration values.

The worker preserves costs it has already found and asks again only about unresolved entries. Once they are answered, or the configured wait ends, it combines the known amounts and rounds the final credit charge once.

An amount that remains unavailable contributes nothing to that charge and produces a warning. This bounds how long the task waits, at the cost of leaving the operator with an unpriced portion of the work. The system does not substitute the original estimate for a missing bill in this path.

## Commit the billing decision with the charge request

A queue can deliver the same job again. Two pickups must not each record a new charge just because both observed a completed result.

The task has a separate `billedAt` marker. The [billing transaction](https://github.com/orime-org/breatic/blob/faefc8b5244d06728de9768634fa3b76c92bcd86/packages/domain/src/task/task.service.ts#L202) updates that marker only while it is unset. Only the pickup that wins the update records the charge request, in the same database transaction.

Settlement follows that durable request. It charges the credits and releases the hold together. If settlement fails, the request remains pending for recovery; a valid delivered result does not become a failed generation because the ledger needs another attempt. The history and activity records are updated with the final credit amount.

## Persist the position before a paid request

There is a related problem earlier in a run: a worker can stop between sending a paid request and saving the reply.

The new [media runner integration](https://github.com/orime-org/breatic/blob/faefc8b5244d06728de9768634fa3b76c92bcd86/packages/worker/src/handlers/media-run.ts) stores a serializable provider ticket on the task, with a version used for conditional updates. It also writes a sending marker before making a paid request. On another pickup, a running ticket is polled; a ticket with an interrupted send goes through recovery.

That marker does not make a remote API call transactional. When the upstream accepted a request but its reply was lost, the outcome can still be ambiguous. The provider tests explicitly cover a recovery warning for a potentially duplicated cost. Persisting the position gives recovery something concrete to work from without claiming that every upstream offers exactly-once execution.

## The implementation boundary

This behavior is part of [PR 1505](https://github.com/orime-org/breatic/pull/1505), merged on November 13, 2026, which moves application model calls through `@breatic/provider`. The paths above describe successful media tasks with delayed costs; other call paths, including Agent usage lookups, have their own settlement handling.

The repository includes [integration cases](https://github.com/orime-org/breatic/blob/faefc8b5244d06728de9768634fa3b76c92bcd86/packages/provider/src/media/__tests__/runner-costs.integration.test.ts#L325) where a completed generation returns while the billing endpoint hangs, and where an unanswered final lookup becomes a missing cost. This article describes the merged source at [`faefc8b5`](https://github.com/orime-org/breatic/commit/faefc8b5244d06728de9768634fa3b76c92bcd86), rather than announcing a production rollout.
