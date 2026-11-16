---
title: Moving document blocks without losing a collaborator's edits
description: Why one drag in a collaborative editor becomes two document updates and still takes one undo.
date: 2026-11-16
category: Engineering
author: Breatic team
---

Start with three columns in a document. You drag the last block in the right column to the far left. While you drag, someone is typing in the middle column. Their words should survive, even though the column has changed position on the screen.

The difficulty is making the replicated edit say what the gesture actually did. If the editor replaces the whole group with a newly arranged copy, the columns you never touched can end up represented by different shared elements. A concurrent text edit addressed to one of the original elements may no longer be attached to the column you see.

## Put the block down before taking it away

Breatic's document editor uses ProseMirror with Yjs. In the binding used here, there is no single move operation for these nodes. When a sibling list changes, the binding can match unchanged nodes from its ends and update the remaining middle by position. Combining a deletion at one end with an insertion at the other can make the middle look as if it needs to be rewritten.

For a [side drop](https://github.com/orime-org/breatic/blob/7419210213cd50a5d4259ddb9b9a630c3180bfde/packages/web/src/spaces/document/document-column-drop.ts), the editor dispatches two transactions:

1. Insert a copy of the dragged block at the destination, or wrap the destination block where it already stands if the drop creates a new group.
2. Find and remove the original block, taking its empty column with it when necessary.

Each change has a smaller effect on the sibling list. The binding keeps the untouched columns and their contents on their existing Yjs elements, so incoming edits still have somewhere to land.

The order also matters for document structure. A group that only has one column is simplified back into ordinary blocks. Remove the original first, and a two-column group can briefly become a one-column group that a peer simplifies before the insertion arrives. Putting the block down first avoids that intermediate state for a move inside the group.

## Let one gesture have one undo

Between the two updates a peer can briefly see both copies of a block. They carry the same block IDs during that interval. Breatic [patches BlockNote's ID extension](https://github.com/orime-org/breatic/blob/7419210213cd50a5d4259ddb9b9a630c3180bfde/patches/@blocknote__core@0.56.0.patch) so it leaves IDs alone when applying a remote change. Otherwise a peer can rename a transient copy as if the user had inserted a second block.

Locally, Yjs groups the two transactions into one undo step. The person dragging a block sees one move and can undo it once, even though peers can receive two updates.

## Test an edit between the two updates

The [collaboration tests](https://github.com/orime-org/breatic/blob/7419210213cd50a5d4259ddb9b9a630c3180bfde/packages/web/src/spaces/document/__tests__/document-column-collab.test.ts) open two editors and exchange their Yjs updates. One case lets the second editor type after receiving the insertion but before receiving the removal. Others check that text in untouched columns survives a move and that one undo restores the previous layout.

This describes the side-drop path in [PR #1531](https://github.com/orime-org/breatic/pull/1531). The test case is a reminder that checking the final layout in one editor can miss the intermediate document a collaborator actually receives.
