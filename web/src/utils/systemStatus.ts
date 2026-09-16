import { FrigateConfig } from "@/types/frigateConfig";
import { FrigateStats } from "@/types/stats";

export type OperationalState =
  | "OPERATIONAL"
  | "DEGRADED"
  | "ATTENTION REQUIRED"
  | "OFFLINE"
  | "UNKNOWN";

export type ServiceHealthState =
  | "RUNNING"
  | "DEGRADED"
  | "STOPPED"
  | "UNAVAILABLE"
  | "UNKNOWN";

export interface SystemServiceStatus {
  name: string;
  category: string;
  state: ServiceHealthState;
  details: string;
  uptime?: number;
}

export interface DiagnosticIssue {
  id: string;
  category:
    | "CAMERA CONNECTIVITY"
    | "STREAM HEALTH"
    | "DETECTION"
    | "RECORDING"
    | "STORAGE"
    | "PROCESSING"
    | "NETWORK"
    | "REAL-TIME CONNECTION";
  component: string;
  state: "CRITICAL" | "WARNING" | "INFO";
  problem: string;
  details: string;
  recoveryAction: string;
}

export interface SystemHealthSummary {
  overallState: OperationalState;
  statusMessage: string;
  services: SystemServiceStatus[];
  issues: DiagnosticIssue[];
  metrics: {
    totalCameras: number;
    onlineCameras: number;
    offlineCameras: number;
    cpuUsage: number | null;
    memoryUsage: number | null;
    gpuUsage: number | null;
    detectorFps: number;
    storageUsedPercent: number | null;
  };
}

export function getSystemOperationalStatus(
  stats?: FrigateStats,
  config?: FrigateConfig,
  wsConnected: boolean = true,
): SystemHealthSummary {
  if (!stats && !config) {
    return {
      overallState: "OFFLINE",
      statusMessage: "Core backend service unreachable or initializing",
      services: [],
      issues: [
        {
          id: "backend-unreachable",
          category: "REAL-TIME CONNECTION",
          component: "ARC VISION Core Engine",
          state: "CRITICAL",
          problem: "Backend service is not responding",
          details: "Failed to load runtime telemetry from /api/stats endpoint",
          recoveryAction:
            "Verify backend container or service is running on host.",
        },
      ],
      metrics: {
        totalCameras: 0,
        onlineCameras: 0,
        offlineCameras: 0,
        cpuUsage: null,
        memoryUsage: null,
        gpuUsage: null,
        detectorFps: 0,
        storageUsedPercent: null,
      },
    };
  }

  const issues: DiagnosticIssue[] = [];
  const services: SystemServiceStatus[] = [];

  // 1. Evaluate Camera Connectivity & Health
  const configuredCameras = config?.cameras ? Object.keys(config.cameras) : [];
  let onlineCameras = 0;
  let offlineCameras = 0;
  let totalDetectorFps = 0;

  configuredCameras.forEach((camName) => {
    const camStats = stats?.cameras?.[camName];
    const isOnline =
      camStats && (camStats.camera_fps > 0 || camStats.process_fps > 0);

    if (isOnline) {
      onlineCameras++;
      totalDetectorFps += camStats.detection_fps || 0;
    } else {
      offlineCameras++;
      issues.push({
        id: `camera-offline-${camName}`,
        category: "CAMERA CONNECTIVITY",
        component: `Camera [${camName}]`,
        state: "CRITICAL",
        problem: `Camera stream offline or no FPS detected`,
        details: camStats
          ? `Camera FPS: ${camStats.camera_fps}, Detection FPS: ${camStats.detection_fps}`
          : `No telemetry reported for camera`,
        recoveryAction: `Check camera network link, power supply, or RTSP stream credentials in Settings -> Cameras.`,
      });
    }
  });

  // 2. Evaluate Detector Health
  let detectorRunning = false;
  let totalDetectors = 0;
  if (stats?.detectors) {
    totalDetectors = Object.keys(stats.detectors).length;
    Object.entries(stats.detectors).forEach(([detName, detStats]) => {
      if (detStats.inference_speed && detStats.inference_speed > 0) {
        detectorRunning = true;
      }
      if (detStats.inference_speed && detStats.inference_speed > 150) {
        issues.push({
          id: `detector-slow-${detName}`,
          category: "DETECTION",
          component: `Detector [${detName}]`,
          state: "WARNING",
          problem: `High detector inference latency (${detStats.inference_speed.toFixed(1)} ms)`,
          details: `Detection speed exceeds recommended operating window (<100ms)`,
          recoveryAction: `Verify TPU/GPU hardware acceleration or adjust detection resolution/frame rate.`,
        });
      }
    });
  }

  services.push({
    name: "Object Detection Engine",
    category: "DETECTION",
    state: detectorRunning
      ? "RUNNING"
      : totalDetectors > 0
        ? "DEGRADED"
        : "UNAVAILABLE",
    details: `${totalDetectors} detector(s) active, Total Detection FPS: ${totalDetectorFps.toFixed(1)}`,
  });

  // 3. Evaluate CPU / Memory
  const cpuPercent = stats?.cpu_usages
    ? Object.values(stats.cpu_usages).reduce(
        (acc, curr) => acc + (curr.cpu ? parseFloat(String(curr.cpu)) : 0),
        0,
      )
    : null;

  const memoryPercent = stats?.cpu_usages
    ? Object.values(stats.cpu_usages).reduce(
        (acc, curr) => acc + (curr.mem ? parseFloat(String(curr.mem)) : 0),
        0,
      )
    : null;

  if (cpuPercent && cpuPercent > 90) {
    issues.push({
      id: "high-cpu-usage",
      category: "PROCESSING",
      component: "System CPU",
      state: "WARNING",
      problem: `High host CPU utilization (${cpuPercent.toFixed(1)}%)`,
      details: `CPU usage sustained above 90% threshold`,
      recoveryAction: `Reduce detection frame rates or optimize camera sub-stream resolutions.`,
    });
  }

  // 4. WebSocket Connectivity Status
  if (!wsConnected) {
    issues.push({
      id: "ws-disconnected",
      category: "REAL-TIME CONNECTION",
      component: "WebSocket Telemetry Feed",
      state: "WARNING",
      problem: `Real-time WebSocket disconnected`,
      details: `Live updates paused; using cached SWR fallback data`,
      recoveryAction: `Check browser network connection or proxy WebSocket pass-through headers.`,
    });
  }

  services.push({
    name: "Core Surveillance Engine",
    category: "SYSTEM",
    state: stats ? "RUNNING" : "STOPPED",
    details: stats?.service?.version ? `v${stats.service.version}` : "Active",
    uptime: stats?.service?.uptime || 0,
  });

  services.push({
    name: "Real-Time Telemetry Feed",
    category: "NETWORK",
    state: wsConnected ? "RUNNING" : "DEGRADED",
    details: wsConnected ? "WebSocket Active" : "Polling Fallback Active",
  });

  services.push({
    name: "Camera Pipeline",
    category: "STREAM HEALTH",
    state:
      offlineCameras === 0
        ? "RUNNING"
        : onlineCameras > 0
          ? "DEGRADED"
          : "STOPPED",
    details: `${onlineCameras}/${configuredCameras.length} cameras streaming online`,
  });

  // 5. Determine Overall Operational State
  let overallState: OperationalState = "OPERATIONAL";
  let statusMessage = "All core surveillance services operational";

  if (offlineCameras > 0 && onlineCameras === 0 && configuredCameras.length > 0) {
    overallState = "OFFLINE";
    statusMessage = "All camera streams are offline";
  } else if (issues.some((i) => i.state === "CRITICAL")) {
    overallState = "ATTENTION REQUIRED";
    statusMessage = "Critical system alerts require operator attention";
  } else if (issues.some((i) => i.state === "WARNING") || offlineCameras > 0) {
    overallState = "DEGRADED";
    statusMessage = "Surveillance system running in degraded state";
  }

  return {
    overallState,
    statusMessage,
    services,
    issues,
    metrics: {
      totalCameras: configuredCameras.length,
      onlineCameras,
      offlineCameras,
      cpuUsage: cpuPercent,
      memoryUsage: memoryPercent,
      gpuUsage: null,
      detectorFps: totalDetectorFps,
      storageUsedPercent: null,
    },
  };
}
