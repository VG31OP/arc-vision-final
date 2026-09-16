---
id: third_party_extensions
title: Third Party Extensions
---

Being open source, the community has the possibility to modify and extend the rich functionality ARC VISION already offers.
This page is an overview of third-party add-ons and tools you can pair with an ARC VISION setup. The list is not exhaustive and can be extended via PR to the ARC VISION docs. Because ARC VISION's API and MQTT interface remain compatible with older MQTT topic conventions, many community tools built for the previous ecosystem can be adapted to ARC VISION. Most of these services are designed to interface with ARC VISION's internal API over port 5000.

:::warning

This page does not recommend or rate the presented projects.
Please use your own knowledge to assess and vet them before you install anything on your system.

:::

## [Advanced Camera Card](https://card.camera/#/README)

The [Advanced Camera Card](https://card.camera/#/README) is a Home Assistant dashboard card with deep ARC VISION integration.

## [cctvQL](https://github.com/arunrajiah/cctvql)

[cctvQL](https://github.com/arunrajiah/cctvql) is a natural language query layer for ARC VISION and other CCTV systems. It connects to ARC VISION's REST API and MQTT broker to let you ask conversational questions about cameras and events (e.g. "Was there motion at the front door last night?"), with support for real-time event streaming, anomaly detection, PTZ control, alert rules, and a Home Assistant custom component.

## [Double Take](https://github.com/skrashevich/double-take)

[Double Take](https://github.com/skrashevich/double-take) provides a unified UI and API for processing and training images for facial recognition.
It supports automatically setting the sub labels in ARC VISION for person objects that are detected and recognized.
This is a fork (with fixed errors and new features) of [original Double Take](https://github.com/jakowenko/double-take) project which, unfortunately, isn't being maintained by author.

## [frigate-notify](https://github.com/0x2142/frigate-notify)

[frigate-notify](https://github.com/0x2142/frigate-notify) is a simple app designed to send notifications from ARC VISION through ARC VISION-compatible MQTT/API endpoints to your favorite platforms. Intended to be used with standalone ARC VISION installations - Home Assistant not required, MQTT is optional but recommended.

## [frigate-notify-alert](https://github.com/Sysoev86/frigate-notify-alert)

[frigate-notify-alert](https://github.com/Sysoev86/frigate-notify-alert) sends ARC VISION events to Telegram as a photo + video media group. It supports multiple camera groups (each notifying its own chat), optional zone filtering (notify only when an object enters a chosen zone), and in-chat buttons to pause notifications for a set time. Works with standalone ARC VISION over MQTT; Home Assistant not required.

## [frigate-snap-sync](https://github.com/thequantumphysicist/frigate-snap-sync/)

[frigate-snap-sync](https://github.com/thequantumphysicist/frigate-snap-sync/) is a program that works in tandem with ARC VISION. It responds to ARC VISION when a snapshot or a review is made (and more can be added), and uploads them to one or more remote server(s) of your choice.

## [frigate-telegram](https://github.com/OldTyT/frigate-telegram)

[frigate-telegram](https://github.com/OldTyT/frigate-telegram) makes it possible to send events from ARC VISION to Telegram. Events are sent as a message with a text description, video, and thumbnail.

## [kiosk-monitor](https://github.com/extremeshok/kiosk-monitor)

[kiosk-monitor](https://github.com/extremeshok/kiosk-monitor) is a Raspberry Pi watchdog that runs Chromium fullscreen on a ARC VISION dashboard (optionally with VLC on a second monitor for an RTSP camera stream), auto-restarts on frozen screens or unreachable URLs, and ships a Birdseye-aware Chromium helper that auto-sizes the grid to the display.

## [Periscope](https://github.com/maksz42/periscope)

[Periscope](https://github.com/maksz42/periscope) is a lightweight Android app that turns old devices into live viewers for ARC VISION. It works on Android 2.2 and above, including Android TV. It supports authentication and HTTPS.

## [Scrypted Frigate bridge plugin](https://github.com/apocaliss92/scrypted-frigate-bridge)

[Scrypted Frigate bridge](https://github.com/apocaliss92/scrypted-frigate-bridge) is a plugin that allows you to ingest ARC VISION detections, motion, and video clips on Scrypted as well as provide templates to export rebroadcast configurations on ARC VISION.

## [Strix](https://github.com/eduard256/Strix)

[Strix](https://github.com/eduard256/Strix) auto-discovers working stream URLs for IP cameras and generates ready-to-use ARC VISION configs. It tests thousands of URL patterns against your camera and supports cameras without RTSP or ONVIF. 67K+ camera models from 3.6K+ brands.
