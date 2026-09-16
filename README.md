# ARC VISION — Intelligent Surveillance Platform

<div align="center">

<img src="web/public/favicon.svg" alt="ARC VISION Logo" width="96" height="96" />

### **“See More. Know Faster. Act Smarter.”**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Python](https://img.shields.io/badge/Backend-Python%20%2B%20FastAPI-3776AB.svg?logo=python&logoColor=white)](https://fastapi.tiangolo.com/)
[![WebRTC](https://img.shields.io/badge/Streaming-WebRTC%20%2B%20MSE-FF6F00.svg?logo=webrtc&logoColor=white)](https://webrtc.org/)

**ARC VISION** is an enterprise-grade intelligent surveillance and real-time Network Video Recording (NVR) platform engineered for security command centers, incident response, evidence preservation, and proactive threat detection.

[Quick Start](#-quick-start) • [Architecture](#-architecture) • [Features](#-core-capabilities) • [Configuration](#-configuration) • [Integrations](#-integrations) • [Development](#-development--testing)

</div>

---

## 🌟 Overview

ARC VISION combines a high-performance modern command center UI with hardware-accelerated computer vision, sub-second live video streaming, and automated incident triage. It runs entirely on local infrastructure with zero required cloud dependencies, ensuring complete data sovereignty, minimal latency, and maximum privacy.

### Key Highlights

- **Ultra-Low Latency Video Engine**: Sub-second live streaming via WebRTC, MSE (Media Source Extensions), and HLS backed by go2rtc.
- **Hardware-Accelerated AI Inference**: Native acceleration support for Google Coral EdgeTPU, Nvidia GPUs (TensorRT/CUDA), Intel GPUs (OpenVINO), AMD (VAAPI), Apple Silicon, Rockchip RKNN, and Hailo-8L.
- **Automated Incident Intelligence**: Real-time multi-class object detection, bounding-box tracking, threat scoring, and trajectory analysis.
- **Interactive Security Zones**: Dynamic in-browser polygon editor for perimeter breach detection, loitering alerts, and speed estimation.
- **Evidence Lifecycle Management**: Continuous and incident-triggered recording, synchronized multi-camera playback, high-res snapshots, and evidence exports.
- **AI Enrichments**: Face recognition, license plate recognition (LPR), natural-language semantic video search, and AI incident summaries.
- **Multi-Lingual Experience**: Built-in native support for English, Hindi (हिन्दी), and Gujarati (ગુજરાતી).

---

## 🏗️ Architecture

```text
                                  ┌───────────────────────────┐
                                  │   IP Cameras / MediaMTX   │
                                  └─────────────┬─────────────┘
                                                │ RTSP / WebRTC
                                                ▼
                                  ┌───────────────────────────┐
                                  │  go2rtc / FFmpeg Capture  │
                                  └─────────────┬─────────────┘
                                                │ Frame Buffers (SHM)
                                                ▼
┌──────────────────────────┐      ┌───────────────────────────┐      ┌──────────────────────────┐
│ Object & Audio Detectors │ ◄──► │  ARC VISION Vision Engine │ ◄──► │  Enrichments (LPR/Face)  │
│ (Coral, TensorRT, OpenVINO)     └─────────────┬─────────────┘      │   (Semantic Search, AI)  │
└──────────────────────────┘                    │                    └──────────────────────────┘
                                                │ ZMQ / Async Event Bus
                                                ▼
                                  ┌───────────────────────────┐
                                  │ FastAPI Backend & DB      │
                                  │ (SQLite, Authentication)  │
                                  └─────────────┬─────────────┘
                                                │ REST / WebSockets / MQTT
                                                ▼
                                  ┌───────────────────────────┐
                                  │ ARC VISION Command Center │
                                  │ (React 18, Vite, Tailwind)│
                                  └───────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Prerequisites

- **Docker & Docker Compose** installed on your host system (Linux, macOS, or Windows WSL2).
- **RTSP IP Cameras** (or simulated video streams).
- **Hardware Accelerator** *(optional, but recommended for high camera density)*: Coral TPU, Nvidia GPU, or Intel iGPU.

### 2. Deployment with Docker Compose (Recommended)

The repository includes a ready-to-use [`docker-compose.yml`](docker-compose.yml):

```yaml
version: "3.9"

services:
  arc-vision:
    container_name: arc-vision
    image: ghcr.io/arc-vision/arc-vision:stable
    restart: unless-stopped
    privileged: true

    # Shared Memory Size (increase to 256mb or 512mb for 4K / 6+ cameras)
    shm_size: "128mb"

    volumes:
      - /etc/localtime:/etc/localtime:ro
      - ./config:/config
      - ./storage:/media/frigate
      # Optional: In-memory tmpfs cache reduces SSD wear (1GB)
      - type: tmpfs
        target: /tmp/cache
        tmpfs:
          size: 1000000000

    ports:
      - "8971:8971"       # Authenticated Web UI & REST/WS API (HTTPS/TLS)
      - "5000:5000"       # Unauthenticated Web UI / Internal API (Optional)
      - "8554:8554"       # RTSP Live Restream (go2rtc)
      - "8555:8555/tcp"   # WebRTC Streaming (TCP)
      - "8555:8555/udp"   # WebRTC Streaming (UDP)

    environment:
      FRIGATE_RTSP_PASSWORD: "your_secure_camera_password"
      TZ: "UTC"

    # Hardware Acceleration (uncomment the option matching your hardware):
    # Option A — Intel / AMD QuickSync iGPU:
    # devices:
    #   - /dev/dri/renderD128:/dev/dri/renderD128
    #   - /dev/dri:/dev/dri

    # Option B — Google Coral EdgeTPU (USB):
    # devices:
    #   - /dev/bus/usb:/dev/bus/usb

    # Option C — Google Coral EdgeTPU (PCIe / M.2):
    # devices:
    #   - /dev/apex_0:/dev/apex_0

    # Option D — Nvidia GPU (CUDA / TensorRT):
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: 1
    #           capabilities: [gpu]

  # Optional Local MQTT Broker (uncomment if you do not have an external broker):
  # mqtt:
  #   container_name: arc-vision-mqtt
  #   image: eclipse-mosquitto:2.0
  #   restart: unless-stopped
  #   command: mosquitto -c /mosquitto-no-auth.conf
  #   ports:
  #     - "1883:1883"
  #   volumes:
  #     - ./mosquitto/data:/mosquitto/data
  #     - ./mosquitto/log:/mosquitto/log
```

### 3. Directory Setup

Before running ARC VISION, ensure the directory structure exists:

```bash
mkdir -p config storage
```

Place your initial `config.yml` inside the `config/` directory (see [Configuration](#-configuration) below).

### 4. Start Commands

#### Run in Background

```bash
docker compose up -d
```

#### View Real-Time Logs

```bash
docker compose logs -f
```

#### Restart or Stop

```bash
# Restart ARC VISION
docker compose restart

# Gracefully stop
docker compose down
```

#### Alternative: Start with Docker CLI

```bash
docker run -d \
  --name arc-vision \
  --privileged \
  --restart unless-stopped \
  --shm-size=128m \
  -v ./config:/config \
  -v ./storage:/media/frigate \
  -p 8971:8971 \
  -p 5000:5000 \
  -p 8554:8554 \
  -p 8555:8555/tcp \
  -p 8555:8555/udp \
  -e FRIGATE_RTSP_PASSWORD="your_secure_camera_password" \
  ghcr.io/arc-vision/arc-vision:stable
```

### 5. Access the Command Center

Open your browser and navigate to:
```text
https://<your-server-ip>:8971   (or http://localhost:8971)
```

Follow the on-screen initial setup wizard to configure your administrator credentials and connect your first cameras.

---

## ⚙️ In-Browser Configuration & Feature Management

ARC VISION is designed for **100% in-browser management**. You do **not** need to manually edit YAML files on disk to enable features or add cameras.

### 1. Initial Launch
Start the platform using Docker Compose. ARC VISION boots with a default starter configuration and launches the initial web onboarding wizard at:
```text
https://<your-server-ip>:8971   (or http://localhost:8971)
```

### 2. Enabling Features Directly in the Web UI
From the left navigation menu, open **Settings (`/settings`)** to toggle and configure all features visually:

| Feature / Module | In-Browser Settings Path | Configuration Capabilities |
| :--- | :--- | :--- |
| 🧑 **Face Recognition** | *Settings → Enrichments → Face Recognition* | Enable face matching, create face libraries, and manage recognized individuals in `/faces`. |
| 🔍 **Semantic Search** | *Settings → Enrichments → Semantic Search* | Enable natural-language video search with model size selection (`small`, `base`, `large`). |
| 🚗 **License Plate Recognition (LPR)** | *Settings → Enrichments → LPR* | Enable automated vehicle plate detection and log recognition events. |
| 🛡️ **Security Zones & Masks** | *Settings → Cameras → [Camera Name] → Zones/Masks* | Draw interactive polygon zones, intrusion detection boundaries, and privacy masks directly on the live camera canvas. |
| 🎥 **Camera Management** | *Settings → Cameras* | Add new IP cameras, test RTSP streams, configure detection resolution, and set frame rates. |
| 💾 **Evidence & Recordings** | *Settings → Cameras → [Camera Name] → Record* | Toggle continuous recording, motion-triggered recording, and customize retention days. |
| 📸 **Incident Snapshots** | *Settings → Cameras → [Camera Name] → Snapshots* | Configure high-resolution snapshot generation and retention rules. |
| 🔊 **Audio Event Detection** | *Settings → Audio* | Enable real-time detection for screams, glass breaking, barking, and speech. |
| 🦅 **Birdseye Composite Stream** | *Settings → UI & Display → Birdseye* | Enable auto-switching multi-camera overview stream. |
| 📝 **Built-in Config Editor** | *Settings → Configuration Editor* | Monaco-based in-browser YAML editor with real-time validation, syntax highlighting, and one-click **Save & Restart**. |

---

### Starter Configuration (`config/config.yml`)

The platform uses this minimal starter configuration to initialize the runtime and detectors so you can immediately begin configuring streams and enrichments in the browser:

```yaml
version: 0.18-0

mqtt:
  enabled: false # Can be enabled under Settings -> MQTT

detectors:
  ov:
    type: openvino
    device: CPU

cameras:
  front_entrance:
    enabled: true
    ffmpeg:
      inputs:
        - path: rtsp://127.0.0.1:8554/front_entrance # Replace with your camera RTSP URL or add via Settings UI
          roles:
            - detect
            - record
    detect:
      enabled: true
      width: 1280
      height: 720
      fps: 5
    live:
      streams:
        Main: front_entrance
```

---

## 🎯 Core Capabilities

| Capability | Description |
| :--- | :--- |
| **Command Center Dashboard** | Unified high-level overview featuring active alerts, live camera feeds, system health KPIs, and real-time operational feeds. |
| **Live Surveillance** | High-density multi-camera live grid with sub-second latency, two-way talk, digital PTZ, and full-screen matrix mode. |
| **Incident Review & Timeline** | Correlated incident stream grouping multi-camera activity into structured, actionable security events. |
| **Evidence & Export** | Seamless video scrubbing, synchronous multi-angle playback, clip trimming, and one-click evidence export. |
| **Security Zones** | Visual in-app polygon boundary editor for loitering detection, perimeter defense, and intrusion alerts. |
| **Face Library & Recognition** | Ingest, categorize, and identify authorized personnel or unknown individuals with face detection matching. |
| **License Plate Recognition (LPR)**| High-accuracy automated vehicle license plate extraction, search, and logging. |
| **Semantic Video Search** | Natural-language search across historical footage (e.g., *"person carrying a black bag near the entrance"*). |
| **System Health & Analytics** | Deep diagnostic dashboard tracking CPU, GPU, detector latency, memory pools, and camera network integrity. |

---

## 🏷️ Terminology Guide

| Previous Term | ARC VISION Term | Description |
| :--- | :--- | :--- |
| **Live View** | **Live Surveillance** | Sub-second video monitoring with multi-grid dashboards and PTZ |
| **Events** | **Incidents** | Classified and tracked security occurrences with confidence scoring |
| **Review** | **Incident Review** | Correlated multi-camera incident feeds with preview cards |
| **Recordings** | **Evidence** | Retained continuous or motion-triggered video archives |
| **Clips & Snapshots** | **Incident Snapshots & Clips** | Clean and annotated evidence artifacts with metadata |
| **Zones & Masks** | **Security Zones** | User-defined polygons for entering/exiting alerts and loitering tracking |
| **System / Stats** | **Analytics & System Health** | Live metrics for FPS, inference speeds, CPU/GPU, and storage health |

---

## 🔌 Integrations

- **Home Assistant**: Full two-way integration with auto-discovered cameras, incident sensors, notification blueprints, and switches.
- **MQTT Broker**: Real-time incident broadcasts, detector telemetry, camera status, and external automation triggers.
- **HomeKit**: Direct live camera feed and two-way talk streaming via go2rtc.
- **REST & WebSocket API**: Comprehensive API endpoints for security automation, custom dashboards, and third-party tools.

---

## 💻 Development & Testing

### Running the Frontend (React + Vite)

```bash
# Navigate to web directory
cd web

# Install dependencies
npm install

# Start local dev server (default port 5173)
npm run dev

# Run TypeScript typecheck & production build
npm run build

# Run linting
npm run lint
```

### Running Backend Tests

```bash
# Run unit tests
python3 -u -m unittest

# Code formatting & linting
ruff format frigate/
ruff check frigate/
```

---

## 🛡️ Security & Privacy

- **100% Local Processing**: All video ingestion, storage, and AI inference execute strictly on your infrastructure.
- **Zero Required Cloud Dependencies**: Does not rely on external cloud APIs or third-party servers.
- **Role-Based Access**: Granular user roles (Administrator vs. Viewer) and password protections.

---

## 📄 Open Source Attribution & Licensing

ARC VISION is built upon and acknowledges foundational open-source technologies including OpenCV, TensorFlow/ONNX, FastAPI, go2rtc, and React.

- **License**: Distributed under the [MIT License](LICENSE).
- **Notices & Credits**: Detailed third-party credits and licenses are maintained in [ARC_VISION_OPEN_SOURCE_NOTICES.md](ARC_VISION_OPEN_SOURCE_NOTICES.md).
