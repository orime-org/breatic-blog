---
title: Following a collaborator across editors
description: How Breatic follows a teammate from a canvas to a document using Yjs Awareness, canvas bounds, and block IDs.
date: 2026-11-18
category: Engineering
author: Breatic team
---

Someone is reviewing a project with you. They zoom in on a corner of the canvas, then open the document that explains the change. You can follow them through both. The canvas needs to know which rectangle they can see. The document needs to know which block they are reading.

We added collaborator following in Breatic v0.0.34. Each editor already knows how to navigate its own content, so we gave them a way to exchange the smallest piece of information each needs to reconstruct a view.

## Find the editor first

Each tab announces its current Space in the project's [Yjs Awareness state](https://github.com/orime-org/breatic/blob/794f6417d6e8acbdc7b82034deeeabd6716d4b01/packages/web/src/data/yjs/follow-presence.ts). A member can have the project open in two tabs. When both have a view, a focused tab takes precedence. Between tabs with the same focus status, the newer announcement wins. The follower opens the chosen Space through the project's normal tab strip.

The viewport details travel through that Space's own awareness state. That lets the tab strip deal with Space IDs while each editor interprets its own data. A 3D editor can use a camera position, target, and field of view. A timeline has a visible frame range and a playhead.

## Fit the same canvas area to two screens

A canvas transform uses screen pixels. If you copy the exact pan and zoom from a wide screen to a narrow one, the narrower pane can miss the right edge of what the other person is showing. We [convert the visible bounds to canvas coordinates](https://github.com/orime-org/breatic/blob/794f6417d6e8acbdc7b82034deeeabd6716d4b01/packages/web/src/features/follow/follow-geometry.ts) before publishing them.

The receiving editor centers that rectangle and fits it within its own pane, subject to the canvas zoom limits. For example, a 1,200 by 600 canvas rectangle fits into a 600 by 600 pane at half scale. The follower sees more of the canvas above and below the rectangle. Both people can still see the same objects, even with different pane shapes.

## Follow a block through reflow

In the document editor, even a scroll offset measured relative to the document can drift. A different width changes where paragraphs wrap and how much vertical space they take up. The document publishes the ID of the block at the top of the view. The follower [looks up that ID in its own layout](https://github.com/orime-org/breatic/blob/794f6417d6e8acbdc7b82034deeeabd6716d4b01/packages/web/src/spaces/document/use-document-follow.ts) and scrolls it into place.

A block can arrive after its ID, for example when the leader has just inserted it. The editor keeps the pending ID and tries again when the document renders new content. It also reapplies the alignment when the pane resizes. If the follower scrolls away or chooses another Space, they take control of their own view again.

The [implementation and tests](https://github.com/orime-org/breatic/pull/1548) cover different canvas aspect ratios, document reflow, and switching Spaces while following.
