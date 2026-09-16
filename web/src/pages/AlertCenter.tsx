import ActivityIndicator from "@/components/indicators/activity-indicator";
import IncidentDetailModal from "@/components/incidents/IncidentDetailModal";
import { Button } from "@/components/ui/button";
import Heading from "@/components/ui/heading";
import { useAllowedCameras } from "@/hooks/use-allowed-cameras";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { cn } from "@/lib/utils";
import { FrigateConfig } from "@/types/frigateConfig";
import { ReviewSegment } from "@/types/review";
import { generateSecurityAlerts } from "@/utils/intelligence/alertRules";
import { getPriorityStyle } from "@/utils/intelligence/incidentRules";
import {
  isAlertAudioMuted,
  playAlertNotificationSound,
  setAlertAudioMuted,
} from "@/utils/intelligence/notificationAudio";
import { useFrigateReviews } from "@/api/ws";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaEye,
  FaFilter,
  FaShieldAlt,
  FaTimes,
} from "react-icons/fa";
import { LuBellRing, LuClock, LuMapPin, LuLayers, LuVolume2, LuVolumeX } from "react-icons/lu";
import { toast } from "sonner";
import useSWR from "swr";
import { baseUrl } from "@/api/baseUrl";

export default function AlertCenter() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const allowedCameras = useAllowedCameras();
  const liveReview = useFrigateReviews();

  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
  const [selectedIncidentDetail, setSelectedIncidentDetail] =
    useState<ReviewSegment | null>(null);
  const [muted, setMuted] = useState(isAlertAudioMuted());

  // Fetch recent review items to derive alerts
  const { data: reviewItems, mutate: reloadReviews } = useSWR<ReviewSegment[]>(
    ["review", { limit: 100 }],
  );

  // Live WebSocket update subscription
  useEffect(() => {
    if (liveReview) {
      reloadReviews();
    }
  }, [liveReview, reloadReviews]);

  const rawAlerts = useMemo(() => {
    if (!reviewItems) return [];
    return generateSecurityAlerts(reviewItems, [], acknowledgedIds);
  }, [reviewItems, acknowledgedIds]);

  // Audio notification trigger for new critical/high alerts
  useEffect(() => {
    const activeCriticalOrHigh = rawAlerts.find(
      (a) =>
        a.status === "ACTIVE" &&
        (a.priority === "CRITICAL" || a.priority === "HIGH"),
    );
    if (activeCriticalOrHigh) {
      playAlertNotificationSound(
        activeCriticalOrHigh.incidentId,
        activeCriticalOrHigh.priority,
      );
    }
  }, [rawAlerts]);

  const filteredAlerts = useMemo(() => {
    return rawAlerts.filter((alert) => {
      if (!allowedCameras.includes(alert.camera)) return false;
      if (selectedPriority !== "ALL" && alert.priority !== selectedPriority)
        return false;
      if (selectedStatus !== "ALL" && alert.status !== selectedStatus)
        return false;
      return true;
    });
  }, [rawAlerts, allowedCameras, selectedPriority, selectedStatus]);

  const alertCounts = useMemo(() => {
    return {
      active: rawAlerts.filter((a) => a.status === "ACTIVE").length,
      acknowledged: rawAlerts.filter((a) => a.status === "ACKNOWLEDGED").length,
      resolved: rawAlerts.filter((a) => a.status === "RESOLVED").length,
      critical: rawAlerts.filter((a) => a.priority === "CRITICAL").length,
      high: rawAlerts.filter((a) => a.priority === "HIGH").length,
      medium: rawAlerts.filter((a) => a.priority === "MEDIUM").length,
      low: rawAlerts.filter((a) => a.priority === "LOW").length,
    };
  }, [rawAlerts]);

  const hasActiveFilters =
    selectedPriority !== "ALL" || selectedStatus !== "ALL";

  const handleClearFilters = () => {
    setSelectedPriority("ALL");
    setSelectedStatus("ALL");
  };

  const toggleMute = () => {
    const nextState = !muted;
    setMuted(nextState);
    setAlertAudioMuted(nextState);
    toast.info(nextState ? "Alert Audio Muted" : "Alert Audio Unmuted", {
      position: "top-center",
    });
  };

  const handleAcknowledge = (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAcknowledgedIds((prev) => [...prev, alertId]);
    toast.success("Alert Acknowledged", { position: "top-center" });
  };

  const handleResolve = async (incidentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await axios.post("reviews/viewed", { ids: [incidentId] });
      toast.success("Alert & Incident Marked as Resolved", {
        position: "top-center",
      });
      reloadReviews();
    } catch (err) {
      toast.error("Failed to resolve alert", { position: "top-center" });
    }
  };

  const openIncidentInvestigation = async (incidentId: string) => {
    try {
      const resp = await axios.get(`review/${incidentId}`);
      if (resp.data) {
        setSelectedIncidentDetail(resp.data);
      }
    } catch (err) {
      toast.error("Failed to load incident investigation details");
    }
  };

  if (!config) {
    return (
      <div className="flex size-full items-center justify-center bg-background">
        <ActivityIndicator />
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col overflow-y-auto bg-background p-6 font-mono text-slate-100 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-rose-800/80 bg-rose-950/50 text-rose-400">
            <LuBellRing className="size-5 animate-pulse" />
          </div>
          <div>
            <Heading as="h1" className="text-xl font-bold text-slate-100 flex items-center gap-2">
              REAL-TIME ALERT CENTER
              {alertCounts.active > 0 && (
                <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-extrabold text-white">
                  {alertCounts.active} ACTIVE
                </span>
              )}
            </Heading>
            <p className="text-xs text-slate-400">
              Real-time security alert prioritization, audio notifications, & threat disposition
            </p>
          </div>
        </div>

        {/* Mute toggle & Priority Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={toggleMute}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            {muted ? (
              <LuVolumeX className="size-4 text-rose-400" />
            ) : (
              <LuVolume2 className="size-4 text-emerald-400" />
            )}
            <span>{muted ? "AUDIO MUTED" : "AUDIO ACTIVE"}</span>
          </button>

          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => (
            <Button
              key={p}
              variant={selectedPriority === p ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPriority(p)}
              className={`h-8 text-xs font-bold ${
                selectedPriority === p
                  ? p === "CRITICAL"
                    ? "bg-rose-600 hover:bg-rose-500 text-white"
                    : p === "HIGH"
                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-sky-600 hover:bg-sky-500 text-white"
                  : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {/* Operational Summary Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="rounded-xl border border-cyan-800/60 bg-cyan-950/20 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
            Active Alerts
          </span>
          <span className="text-lg font-bold text-cyan-400">{alertCounts.active}</span>
        </div>

        <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
            Acknowledged
          </span>
          <span className="text-lg font-bold text-amber-400">{alertCounts.acknowledged}</span>
        </div>

        <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
            Resolved
          </span>
          <span className="text-lg font-bold text-emerald-400">{alertCounts.resolved}</span>
        </div>

        <div className="rounded-xl border border-rose-800/60 bg-rose-950/20 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
            Critical Priority
          </span>
          <span className="text-lg font-bold text-rose-400">{alertCounts.critical}</span>
        </div>

        <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
            High Priority
          </span>
          <span className="text-lg font-bold text-amber-400">{alertCounts.high}</span>
        </div>

        <div className="rounded-xl border border-sky-800/60 bg-sky-950/20 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
            Medium Priority
          </span>
          <span className="text-lg font-bold text-sky-400">{alertCounts.medium}</span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Low Priority
          </span>
          <span className="text-lg font-bold text-slate-400">{alertCounts.low}</span>
        </div>
      </div>

      {/* Status Filters & Clear Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-400 flex items-center gap-1.5">
            <FaFilter className="size-3 text-sky-400" /> Filter Status:
          </span>
          {["ALL", "ACTIVE", "ACKNOWLEDGED", "RESOLVED"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={cn(
                "px-3 py-1 rounded-md transition-colors font-semibold",
                selectedStatus === st
                  ? "bg-slate-800 text-slate-100 border border-slate-700"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              {st}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearFilters}
            className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
          >
            <FaTimes className="mr-1 size-3" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Empty State */}
      {filteredAlerts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-background_alt/50 p-12 text-center">
          <FaShieldAlt className="mb-4 size-12 text-slate-600" />
          <h3 className="mb-2 text-base font-bold text-slate-200 uppercase tracking-wider">
            NO ACTIVE ALERTS
          </h3>
          <p className="max-w-md text-xs text-slate-400">
            The monitored surveillance environment currently has no elevated security alerts matching your filter criteria.
          </p>
        </div>
      )}

      {/* Alert Stream Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filteredAlerts.map((alert) => {
          const priorityStyle = getPriorityStyle(alert.priority);
          const thumbUrl = alert.thumbPath
            ? `${baseUrl}${alert.thumbPath.replace("/media/frigate/", "")}`
            : undefined;

          return (
            <div
              key={alert.id}
              className={cn(
                "group relative flex flex-col justify-between rounded-xl border bg-background_alt/90 p-5 shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-slate-700",
                alert.priority === "CRITICAL"
                  ? "border-rose-900/60 bg-rose-950/10"
                  : alert.priority === "HIGH"
                  ? "border-amber-900/60 bg-amber-950/10"
                  : "border-slate-800/90",
              )}
            >
              <div>
                {/* Alert Top Row */}
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-bold tracking-wider",
                      priorityStyle.bg,
                      priorityStyle.text,
                      priorityStyle.border,
                    )}
                  >
                    <span className={cn("size-2 rounded-full", priorityStyle.dot)} />
                    {alert.priority} PRIORITY
                  </span>

                  <div className="flex items-center gap-2">
                    {alert.eventCount > 1 && (
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300 border border-slate-700 flex items-center gap-1">
                        <LuLayers className="size-2.5 text-sky-400" />
                        {alert.eventCount} related events
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                        alert.status === "ACTIVE"
                          ? "bg-rose-950 text-rose-400 border border-rose-800"
                          : alert.status === "ACKNOWLEDGED"
                          ? "bg-amber-950 text-amber-400 border border-amber-800"
                          : "bg-emerald-950 text-emerald-400 border border-emerald-800",
                      )}
                    >
                      {alert.status}
                    </span>
                  </div>
                </div>

                {/* Main Detection & Reason */}
                <div className="mb-3">
                  <h3 className="text-base font-bold text-slate-100 tracking-wide mb-1">
                    {alert.detection}
                  </h3>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                      EXPLAINABLE INTELLIGENCE REASON
                    </span>
                    <p className="text-xs font-medium text-slate-200">
                      {alert.reason}
                    </p>
                  </div>
                  {thumbUrl && (
                    <div className="mt-2.5 aspect-video w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                      <img
                        src={thumbUrl}
                        alt={alert.detection}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>

                {/* Metadata Row */}
                <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <FaShieldAlt className="size-3 text-sky-400" />
                    <span className="font-semibold text-slate-300">
                      CAM: {alert.camera.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <LuMapPin className="size-3 text-amber-400" />
                    <span className="font-semibold text-slate-300">
                      ZONE: {alert.zone}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <LuClock className="size-3 text-slate-500" />
                    <AlertTimestamp timestamp={alert.timestamp} />
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <Button
                  size="sm"
                  onClick={() => openIncidentInvestigation(alert.incidentId)}
                  className="flex-1 h-8 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                >
                  <FaEye className="mr-1.5 size-3" />
                  INVESTIGATE
                </Button>

                {alert.status === "ACTIVE" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleAcknowledge(alert.id, e)}
                    className="h-8 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
                  >
                    ACKNOWLEDGE
                  </Button>
                )}

                {alert.status !== "RESOLVED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleResolve(alert.incidentId, e)}
                    className="h-8 border-slate-700 bg-slate-900 text-emerald-400 hover:bg-slate-800 text-xs font-semibold"
                  >
                    <FaCheckCircle className="mr-1 size-3 text-emerald-400" />
                    RESOLVE
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Incident Detail Modal */}
      <IncidentDetailModal
        event={selectedIncidentDetail}
        isOpen={Boolean(selectedIncidentDetail)}
        onClose={() => setSelectedIncidentDetail(null)}
        onRefresh={reloadReviews}
      />
    </div>
  );
}

function AlertTimestamp({ timestamp }: { timestamp: number }) {
  const formattedTime = useFormattedTimestamp(timestamp, "MMM d, YYYY · HH:mm:ss");
  return <span>{formattedTime}</span>;
}
