---
title: Sending another message while an AI agent is still answering
description: Queue follow-ups by conversation, read them between model calls, and let the browser reconnect to the same reply.
date: 2026-11-16
category: Engineering
author: Breatic team
draft: false
---

You ask an AI agent to design a poster. While it's working, you realize the layout needs to be vertical. If a generation request has already gone out, "make it vertical" can't change that request. It can still change what the agent does next.

That leaves two questions for the application: when does a follow-up become part of the conversation, and what happens to it if the browser or the server goes away first?

## Give each conversation one running reply

In Breatic, sending a message and reading a reply are separate requests. The send endpoint either starts a run, accepts the message into the queue, identifies a duplicate, or tells the browser the queue is full. The reply goes out over a server-sent events stream tied to the conversation. Reloading the page or opening the same conversation in another tab can reconnect to that stream without starting another run.

The server uses Redis to give a conversation one active run. The code that checks ownership and accepts a message runs as one Redis operation. If two tabs send at nearly the same time, they can't each start a reply simply because both saw the conversation as idle. An active run renews a lease. If it dies, the lease can expire and leave the conversation available for recovery.

## Read follow-ups before the next model call

Before each model step, the run checks for waiting messages. It takes the messages in order and appends them to the model's input as user messages. If you send “make it vertical” while the model is producing a response or a tool is running, you can see the follow-up waiting. It becomes part of the conversation at the point where the agent reads it in.

That distinction matters: a message accepted by the server is not necessarily a message the model has already seen. We can put it in front of the next call; we can't edit an in-flight call or undo a tool action that has already finished. If a message comes in after the last model step but before the reply is closed out, the server can read it in by continuing the same reply.

## Keep a message until its reply is saved

Removing a message from the waiting list as soon as a run reads it leaves a gap. If the process stops after reading the message but before saving the reply, the message is gone even though the user sent it successfully.

The [queue implementation](https://github.com/orime-org/breatic/blob/5a3b4acfdbc58779ed16df696900dad881f12489/packages/server/src/modules/chat-queue/chat-queue.service.ts) moves waiting messages to a separate list of messages taken by the run. The server clears entries once the stored reply records them. If a run dies, its taken messages stay available for the next run to read ahead of newer messages. The queue preserves the user's input across that interruption. Recovery can present an input again; it doesn't promise that a remote tool action ran exactly once.

## Check the behavior across two tabs

An easy way to see why the run belongs to the conversation is to open a second tab while the agent is answering. Send the correction in one tab and watch both. The follow-up should show up at the same point in the reply in both tabs. Then close the original tab: the reply should continue and be visible when you reopen the conversation.

The [end-to-end tests](https://github.com/orime-org/breatic/blob/5a3b4acfdbc58779ed16df696900dad881f12489/packages/web/tests/smoke/agent-mid-run-messages.spec.ts) cover those cases, along with reloading during an answer and explicitly stopping a run while two messages are waiting. This article describes the implementation merged in [PR #1520](https://github.com/orime-org/breatic/pull/1520).
