# ARC VISION — Platform Architecture & Intelligence Model

## System Overview
**ARC VISION** is an Intelligent Surveillance Platform designed to provide real-time security operations center (SOC) capabilities, automated object detection, security zone monitoring, explainable incident prioritization, evidence investigation, and operational diagnostics.

The platform combines high-performance C/Python video ingestion and real-time AI object detection with a modern React/TypeScript Web Operations Console.

```
+-------------------------------------------------------------------------+
|                        ARC VISION ARCHITECTURE                          |
+-------------------------------------------------------------------------+
|                                                                         |
|  IP Cameras / RTSP Feeds                                                |
|       |                                                                 |
|       v                                                                 |
|  [ Ingestion Pipeline ] ---> MediaMTX / go2rtc / FFmpeg Stream Router   |
|       |                                                                 |
|       v                                                                 |
|  [ Intelligence Engine ] --> TPU / GPU Object Detector & Tracker        |
|       |                                                                 |
|       v                                                                 |
|  [ Event Classifier ] -----> Security Zone Rules & Correlation Engine    |
|       |                                                                 |
|       v                                                                 |
|  [ Persistence Layer ] ----> SQLite DB & MP4 Recording / Snapshot Vault |
|       |                                                                 |
|       v                                                                 |
|  [ Real-Time Bus ] --------> FastAPI REST & WebSocket Telemetry Feed    |
|       |                                                                 |
|       v                                                                 |
|  [ Operator Console ] -----> ARC VISION React/TS Security Dashboard     |
|                               (Command Center, Live, Alerts, Review)    |
+-------------------------------------------------------------------------+
```

---

## Key Subsystems

### 1. RTSP Stream Ingestion & Router
- **RTSP Ingestion**: High-efficiency stream ingestion powered by `go2rtc` and `FFmpeg`.
- **Low-Latency Streaming**: Delivers WebRTC, MSE (Media Source Extensions), and JSMpeg low-latency streams directly to the frontend Live Surveillance workspace without secondary decoding pipelines.

### 2. Detection & Intelligence Layer
- **Object Detection**: Accelerates object detection via Google Coral TPU, NVIDIA TensorRT, OpenVINO, or CPU backends.
- **Object Tracking**: Tracks detected targets across consecutive frames, preserving object IDs, bounding box coordinates, and confidence scores.

### 3. Incident Correlation & Priority Engine (`web/src/utils/incidentAdapter.ts`)
- **Segment Correlation**: Automatically clusters consecutive detection segments on a single camera within a sliding 3-minute window into unified **Security Incidents**.
- **Deterministic Risk Rules**: Assigns explainable severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) based on real security zone restrictions, timeframe constraints, and multi-object entry.

### 4. Real-Time Telemetry & Alert Bus (`web/src/api/ws.ts`)
- **WebSocket Broadcast**: Pushes real-time review updates, camera stats, and alert state changes directly to connected web clients.
- **Web Audio Alert Chimes**: Synthesizes dual-tone alert chimes for `CRITICAL` and `HIGH` events using zero-dependency Web Audio API.

### 5. Web Operations Console
- **Command Center (`/`)**: Central SOC dashboard displaying operational status, active threat priority queue, camera status wall, and zone activity.
- **Live Surveillance (`/live`)**: Interactive multi-camera surveillance grid.
- **Incident Review (`/review`)**: 5-Stage investigation workspace with evidence playback and audit trails.
- **Alert Operations (`/alerts`)**: Live WebSocket alert center with single-click Acknowledge/Resolve triggers.
- **System Health Center (`/system`)**: Telemetry metrics, service states, and operator recovery guidance.
