---
title: Start a vehicle speed film from one photo
description: A twelve-second vehicle cut list and two other ways to direct motion with Breatic’s video templates.
date: 2026-11-17
category: Product Updates
author: Breatic team
---

Take a photo of a car you want to feature. The body color, wheels and trim are already there. What the photo lacks is how the car moves, where the camera goes, and when the shot should change.

Breatic's **Motion and speed** templates give you three starting points for directing that movement. For a car or motorbike, start with **Vehicle speed cut list**.

## Build a 12-second cut list

Add a clear photo of the vehicle and tell the Agent what kind of clip you want. Try asking for a track-day promo on a closed circuit with a low side-tracking shot and a finish-line pass. The template uses your photo as a vehicle reference. You can leave the photo's background intact and describe the setting you want in the video. [Vehicle template definition](https://github.com/orime-org/breatic/blob/v0.0.32/packages/shared/src/canvas/templates/vehicle-speed-cutlist.ts)

The template sets up a 12-second landscape clip with audio. Its brief requests a cut every second and asks the model to keep the vehicle's color, model and wheels consistent. A wide shot gives viewers a sense of the track. Closer shots can pick up a tire deforming through a corner or suspension movement on exit. Engine or road sound can carry motion across the cuts.

Those are directions for the generation. Review the output for cut timing and vehicle details, then revise anything the model missed.

## Choose a camera style for the action

**Sports live coverage** uses a wide view to establish a course, a tracking camera to stay with the athlete, a low camera for the moment of contact, and a finish camera. It starts from a photo of the athlete and requests 12 seconds in landscape. [Live coverage template](https://github.com/orime-org/breatic/blob/v0.0.32/packages/shared/src/canvas/templates/sports-live-coverage.ts)

**Extreme sports run** takes a different shot structure. Start with a photo of the person, name the move, and ask for a ten-second vertical take that follows the run-up, takeoff and landing. This is the template to try when you want the whole motion visible in one continuous shot. [Extreme sports template](https://github.com/orime-org/breatic/blob/v0.0.32/packages/shared/src/canvas/templates/extreme-sports-run.ts)

If you're trying the vehicle template for the first time, give it one setting and one camera idea. For example, start with a side-tracking shot on the straight and finish low by the inside curb. That gives you a clear brief to compare with what the model returns. [Try Breatic](https://breatic.ai/)
