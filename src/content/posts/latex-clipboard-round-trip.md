---
title: Keeping LaTeX editable through copy and paste
description: How Breatic preserves formula source across the clipboard, Markdown, and a collaborative editor.
date: 2026-11-16
category: Engineering
author: Breatic team
draft: false
---

Copy two inline equations from a document and paste them somewhere else. They need to come back as two equations you can still edit. Rendering them correctly in the original paragraph tells you very little about whether that round trip will work.

In Breatic, we found a small example that exercises the whole path:

```text
x $$a$$ $$b$$ y
```

The space between the equations matters. Without it, the closing delimiters of one formula run into the opening delimiters of the next. The clipboard can no longer describe those two formulas as clearly as the editor can.

## Store the source with the document

The editor stores an inline formula or a display formula as a leaf node with a LaTeX `source` attribute. KaTeX renders that source for display. Selecting an inline formula selects the whole node; clicking it opens a field for editing the source. Collaboration and snapshots carry the node and its source, so a restored formula is still editable.

The clipboard leaves the editor's document model behind. For HTML, the exporter can carry the source in a MathML annotation. For plain text, it writes an inline formula with double-dollar delimiters, or puts the delimiters on their own lines for a display formula. In our Markdown reader a single dollar sign stays text, so ordinary prices can appear near formulas.

## Test the clipboard string as well as the render

BlockNote creates the plain-text clipboard payload through its HTML-to-Markdown converter. The converter needs to know where one formula ends and the next begins. Our [patch to that conversion path](https://github.com/orime-org/breatic/blob/068ca2bbd531e2de5072340b94e9c77764418a08/patches/@blocknote__core@0.56.0.patch) keeps neighboring runs of dollar signs apart and writes a space in the clipboard text. The same problem can happen when ordinary text ends with a dollar sign, as in `US$ $$c$$`.

The [clipboard tests](https://github.com/orime-org/breatic/blob/068ca2bbd531e2de5072340b94e9c77764418a08/packages/web/src/spaces/document/__tests__/document-math-copy.test.ts) check both sides: copying puts the separated formulas on the clipboard, and reading that text back gives two formula nodes with sources `a` and `b`. The tests also cover table cells and selections carried by a drag. A screenshot can tell us whether the equations look right, but it can't tell us what the clipboard contains.

## Keep Markdown from rewriting the equation

On paste, the [formula reader](https://github.com/orime-org/breatic/blob/068ca2bbd531e2de5072340b94e9c77764418a08/packages/web/src/spaces/document/document-math-markdown.ts) finds the formulas before passing the rest of the text to BlockNote. It replaces each formula with an indexed placeholder, converts the surrounding Markdown to HTML, and restores the source as an attribute on the placeholder. The editor's parse rules use that attribute to rebuild the formula node.

This keeps the ordinary Markdown converter from interpreting underscores or escapes inside the LaTeX. Display formulas inside lists or quotes need another small detail: the placeholder has to stay inside its surrounding block, with a blank line that ends the raw HTML before the next paragraph.

These are the round trips covered by the implementation in [PR #1538](https://github.com/orime-org/breatic/pull/1538). Other editors may use different delimiters or discard MathML annotations, so the tests check what we send and what Breatic can reconstruct from it.
