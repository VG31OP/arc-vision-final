---
id: index
title: Introduction to ARC VISION
slug: /
---

# ARC VISION — Intelligent Surveillance Platform

> **“See More. Know Faster. Act Smarter.”**

ARC VISION is an enterprise-grade intelligent surveillance and local NVR platform designed for security operations, automated incident intelligence, evidence management, and real-time perimeter protection. Powered by hardware-accelerated computer vision and an asynchronous multiprocessing architecture, ARC VISION analyzes video feeds locally with maximum throughput and minimal resource overhead.

---

## Core Capabilities

- **Live Surveillance Command Center**: Multi-camera synchronized grid layouts, low-latency MSE/WebRTC streaming, and integrated PTZ controls.
- **AI-Powered Incident Intelligence**: Real-time object detection and tracking (persons, vehicles, packages, animals) with automated incident scoring.
- **Security Zones & Spatial Rules**: Interactive perimeter drawing for security zones, motion masks, speed estimation, and loitering alerts.
- **Evidence Management**: Continuous and incident-triggered evidence recording, high-resolution snapshots, and multi-camera export capabilities.
- **Advanced Enrichments**: Built-in face recognition, license plate recognition (LPR), semantic video search, and AI-generated incident descriptions.
- **Alert Operations**: Live change feeds, severity triage, push notifications, and customizable alert policies.
- **Analytics & System Health**: Real-time telemetry monitoring process CPU/GPU usage, detector latency, stream FPS, and storage capacity.
- **Seamless Integrations**: Out-of-the-box integration with Home Assistant, MQTT brokers, HomeKit, and REST / WebSocket APIs.

---

## Architecture Highlights

1. **Intelligent Frame Sampling**: Motion detection filters static regions, focusing expensive neural network inference only on areas of interest.
2. **Dedicated Multiprocessing**: Ingestion, motion analysis, detector inference, and recording pipelines run in isolated processes for maximum stability and FPS.
3. **Local Privacy-First Processing**: All video streams, inference models, and evidence recordings remain on your local hardware.

---

## Interface Previews

### Live Surveillance

![Live Surveillance](/img/live-view.png)

### Incident Review

![Incident Review](/img/review-items.png)

### Evidence Management

![Evidence Management](/img/media_browser-min.png)

### Real-Time Alerts

![Alert Notifications](/img/notification-min.png)
