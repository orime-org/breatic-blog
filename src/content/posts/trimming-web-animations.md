---
title: Trimming web animations like video clips
description: A non-destructive timeline model, a shared playback clock, and the small handshake that keeps a web animation on the right frame.
date: 2026-11-13T00:00:00+08:00
category: Engineering
author: Breatic team
discussion: 1509
---

A web animation can play in a browser. But putting it in a video timeline requires more than a play button: you need to trim it, move it, duplicate it, and jump directly to a particular moment.

In Breatic, a web animation is an editable timeline clip. The source remains a web animation; the timeline decides which part to show and when to show it.

## A cut changes the range, not the source

Each copy has a position on the timeline, an in-point in the original animation, and a duration. Dragging either end of a clip changes its range while leaving the source intact.

Take a 10-second animation and keep only seconds 3–6. Place that three-second clip at second 20 of the timeline. When the playhead reaches second 21, the animation needs to show its original second 4.

At normal playback speed, the mapping is:

```text
animation time = source in-point + timeline time − clip start
           4s =             3s +           21s −        20s
```

The implementation stores positions as frames and accounts for the source frame rate, the timeline frame rate, and the clip's playback rate. The requested timeline frame is clamped inside the clip's visible range.

Two copies can therefore refer to the same animation while keeping different in-points and durations. Trimming or deleting one copy does not change the other copy or the original animation.

## The animation needs a time-addressable runtime

This model depends on the animation runtime being able to render a requested time. It works with animation packages prepared for Breatic's HyperFrames-based playback runtime. It does not make an arbitrary web page seekable.

The timeline maps the playhead position to source time and asks the animation runtime to render that time. Moving a clip later in the sequence changes when it appears, without changing the source moment at its beginning.

The host-side mapping is in [web-animation-host.ts](https://github.com/orime-org/breatic/blob/f350d3eb165f6505bd9a97b484109363028aa6de/packages/web/src/spaces/timeline/web-animation-host.ts#L105).

## A seek request is not a ready frame

The preview runs the animation inside an iframe. Sending a new time to the iframe and immediately resuming the rest of the timeline would leave a gap between the requested state and the frame the page is preparing.

The page-side bridge calls `renderSeek(time)`, waits for `document.fonts.ready` and two animation frames, and then acknowledges the latest request. This is the readiness signal used by the preview, rather than an assertion that the browser has exposed a pixel-perfect paint-completion event.

Sessions and sequence numbers matter here. If the playhead moves again before an earlier request finishes, an old response must not make the new request appear complete. The page suppresses superseded replies; the host checks the session and sequence of replies it receives.

The bridge is small enough to read in [web-animation-bridge.ts](https://github.com/orime-org/breatic/blob/f350d3eb165f6505bd9a97b484109363028aa6de/packages/shared/src/timeline/web-animation-bridge.ts).

## Sharing a clock with video

The timeline drives visible video layers and web-animation copies from a shared clock. When a layer needs positioning or is not ready, the preview can hold at its current frame instead of letting the other layers run ahead.

The latest Timeline changes add layered preview playback and controls to move, resize, and rotate video and web-animation layers. Combined with the existing trimming support, this lets the same animation appear in several independently edited clips alongside video.

Those layer controls are described in [PR #1503](https://github.com/orime-org/breatic/pull/1503). The trimming support predates that change.

## What is available in this snapshot

This article describes the implementation at commit [`f350d3eb`](https://github.com/orime-org/breatic/commit/f350d3eb165f6505bd9a97b484109363028aa6de), merged on November 13, 2026. At the time of writing, these changes were in the main branch and had not shipped in a new release.

The scope here is editing and preview. Video export remains future work.

The interactive diagram below illustrates the time mapping from the example. It is an explanation of the mapping, not a recording of the product.
