---
title: Keeping video layers in place across aspect ratios
description: Store layer offsets relative to the frame, then use one preview scale for the picture and its editing handles.
date: 2026-11-14T00:00:00+08:00
category: Engineering
author: Breatic team
discussion: 1519
---

Put a small video layer near the top-right corner of a landscape composition. Now change the composition to portrait. If its position is stored as a fixed pixel offset from the centre, the same numbers describe a different place in the new frame.

Breatic's latest Timeline change adds seven frame-ratio presets. The accompanying change is in the layer data: horizontal and vertical offsets are stored as fractions of the frame dimensions. Choosing another ratio changes the frame settings while preserving those relative offsets, the layer's scale values, and its rotation.

## Separate a layer position from its pixel coordinates

A layer starts with its source contained and centred in the frame. Its transform then offsets that centre, applies scale, and rotates it. The stored `frameX` and `frameY` describe the offset from the frame centre:

```text
horizontal offset in frame pixels = frameX × frame width
vertical offset in frame pixels   = frameY × frame height
```

For example, `frameX = 0.25` and `frameY = -0.25` place the layer's centre a quarter-frame to the right and a quarter-frame upward. In a 1920×1080 frame, that is an offset of `(480, -270)`. In a 1080×1920 frame, it becomes `(270, -480)`.

The stored fractions stay the same. The layer's centre remains at 75% of the frame width and 25% of its height, measured from the top-left corner. The conversion is implemented in [layer-geometry.ts](https://github.com/orime-org/breatic/blob/ac6e2a27bf708c208beac394297a71bdd3c58d28/packages/shared/src/timeline/layer-geometry.ts).

This preserves relative placement rather than solving the composition for the user. The contained source box is recalculated for the new frame, so unchanged scale values do not imply unchanged pixel dimensions. A large or deliberately offset layer can still extend beyond the frame; the change does not analyse subjects or automatically choose a new crop.

## Change the frame as one edit

The ratio menu sits at the right end of the Timeline play bar. Its [presets](https://github.com/orime-org/breatic/blob/ac6e2a27bf708c208beac394297a71bdd3c58d28/packages/shared/src/timeline/frame-presets.ts) all have a short side of 1080 pixels:

| Ratio | Frame size |
| --- | --- |
| 16:9 | 1920×1080 |
| 9:16 | 1080×1920 |
| 1:1 | 1080×1080 |
| 4:3 | 1440×1080 |
| 4:5 | 1080×1350 |
| 2:3 | 1080×1620 |
| 21:9 | 2520×1080 |

The `set_frame` command updates width and height in the shared document settings. It leaves the clip transforms alone. The change is one undo step, and collaborators receive the new frame through the same document. A Viewer sees the selected ratio but cannot change it.

There is also a small connection to animation creation: when opening the web-animation dialog, the default is the offered aspect ratio closest to the Timeline frame.

## Keep preview pixels out of the stored edit

A 1080-pixel frame is usually displayed at a smaller size inside the editor. That introduces another scale, separate from the layer's own transform.

The [preview-fit function](https://github.com/orime-org/breatic/blob/ac6e2a27bf708c208beac394297a71bdd3c58d28/packages/web/src/spaces/timeline/timeline-preview-fit.ts) fits the whole frame into the available preview area. It calculates the smaller of the available-width and available-height scale factors, after allowing for the frame border.

The picture and its editing handles use that same factor. Resizing the editor therefore changes the display scale without writing new positions into the document. Changing the frame ratio changes the composition settings, while moving a layer changes its relative transform. Keeping these operations distinct lets the handles stay aligned with the displayed layer.

## Convert existing documents using their existing frame

Earlier Timeline documents stored offsets in pixels. Reading an old offset as a fraction would move the layer dramatically: an offset of 100 pixels is not an offset of 100 frame widths.

The conversion divides the old horizontal offset by the existing frame width and the vertical offset by the existing frame height. The resulting fractions reproduce the placement already shown for that frame. The document is then marked as schema version 2.

The shared reader accepts both versions. The collaboration service also [stores the conversion when loading a document](https://github.com/orime-org/breatic/blob/ac6e2a27bf708c208beac394297a71bdd3c58d28/packages/collab/src/services/legacy-timeline-transform-conversion.ts), using a document lock and merging the stored update before converting. The edit path converts any remaining pixel records before an ordinary write. A delete while a Space is at its size limit is kept as a pure delete so it can free space.

Older web builds refuse version 2 documents. That makes the collaboration-service and web rollout a coordinated deployment, rather than a menu change that can be shipped to either side independently.

## The implementation snapshot

The [browser smoke case](https://github.com/orime-org/breatic/blob/ac6e2a27bf708c208beac394297a71bdd3c58d28/packages/web/tests/smoke/timeline-frame-ratio.spec.ts) places a small layer near a corner, switches from 16:9 to 9:16, checks the relative centre, undoes the change, and checks that a Viewer follows with the control disabled.

This article describes the merged implementation in [PR 1514](https://github.com/orime-org/breatic/pull/1514), at source revision [`ac6e2a27`](https://github.com/orime-org/breatic/commit/ac6e2a27bf708c208beac394297a71bdd3c58d28). It is an editing and preview feature; it does not add video export. The change is included in the planned v0.0.31 release, with production deployment tracked separately.
