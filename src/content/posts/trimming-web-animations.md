---
title: Trimming web animations like video clips
description: A non-destructive timeline model, a shared playback clock, and the small handshake that keeps a web animation on the right frame.
date: 2026-11-13T00:00:00+08:00
category: Engineering
author: Breatic team
discussion: 1509
---

Take a 10-second web animation. Keep seconds 3–6, place that clip at second 20 of a video timeline, and move the playhead to second 21.

The preview should show the animation at its original second 4. It should also let you drag backward, jump to another frame, or use a different part of the same animation in a second clip.

In Breatic, the timeline controls the animation's time through a seekable playback runtime. Trimming records a source range; the original animation stays intact.

## Represent the edit as a range

Each clip records three positions: where it starts on the timeline, where it starts in its source, and how long it lasts. At normal playback speed:

```text
source time = source in-point + timeline time − clip start
         4s =             3s +           21s −        20s
```

Moving this clip from second 20 to second 30 changes when it appears. Its first visible source moment is still second 3. Trimming the right edge changes its duration. Neither operation rewrites the animation source.

The implementation stores frame positions, accounts for the source and timeline frame rates and the clip's playback rate, and clamps the requested frame inside the clip's range. The mapping lives in [web-animation-host.ts](https://github.com/orime-org/breatic/blob/f350d3eb165f6505bd9a97b484109363028aa6de/packages/web/src/spaces/timeline/web-animation-host.ts#L105).

## Give the timeline control of the animation clock

The animation must be able to render a requested time directly. Breatic uses animation packages prepared for a HyperFrames-based runtime, with a `renderSeek(time)` entry point. An arbitrary web page does not acquire that capability just by being placed in an iframe.

The preview runs each active animation instance in an iframe and sends it the source time calculated from the playhead. When two copies overlap, they can be at different source times; the preview allocates independently driven instances for them. An [instance pool](https://github.com/orime-org/breatic/blob/f350d3eb165f6505bd9a97b484109363028aa6de/packages/web/src/spaces/timeline/web-instance-pool.ts) handles visible copies, preloading, and reuse.

The edit belongs to the copy. Changing or deleting one copy leaves other copies and the original animation intact.

## A seek request is not a ready frame

Calculating the time is straightforward. Coordinating the iframe with the rest of the preview needs another step: an acknowledgement that the requested state is ready.

The page-side bridge:

1. Receives a seek request containing a session, sequence, and time.
2. Calls `renderSeek(time)`.
3. Waits for `document.fonts.ready` and two animation frames.
4. Replies if a newer seek has not superseded the request.

Consider dragging the playhead to a later moment, then immediately backward. The earlier request may still have pending asynchronous work. Its completion must not make the newer request appear ready.

The page suppresses superseded replies, and the host accepts a readiness reply only for the current session and latest sequence. A reload opens a new session. The handshake is implemented in [web-animation-bridge.ts](https://github.com/orime-org/breatic/blob/f350d3eb165f6505bd9a97b484109363028aa6de/packages/shared/src/timeline/web-animation-bridge.ts) and the host linked above.

Waiting for fonts and two animation frames is the preview's readiness convention. It is not a browser-provided guarantee that every pixel has finished painting.

## Keep video and web-animation layers together

Visible video layers and web-animation copies follow a shared timeline clock. When a layer needs positioning or is not ready, the preview can hold at its current frame rather than letting the other layers run ahead.

Once the animation can be addressed in time, the timeline can treat it as a clip: trim it, move it, duplicate it, and combine it with video. The newer layer controls also let you adjust its position, scale, and rotation in the preview.

The interactive diagram below shows the source-time mapping from the opening example. Drag its playhead to see how timeline time becomes animation time. It is an explanatory diagram, not a recording of Breatic.

## Implementation snapshot and limits

This article describes commit [`f350d3eb`](https://github.com/orime-org/breatic/commit/f350d3eb165f6505bd9a97b484109363028aa6de), merged on November 13, 2026. The move, resize, rotate, and layered-preview changes are in [PR #1503](https://github.com/orime-org/breatic/pull/1503); trimming support predates that PR.

At the time of writing, those changes were merged into the main branch and had not shipped in a new release. This implementation covers editing and preview. Video export remains future work.
