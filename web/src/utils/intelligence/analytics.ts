import { FrigateStats } from "@/types/stats";
import { ReviewSegment } from "@/types/review";
import { evaluateIncidentIntelligence } from "./incidentRules";

export interface HourlyTrend {
  hourLabel: string;
  count: number;
  criticalCount: number;
}

export interface CameraAnalyticsItem {
  camera: string;
  count: number;
  percentage: number;
}

export interface ZoneAnalyticsItem {
  zone: string;
  count: number;
  percentage: number;
}

export interface DetectionDistributionItem {
  label: string;
  count: number;
  percentage: number;
}

export interface PeakActivityWindow {
  windowLabel: string;
  count: number;
}

export interface SystemProcessingHealth {
  detectionFps: number;
  processFps: number;
  cameraFps: number;
  skippedFps: number;
  cameraCount: number;
  onlineCameraCount: number;
  avgInferenceMs: number;
  uptimeHours: number;
}

/**
 * Calculates hourly incident distribution across 24 hours from real event timestamps.
 */
export function calculateHourlyTrend(reviewItems: ReviewSegment[]): HourlyTrend[] {
  const hoursMap = new Array(24).fill(0).map((_, i) => ({
    hourLabel: `${i.toString().padStart(2, "0")}:00`,
    count: 0,
    criticalCount: 0,
  }));

  if (!reviewItems || reviewItems.length === 0) return hoursMap;

  for (const item of reviewItems) {
    const date = new Date(item.start_time * 1000);
    const hour = date.getHours();
    if (hour >= 0 && hour < 24) {
      hoursMap[hour].count += 1;
      const intel = evaluateIncidentIntelligence(item);
      if (intel.priority === "CRITICAL" || intel.priority === "HIGH") {
        hoursMap[hour].criticalCount += 1;
      }
    }
  }

  return hoursMap;
}

/**
 * Calculates camera activity breakdown from real events.
 */
export function calculateCameraAnalytics(
  reviewItems: ReviewSegment[],
  configuredCameras: string[] = [],
): CameraAnalyticsItem[] {
  const counts: Record<string, number> = {};
  const total = reviewItems ? reviewItems.length : 0;

  for (const cam of configuredCameras) {
    counts[cam] = 0;
  }

  if (reviewItems) {
    for (const item of reviewItems) {
      counts[item.camera] = (counts[item.camera] || 0) + 1;
    }
  }

  return Object.entries(counts).map(([cam, count]) => ({
    camera: cam,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
  }));
}

/**
 * Calculates zone activity breakdown from real events.
 */
export function calculateZoneAnalytics(reviewItems: ReviewSegment[]): ZoneAnalyticsItem[] {
  const counts: Record<string, number> = {};
  let totalWithZones = 0;

  if (reviewItems) {
    for (const item of reviewItems) {
      const zones = item.data?.zones || [];
      if (zones.length === 0) {
        counts["General Area"] = (counts["General Area"] || 0) + 1;
        totalWithZones += 1;
      } else {
        for (const z of zones) {
          const formatted = z.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          counts[formatted] = (counts[formatted] || 0) + 1;
          totalWithZones += 1;
        }
      }
    }
  }

  return Object.entries(counts)
    .map(([zone, count]) => ({
      zone,
      count,
      percentage: totalWithZones > 0 ? Math.round((count / totalWithZones) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculates detection object category distribution from real events.
 */
export function calculateDetectionDistribution(
  reviewItems: ReviewSegment[],
): DetectionDistributionItem[] {
  const counts: Record<string, number> = {
    Person: 0,
    Vehicle: 0,
    Animal: 0,
    Other: 0,
  };

  let totalObjects = 0;

  if (reviewItems) {
    for (const item of reviewItems) {
      const objects = item.data?.objects || [];
      for (const obj of objects) {
        const lower = obj.toLowerCase();
        totalObjects += 1;
        if (lower === "person") {
          counts.Person += 1;
        } else if (["car", "vehicle", "truck", "bus", "motorcycle"].includes(lower)) {
          counts.Vehicle += 1;
        } else if (["dog", "cat", "animal", "bird"].includes(lower)) {
          counts.Animal += 1;
        } else {
          counts.Other += 1;
        }
      }
    }
  }

  return Object.entries(counts).map(([label, count]) => ({
    label,
    count,
    percentage: totalObjects > 0 ? Math.round((count / totalObjects) * 100) : 0,
  }));
}

/**
 * Identifies 2-hour peak activity period from real event timestamps.
 */
export function calculatePeakActivityWindow(reviewItems: ReviewSegment[]): PeakActivityWindow {
  if (!reviewItems || reviewItems.length === 0) {
    return { windowLabel: "00:00 – 02:00", count: 0 };
  }

  const hourCounts = new Array(24).fill(0);
  for (const item of reviewItems) {
    const hour = new Date(item.start_time * 1000).getHours();
    if (hour >= 0 && hour < 24) hourCounts[hour] += 1;
  }

  let maxWindowStart = 0;
  let maxCount = 0;

  for (let i = 0; i < 24; i++) {
    const windowSum = hourCounts[i] + hourCounts[(i + 1) % 24];
    if (windowSum > maxCount) {
      maxCount = windowSum;
      maxWindowStart = i;
    }
  }

  const startFormatted = `${maxWindowStart.toString().padStart(2, "0")}:00`;
  const endFormatted = `${((maxWindowStart + 2) % 24).toString().padStart(2, "0")}:00`;

  return {
    windowLabel: `${startFormatted} – ${endFormatted}`,
    count: maxCount,
  };
}

/**
 * Extracts system & detector processing health metrics from real FrigateStats.
 */
export function extractSystemProcessingHealth(stats?: FrigateStats): SystemProcessingHealth {
  if (!stats) {
    return {
      detectionFps: 0,
      processFps: 0,
      cameraFps: 0,
      skippedFps: 0,
      cameraCount: 0,
      onlineCameraCount: 0,
      avgInferenceMs: 0,
      uptimeHours: 0,
    };
  }

  const cameraKeys = Object.keys(stats.cameras || {});
  const cameraCount = cameraKeys.length;
  const onlineCameraCount = cameraKeys.filter(
    (k) => stats.cameras[k].camera_fps > 0,
  ).length;

  const detectorList = Object.values(stats.detectors || {});
  const totalInferenceMs = detectorList.reduce(
    (acc, d) => acc + (d.inference_speed || 0),
    0,
  );
  const avgInferenceMs =
    detectorList.length > 0 ? +(totalInferenceMs / detectorList.length).toFixed(1) : 0;

  const uptimeHours = stats.service?.uptime
    ? +(stats.service.uptime / 3600).toFixed(1)
    : 0;

  return {
    detectionFps: stats.detection_fps || 0,
    processFps: stats.process_fps || 0,
    cameraFps: stats.camera_fps || 0,
    skippedFps: stats.skipped_fps || 0,
    cameraCount,
    onlineCameraCount,
    avgInferenceMs,
    uptimeHours,
  };
}
