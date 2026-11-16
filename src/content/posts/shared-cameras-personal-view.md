---
title: Sharing a 3D camera without sharing everyone's viewport
description: How Breatic separates the view you navigate from the cameras and lights your team edits.
date: 2026-11-16
category: Engineering
author: Breatic team
---

Two people are working in the same 3D scene. One is orbiting a character to inspect its pose. The other is setting up a portrait shot. They need to agree on where the portrait camera and its lights are, but neither needs the other's viewport to move with every drag.

Breatic's 3D director console treats those as different kinds of state. A saved camera belongs to the scene. Your current view, including which camera you choose to look through, belongs to your editor.

## Make a shot a scene object

A camera in the [shared scene document](https://github.com/orime-org/breatic/blob/c1d6841cecc1d3b9eead7106356ba9b5c3612f33/packages/web/src/data/yjs/scene-document.ts) has a position, rotation, focal length, and frame ratio. Lights are scene objects too, with properties such as color and intensity. The ambient light settings belong to the scene as a whole.

Saving your current view as a camera takes something local and makes it part of the shared scene. Another editor can select the same camera and see its framing without following your personal navigation. The director console also shows what the saved cameras see in monitor cards, so you can check a shot without switching your main view to it.

## Separate looking from piloting

Clicking a camera monitor makes your [viewfinder](https://github.com/orime-org/breatic/blob/c1d6841cecc1d3b9eead7106356ba9b5c3612f33/packages/web/src/spaces/three-d/viewfinder/viewfinder-state.ts) look through that camera. This updates the source of your viewfinder. The camera record does not change just because you looked through it.

Piloting is a different action. When you have edit access and the camera is unlocked, moving the camera through the viewfinder changes the saved camera's pose. That change goes to the shared scene. Anyone looking through the same camera can see the new framing; a collaborator orbiting in a free view can keep doing so.

The distinction gives the same drag two well-defined meanings. In a free view, it is navigation. When piloting a saved camera, it is an edit to the shot that teammates can see and that you can undo.

## Test both sides of the boundary

The [director console browser tests](https://github.com/orime-org/breatic/blob/c1d6841cecc1d3b9eead7106356ba9b5c3612f33/packages/web/tests/smoke/three-d-director.spec.ts) save a view as a camera, set a 50 mm lens and a 9:16 frame, and check the viewfinder frame. The test then drags while piloting, checks the stored camera position, and verifies that one undo restores it. A separate test opens the scene from a second account and checks that the saved camera and light are both visible there.

This is the implementation in [PR #1535](https://github.com/orime-org/breatic/pull/1535), which keeps the 3D Space marked as in development. The practical test for the design is simple: when two people want to agree on a shot, they share the camera; when one wants to look somewhere else, they can just move their own view.
