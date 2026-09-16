export type PriorityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface IntelligenceAnalysis {
  priority: PriorityLevel;
  reason: string;
  category:
    | "RESTRICTED_BREACH"
    | "PERIMETER_ENTRY"
    | "OBJECT_DETECTION"
    | "ROUTINE_ACTIVITY";
  score: number; // 0 - 100
}

/**
 * Deterministically evaluates security intelligence priority & reason based on event context.
 */
export function evaluateIncidentIntelligence(event: {
  severity?: string;
  camera: string;
  data?: {
    objects?: string[];
    detections?: string[];
    zones?: string[];
    metadata?: { confidence?: number; title?: string };
  };
  zones?: string[];
  label?: string;
}): IntelligenceAnalysis {
  const isAlert = event.severity === "alert";
  const objects = event.data?.objects || [];
  const detections = event.data?.detections || [];
  const allObjects = [...new Set([...objects, ...detections])];
  const zones = event.data?.zones || event.zones || [];

  const hasPerson = allObjects.includes("person") || event.label === "person";
  const hasVehicle =
    allObjects.some((o) =>
      ["car", "vehicle", "truck", "bus", "motorcycle"].includes(o.toLowerCase()),
    ) || event.label === "car";

  const hasRestrictedZone = zones.some((z) => {
    const lower = z.toLowerCase();
    return (
      lower.includes("restricted") ||
      lower.includes("secure") ||
      lower.includes("danger") ||
      lower.includes("vault") ||
      lower.includes("no_entry")
    );
  });

  const hasEntryZone = zones.some((z) => {
    const lower = z.toLowerCase();
    return (
      lower.includes("entry") ||
      lower.includes("gate") ||
      lower.includes("door") ||
      lower.includes("entrance") ||
      lower.includes("driveway")
    );
  });

  const zoneNameFormatted =
    zones.length > 0 ? zones[0].replace(/_/g, " ") : "monitored zone";

  // RULE 1: Restricted Zone Breach
  if (hasRestrictedZone && (hasPerson || isAlert)) {
    return {
      priority: "CRITICAL",
      reason: `Person detected inside Restricted Zone (${zoneNameFormatted})`,
      category: "RESTRICTED_BREACH",
      score: 95,
    };
  }

  if (hasRestrictedZone && hasVehicle) {
    return {
      priority: "HIGH",
      reason: `Vehicle detected inside Restricted Boundary (${zoneNameFormatted})`,
      category: "RESTRICTED_BREACH",
      score: 85,
    };
  }

  // RULE 2: Entry Zone Detection
  if (hasEntryZone && (hasPerson || isAlert)) {
    return {
      priority: "HIGH",
      reason: `Person detected at Entry Zone boundary (${zoneNameFormatted})`,
      category: "PERIMETER_ENTRY",
      score: 80,
    };
  }

  if (hasEntryZone && hasVehicle) {
    return {
      priority: "HIGH",
      reason: `Vehicle detected entering perimeter (${zoneNameFormatted})`,
      category: "PERIMETER_ENTRY",
      score: 75,
    };
  }

  // RULE 3: Monitored Area Person / Alert
  if (hasPerson && isAlert) {
    return {
      priority: "HIGH",
      reason: `Person detected with alert severity on ${event.camera.toUpperCase()}`,
      category: "OBJECT_DETECTION",
      score: 70,
    };
  }

  if (hasPerson) {
    return {
      priority: "MEDIUM",
      reason: `Person detected in monitored area on ${event.camera.toUpperCase()}`,
      category: "OBJECT_DETECTION",
      score: 55,
    };
  }

  // RULE 4: Vehicle Detection
  if (hasVehicle) {
    return {
      priority: "MEDIUM",
      reason: `Vehicle activity detected on ${event.camera.toUpperCase()}`,
      category: "OBJECT_DETECTION",
      score: 45,
    };
  }

  // RULE 5: Routine Motion / Animal / Audio
  return {
    priority: "LOW",
    reason: `Routine motion activity detected on ${event.camera.toUpperCase()}`,
    category: "ROUTINE_ACTIVITY",
    score: 25,
  };
}

/**
 * Priority badge visual styles.
 */
export function getPriorityStyle(priority: PriorityLevel): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (priority) {
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
