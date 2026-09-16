import { ReviewSegment } from "@/types/review";

export type IncidentSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type IncidentStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";

export interface IncidentCounts {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface IncidentFilterOptions {
  searchQuery?: string;
  severity?: IncidentSeverity | "ALL";
  status?: IncidentStatus | "ALL";
  camera?: string | "ALL";
  zone?: string | "ALL";
  detectionClass?: string | "ALL";
}

/**
 * Computes deterministic ARC VISION Incident Severity.
 * Rule system:
 * - CRITICAL: Alert severity + Restricted Zone / Entry Zone
 * - HIGH: Alert severity OR (Person detected + Restricted Zone)
 * - MEDIUM: Person detected in General area OR Detection severity
 * - LOW: Vehicle / Animal / Motion only
 */
export function getIncidentSeverity(event: ReviewSegment): IncidentSeverity {
  const isAlert = event.severity === "alert";
  const objects = event.data?.objects || [];
  const zones = event.data?.zones || [];
  const hasPerson = objects.includes("person");

  const hasRestrictedZone = zones.some((z) => {
    const lower = z.toLowerCase();
    return (
      lower.includes("restricted") ||
      lower.includes("entry") ||
      lower.includes("secure") ||
      lower.includes("danger") ||
      lower.includes("vault") ||
      lower.includes("no_entry")
    );
  });

  if (isAlert && hasRestrictedZone) return "CRITICAL";
  if (isAlert || (hasPerson && hasRestrictedZone)) return "HIGH";
  if (hasPerson || event.severity === "detection") return "MEDIUM";
  return "LOW";
}

/**
 * Maps ARC VISION review state & local acknowledgement state to ARC VISION Incident Status.
 */
export function getIncidentStatus(
  hasBeenReviewed: boolean,
  isAcknowledged = false,
  _isCurrentlySelected = false,
): IncidentStatus {
  if (hasBeenReviewed) return "RESOLVED";
  if (isAcknowledged) return "ACKNOWLEDGED";
  return "ACTIVE";
}

/**
 * Formats zone attribution string.
 */
export function getIncidentZoneLabel(zones?: string[]): string {
  if (!zones || zones.length === 0) return "General Area";
  return zones
    .map((z) =>
      z
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    )
    .join(", ");
}

/**
 * Formats detection object label.
 */
export function getIncidentDetectionLabel(
  objects?: string[],
  detections?: string[],
): string {
  const list = objects && objects.length ? objects : detections || [];
  if (list.includes("person")) return "PERSON DETECTED";
  if (
    list.includes("car") ||
    list.includes("vehicle") ||
    list.includes("bus") ||
    list.includes("truck")
  )
    return "VEHICLE DETECTED";
  if (
    list.includes("dog") ||
    list.includes("cat") ||
    list.includes("animal") ||
    list.includes("bird")
  )
    return "ANIMAL DETECTED";
  if (list.length > 0)
    return `${list[0].replace(/_/g, " ").toUpperCase()} DETECTED`;
  return "ACTIVITY DETECTED";
}

/**
 * Returns color classes for Severity Badge.
 */
export function getSeverityBadgeStyle(severity: IncidentSeverity): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (severity) {
    case "CRITICAL":
      return {
        bg: "bg-rose-950/60",
        text: "text-rose-400",
        border: "border-rose-700/80",
        dot: "bg-rose-500 animate-ping",
      };
    case "HIGH":
      return {
        bg: "bg-amber-950/60",
        text: "text-amber-400",
        border: "border-amber-700/80",
        dot: "bg-amber-500 animate-pulse",
      };
    case "MEDIUM":
      return {
        bg: "bg-sky-950/60",
        text: "text-sky-400",
        border: "border-sky-700/80",
        dot: "bg-sky-400",
      };
    case "LOW":
    default:
      return {
        bg: "bg-slate-900/60",
        text: "text-slate-400",
        border: "border-slate-800",
        dot: "bg-slate-500",
      };
  }
}

/**
 * Returns color classes for Status Badge.
 */
export function getStatusBadgeStyle(status: IncidentStatus): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case "ACTIVE":
      return {
        bg: "bg-cyan-950/60",
        text: "text-cyan-400",
        border: "border-cyan-700/80",
        dot: "bg-cyan-400 animate-pulse",
      };
    case "ACKNOWLEDGED":
      return {
        bg: "bg-amber-950/60",
        text: "text-amber-300",
        border: "border-amber-700/80",
        dot: "bg-amber-400",
      };
    case "RESOLVED":
    default:
      return {
        bg: "bg-emerald-950/60",
        text: "text-emerald-400",
        border: "border-emerald-800/80",
        dot: "bg-emerald-500",
      };
  }
}

/**
 * Correlates and clusters continuous detection segments on the same camera/zone
 * within a time window (default 180 seconds) to reduce notification storms.
 */
export function correlateIncidentSegments(
  segments: ReviewSegment[],
  windowSeconds = 180,
): ReviewSegment[] {
  if (!segments || segments.length <= 1) return segments || [];

  const sorted = [...segments].sort((a, b) => b.start_time - a.start_time);
  const correlated: ReviewSegment[] = [];
  const processedIds = new Set<string>();

  for (let i = 0; i < sorted.length; i++) {
    const primary = sorted[i];
    if (processedIds.has(primary.id)) continue;

    processedIds.add(primary.id);

    // Look for related segments on same camera within windowSeconds
    const related = sorted.filter(
      (candidate) =>
        candidate.id !== primary.id &&
        !processedIds.has(candidate.id) &&
        candidate.camera === primary.camera &&
        Math.abs(primary.start_time - candidate.start_time) <= windowSeconds,
    );

    if (related.length > 0) {
      // Mark related segments as processed
      related.forEach((r) => processedIds.add(r.id));

      // Combine objects and zones
      const combinedObjects = [
        ...new Set([
          ...(primary.data?.objects || []),
          ...related.flatMap((r) => r.data?.objects || []),
        ]),
      ];
      const combinedZones = [
        ...new Set([
          ...(primary.data?.zones || []),
          ...related.flatMap((r) => r.data?.zones || []),
        ]),
      ];

      // Return unified segment representing correlated incident
      correlated.push({
        ...primary,
        data: {
          ...primary.data,
          objects: combinedObjects,
          zones: combinedZones,
        },
      });
    } else {
      correlated.push(primary);
    }
  }

  return correlated;
}

/**
 * Calculates operational counts across incident segments.
 */
export function calculateIncidentCounts(
  segments: ReviewSegment[],
  acknowledgedIds?: Set<string>,
): IncidentCounts {
  const counts: IncidentCounts = {
    total: segments.length,
    active: 0,
    acknowledged: 0,
    resolved: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  segments.forEach((seg) => {
    const isAck = acknowledgedIds?.has(seg.id) ?? false;
    const status = getIncidentStatus(seg.has_been_reviewed, isAck);
    const severity = getIncidentSeverity(seg);

    if (status === "RESOLVED") counts.resolved++;
    else if (status === "ACKNOWLEDGED") counts.acknowledged++;
    else counts.active++;

    if (severity === "CRITICAL") counts.critical++;
    else if (severity === "HIGH") counts.high++;
    else if (severity === "MEDIUM") counts.medium++;
    else counts.low++;
  });

  return counts;
}

/**
 * Filters incident segments based on multi-parameter search/filters.
 */
export function filterIncidents(
  segments: ReviewSegment[],
  options: IncidentFilterOptions,
  acknowledgedIds?: Set<string>,
): ReviewSegment[] {
  if (!segments) return [];

  return segments.filter((seg) => {
    const severity = getIncidentSeverity(seg);
    const isAck = acknowledgedIds?.has(seg.id) ?? false;
    const status = getIncidentStatus(seg.has_been_reviewed, isAck);
    const detectionLabel = getIncidentDetectionLabel(
      seg.data?.objects,
      seg.data?.detections,
    );
    const zoneLabel = getIncidentZoneLabel(seg.data?.zones);

    // Search query filter
    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase();
      const matches =
        seg.camera.toLowerCase().includes(q) ||
        detectionLabel.toLowerCase().includes(q) ||
        zoneLabel.toLowerCase().includes(q) ||
        seg.id.toLowerCase().includes(q);
      if (!matches) return false;
    }

    // Severity filter
    if (options.severity && options.severity !== "ALL") {
      if (severity !== options.severity) return false;
    }

    // Status filter
    if (options.status && options.status !== "ALL") {
      if (status !== options.status) return false;
    }

    // Camera filter
    if (options.camera && options.camera !== "ALL") {
      if (seg.camera !== options.camera) return false;
    }

    // Zone filter
    if (options.zone && options.zone !== "ALL") {
      const zones = seg.data?.zones || [];
      if (!zones.includes(options.zone)) return false;
    }

    // Detection class filter
    if (options.detectionClass && options.detectionClass !== "ALL") {
      const objects = seg.data?.objects || seg.data?.detections || [];
      if (!objects.includes(options.detectionClass)) return false;
    }

    return true;
  });
}
