import { ReviewSegment } from "@/types/review";
import {
  evaluateIncidentIntelligence,
  PriorityLevel,
} from "./incidentRules";

export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";

export interface SecurityAlert {
  id: string;
  incidentId: string;
  priority: PriorityLevel;
  reason: string;
  camera: string;
  zone: string;
  detection: string;
  timestamp: number;
  status: AlertStatus;
  eventCount: number;
  thumbPath?: string;
  confidence?: number;
}

/**
 * Deduplicates continuous events and generates structured ARC VISION Security Alerts.
 * Groups events occurring on the same camera & zone within a 180-second window.
 */
export function generateSecurityAlerts(
  reviewItems: ReviewSegment[],
  _activeAlertIds: string[] = [],
  acknowledgedAlertIds: string[] = [],
): SecurityAlert[] {
  if (!reviewItems || reviewItems.length === 0) return [];

  const alertGroupMap = new Map<string, SecurityAlert>();

  // Process items in chronological sequence
  for (const item of reviewItems) {
    const intel = evaluateIncidentIntelligence(item);
    // Only generate alerts for CRITICAL, HIGH, or UNREVIEWED MEDIUM events
    if (intel.priority === "LOW" && item.has_been_reviewed) continue;

    const mainZone =
      item.data?.zones && item.data.zones.length > 0
        ? item.data.zones[0]
        : "general";

    // Deduplication Key: Camera + Zone + Time window (3 min buckets)
    const timeWindowBucket = Math.floor(item.start_time / 180);
    const dedupKey = `${item.camera}-${mainZone}-${timeWindowBucket}`;

    const objects = item.data?.objects || [];
    const detectionLabel =
      objects.length > 0 ? objects[0].toUpperCase() : "ACTIVITY";

    if (alertGroupMap.has(dedupKey)) {
      const existing = alertGroupMap.get(dedupKey)!;
      existing.eventCount += 1;
      // Keep highest priority
      if (
        (intel.priority === "CRITICAL" && existing.priority !== "CRITICAL") ||
        (intel.priority === "HIGH" && existing.priority === "MEDIUM")
      ) {
        existing.priority = intel.priority;
        existing.reason = intel.reason;
      }
    } else {
      let status: AlertStatus = item.has_been_reviewed
        ? "RESOLVED"
        : "ACTIVE";
      if (acknowledgedAlertIds.includes(item.id)) {
        status = "ACKNOWLEDGED";
      }

      alertGroupMap.set(dedupKey, {
        id: `alert-${item.id}`,
        incidentId: item.id,
        priority: intel.priority,
        reason: intel.reason,
        camera: item.camera,
        zone: mainZone.replace(/_/g, " "),
        detection: `${detectionLabel} DETECTED`,
        timestamp: item.start_time,
        status,
        eventCount: 1,
        thumbPath: item.thumb_path,
        confidence: item.data.metadata?.confidence,
      });
    }
  }

  return Array.from(alertGroupMap.values()).sort(
    (a, b) => b.timestamp - a.timestamp,
  );
}
