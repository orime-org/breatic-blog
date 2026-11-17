---
title: Checking speech input limits before reserving credits
description: Count the dialogue turns a speech API receives, give the editor the same limit, and validate the request before reserving credits.
date: 2026-11-17
category: Engineering
author: Breatic team
---

A two-person script in a speech editor looks like a block of text. The speech API may receive a list of turns, each with its own speaker and text. A limit on that list applies to the request we send. Counting lines in the editor can give a different answer.

We ran into this while updating Gemini speech in Breatic. A voice generation can come from the editor or from an Agent proposal, and both paths eventually hand work to a queued worker. We wanted the user to know which part of the script exceeded a limit before the server reserved credits.

## Count the turns that reach the speech API

Given two configured speakers, an editor might produce a script like this:

```text
Maya: Are we rolling?
Leo:
Leo: Ready.
```

The speech request contains two turns, in the original order. The empty Leo line contributes nothing, and Maya's name is carried as a speaker identifier, separate from the words she says. A single-voice request instead sends the text as one field. [Dialogue conversion](https://github.com/orime-org/breatic/blob/v0.0.32/packages/provider/src/pricing/dialogue.ts)

The route we configured for Gemini 3.8 has separate rules for those shapes. The WaveSpeed binding in v0.0.32 allows up to 8,000 characters in the single-voice text field. For dialogue, it checks up to 8,000 characters per turn and up to 100 turns. Keeping those values on the binding lets another route for the same model describe its own limits. [Speech provider bindings](https://github.com/orime-org/breatic/blob/v0.0.32/config/provider/media/tts.yaml)

## Show the limit where the user can fix it

A refusal carries the affected field, what the rule measures, and the maximum. That lets the editor explain the difference between a line that is too long and a script with too many speaking turns. An Agent proposal can return the same reason so the next draft can address the specific limit. [Provider input checks](https://github.com/orime-org/breatic/blob/v0.0.32/packages/provider/src/pricing/estimate.ts) · [Agent proposal checks](https://github.com/orime-org/breatic/blob/v0.0.32/packages/domain/src/agent/tools/propose-canvas-action.ts)

For dialogue, the check and the request builder use the same conversion to turns. We also share the text cleanup used by the worker, so validation can work from the submitted wording after editor markup is removed. An empty speaker line or a character used to format a prompt should have the same effect at both stages. [Text cleanup](https://github.com/orime-org/breatic/blob/v0.0.32/packages/shared/src/agent/extract-prompt.ts) · [Worker parameter preparation](https://github.com/orime-org/breatic/blob/v0.0.32/packages/worker/src/handlers/model-params.ts)

## Validate again before the credit hold

The browser can point out a problem while the user is still in the editor. The server then checks the submitted input against the routes it can use. When the applicable routes refuse that input, the server returns the reason before placing a hold on the user's Breatic credits. If a refusal surfaces after a task has been queued, its reason can still be shown on the task node. [Server-side admission](https://github.com/orime-org/breatic/blob/v0.0.32/packages/server/src/modules/task/model-servable.ts) · [Worker refusal handling](https://github.com/orime-org/breatic/blob/v0.0.32/packages/worker/src/handlers/media-run.ts)

The case worth keeping in a regression test is a script with exactly 100 speaking turns and one speaker-only line. That script still contains 100 turns. Add a sentence to the empty line and it contains 101. The editor, server check, and outgoing request should agree about which version crosses the configured limit. [Gemini route tests](https://github.com/orime-org/breatic/blob/v0.0.32/packages/provider/src/config/__tests__/gemini-3.8-tts.test.ts)
