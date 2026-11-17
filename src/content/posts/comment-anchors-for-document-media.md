---
title: Where should a comment on an image live?
description: Anchor a discussion to a media block so the thread follows a move, stays off a copy, and reappears on undo.
date: 2026-11-17
category: Engineering
author: Breatic team
---

Two people are editing a document. One comments on a picture. The other moves it to another section, then makes a copy. Which picture should still show the comment?

In Breatic, the thread follows the original picture to its new location. The copy gets its own block identity. If someone deletes the original and then undoes that deletion, the thread appears again.

The same rule applies to videos and audio. It starts with a choice about the object a comment belongs to.

## Store the identity of the media block

A text comment can point to a marked span of text. A comment on a picture, a video or an audio clip covers the whole item. The thread stores the block ID in a metadata field called `mediaBlockId`. The media block needs no text mark, and the thread can still be located when the block moves to a different position in the document. [Media anchor implementation](https://github.com/orime-org/breatic/blob/v0.0.32/packages/web/src/spaces/document/document-comment-media.ts)

When the editor reads comments, it looks up the current position of each referenced media block. It combines those positions with the positions of the text comments. The comment panel and the indicators next to media can use the same list, even though the two types of anchor are stored differently. The result also lets a card quote a thumbnail for a picture and show a name and media icon for video or audio. [Comment entries](https://github.com/orime-org/breatic/blob/v0.0.32/packages/web/src/spaces/document/document-comment-entries.ts)

## Preserve the anchor on a move

Moving the block preserves its ID, so the same thread appears at its new location. Copying the block creates a new identity. This matters in a collaborative editor, where copying happens through a clipboard, a drag with the copy modifier, or duplicating a table that contains the media. The same picture can appear in both places while the review belongs to just one of them.

Deletion has a different consequence. When the block is absent, the editor has no position for the thread and removes its cards from the document view. Undo restores the block and its identity, so the editor can find the thread again. [Media copy and move tests](https://github.com/orime-org/breatic/blob/v0.0.32/packages/web/src/spaces/document/__tests__/document-comment-media-copies.test.ts) · [Media anchor tests](https://github.com/orime-org/breatic/blob/v0.0.32/packages/web/src/spaces/document/__tests__/document-comment-media.test.ts)

## Use the media itself when asking the Agent

The same toolbar can send the uploaded file to the Agent. A picture becomes an image attachment, while a video or audio clip keeps its own media type. That gives the Agent the file reference a user would get by attaching it manually. While the upload is pending, the editor waits to make commenting and attaching available. [Document media end-to-end tests](https://github.com/orime-org/breatic/blob/v0.0.32/packages/web/tests/smoke/document-media.spec.ts)

An easy way to try the distinction is to comment on an image, move it to another section, then copy it. You can leave a fresh comment on the second image and see the two conversations stay with their respective blocks.
