import { baseUrl } from "@/api/baseUrl";
import { useFormattedTimestamp, use24HourTime } from "@/hooks/use-date-utils";
import { cn } from "@/lib/utils";
import { FrigateConfig } from "@/types/frigateConfig";
import { REVIEW_PADDING, ReviewSegment } from "@/types/review";
import {
  getIncidentDetectionLabel,
  getIncidentSeverity,
  getIncidentStatus,
  getIncidentZoneLabel,
  getSeverityBadgeStyle,
  getStatusBadgeStyle,
} from "@/utils/incidentAdapter";
import { evaluateIncidentIntelligence } from "@/utils/intelligence/incidentRules";
import axios from "axios";
import { useState } from "react";
import {
  FaArrowLeft,
  FaCamera,
  FaCheckCircle,
  FaCompactDisc,
  FaShieldAlt,
  FaEye,
} from "react-icons/fa";
import {
  LuClock,
  LuMapPin,
  LuLayers,
  LuTarget,
  LuActivity,
  LuFileText,
} from "react-icons/lu";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

import CameraDetailModal from "../camera/CameraDetailModal";

interface IncidentDetailModalProps {
  event: ReviewSegment | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function IncidentDetailModal({
  event,
  isOpen,
  onClose,
  onRefresh,
}: IncidentDetailModalProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const is24Hour = use24HourTime(config);
  const [showCameraDetail, setShowCameraDetail] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  if (!event) return null;

  const formattedStartTime = useFormattedTimestamp(
    event.start_time,
    is24Hour ? "MMM d, YYYY · HH:mm:ss" : "MMM d, YYYY · h:mm:ss a",
    config?.ui.timezone,
  );

  const formattedEndTime = event.end_time
    ? useFormattedTimestamp(
        event.end_time,
        is24Hour ? "HH:mm:ss" : "h:mm:ss a",
        config?.ui.timezone,
      )
    : "Ongoing";

  const severity = getIncidentSeverity(event);
  const intelligence = evaluateIncidentIntelligence(event);
  const status = getIncidentStatus(
    event.has_been_reviewed,
    isAcknowledged,
    false,
  );
  const severityStyle = getSeverityBadgeStyle(severity);
  const statusStyle = getStatusBadgeStyle(status);
  const detectionLabel = getIncidentDetectionLabel(
    event.data?.objects,
    event.data?.detections,
  );
  const zoneLabel = getIncidentZoneLabel(event.data?.zones);
  const cameraDisplayName =
    config?.cameras[event.camera]?.name || event.camera.toUpperCase();

  const durationSec = event.end_time
    ? Math.max(0, Math.round(event.end_time - event.start_time))
    : 0;

  const handleAcknowledge = () => {
    setIsAcknowledged(true);
    toast.info("Incident acknowledged by operator", { position: "top-center" });
    onRefresh?.();
  };

  const handleResolve = async () => {
    try {
      await axios.post("reviews/viewed", { ids: [event.id] });
      event.has_been_reviewed = true;
      setIsAcknowledged(false);
      toast.success("Incident marked as resolved", { position: "top-center" });
      onRefresh?.();
    } catch (err) {
      toast.error("Failed to mark incident as resolved");
    }
  };

  const handleExportEvidence = async () => {
    const endTime = event.end_time
      ? event.end_time + REVIEW_PADDING
      : Date.now() / 1000;
    const title =
      event.data.metadata?.title?.trim() ||
      `${cameraDisplayName} - ${detectionLabel}`;

    try {
      const response = await axios.post(
        `export/${event.camera}/start/${Math.floor(
          event.start_time - REVIEW_PADDING,
        )}/end/${Math.ceil(endTime)}`,
        {
          playback: "realtime",
          name: title,
        },
      );
      if (response.status < 300) {
        toast.success("Evidence export started successfully", {
          position: "top-center",
        });
      }
    } catch (err) {
      toast.error("Failed to export evidence");
    }
  };

  const thumbUrl = `${baseUrl}${event.thumb_path.replace(
    "/media/frigate/",
    "",
  )}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl border-slate-800 bg-slate-950 p-0 font-mono text-slate-100 shadow-2xl">
        {/* Header Bar */}
        <DialogHeader className="border-b border-slate-800/80 bg-background_alt p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <FaArrowLeft className="mr-1.5 size-3" />
                Return to Incidents
              </Button>
              <div className="h-4 w-px bg-slate-800" />
              <DialogTitle className="text-base font-bold tracking-wide text-sky-400">
                INCIDENT INVESTIGATION #{event.id.slice(0, 8).toUpperCase()}
              </DialogTitle>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold",
                  statusStyle.bg,
                  statusStyle.text,
                  statusStyle.border,
                )}
              >
                <span className={cn("size-1.5 rounded-full", statusStyle.dot)} />
                {status}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold",
                  severityStyle.bg,
                  severityStyle.text,
                  severityStyle.border,
                )}
              >
                <FaShieldAlt className="size-3" />
                {severity}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
          {/* Left Column - Primary Evidence Media & Investigation Timeline */}
          <div className="md:col-span-2 space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-inner">
              <img
                src={thumbUrl}
                alt={detectionLabel}
                className="size-full object-contain"
              />
              <div className="absolute bottom-3 left-3 rounded-md bg-slate-950/80 px-2.5 py-1 text-xs font-semibold text-slate-200 backdrop-blur-md border border-slate-800">
                Primary Snapshot Preview
              </div>
            </div>

            {/* Explainable Intelligence Reason Card */}
            <div className="rounded-lg border border-sky-900/50 bg-sky-950/20 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-1 flex items-center justify-between">
                <span>ARC VISION INTELLIGENCE</span>
                <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                  {intelligence.priority} PRIORITY ({intelligence.score}%)
                </span>
              </h4>
              <p className="text-xs text-slate-200 font-medium mt-1">
                {intelligence.reason}
              </p>
            </div>

            {/* Chronological Investigation Timeline */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <LuActivity className="size-4 text-sky-400" />
                Investigation Activity Timeline
              </h4>

              <div className="space-y-3 pl-2 text-xs">
                {/* Timeline Step 1 */}
                <div className="relative pl-6 border-l border-sky-500/40 pb-2">
                  <span className="absolute -left-[5px] top-0 size-2.5 rounded-full bg-sky-400" />
                  <span className="font-bold text-sky-400 block">
                    1. Detection Ingested
                  </span>
                  <span className="text-slate-300">
                    {detectionLabel} captured on camera {cameraDisplayName} at{" "}
                    {formattedStartTime}
                  </span>
                </div>

                {/* Timeline Step 2 */}
                <div className="relative pl-6 border-l border-amber-500/40 pb-2">
                  <span className="absolute -left-[5px] top-0 size-2.5 rounded-full bg-amber-400" />
                  <span className="font-bold text-amber-400 block">
                    2. Security Zone Attribution
                  </span>
                  <span className="text-slate-300">
                    Perimeter zone context attributed to: {zoneLabel}
                  </span>
                </div>

                {/* Timeline Step 3 */}
                <div className="relative pl-6 border-l border-rose-500/40 pb-2">
                  <span className="absolute -left-[5px] top-0 size-2.5 rounded-full bg-rose-400" />
                  <span className="font-bold text-rose-400 block">
                    3. Security Intelligence Assessment
                  </span>
                  <span className="text-slate-300">
                    Rule Evaluated: {intelligence.reason} ({severity} Priority)
                  </span>
                </div>

                {/* Timeline Step 4 */}
                <div className="relative pl-6 border-l border-emerald-500/40 pb-2">
                  <span className="absolute -left-[5px] top-0 size-2.5 rounded-full bg-emerald-400" />
                  <span className="font-bold text-emerald-400 block">
                    4. Evidence Archiving
                  </span>
                  <span className="text-slate-300">
                    Snapshot and continuous clip recording indexed in system storage.
                  </span>
                </div>

                {/* Timeline Step 5 */}
                <div className="relative pl-6">
                  <span
                    className={cn(
                      "absolute -left-[5px] top-0 size-2.5 rounded-full",
                      status === "RESOLVED"
                        ? "bg-emerald-500"
                        : status === "ACKNOWLEDGED"
                        ? "bg-amber-400 animate-pulse"
                        : "bg-cyan-400 animate-ping",
                    )}
                  />
                  <span
                    className={cn(
                      "font-bold block",
                      status === "RESOLVED"
                        ? "text-emerald-400"
                        : status === "ACKNOWLEDGED"
                        ? "text-amber-300"
                        : "text-cyan-400",
                    )}
                  >
                    5. Operator Workflow ({status})
                  </span>
                  <span className="text-slate-400">
                    {status === "RESOLVED"
                      ? "Incident marked resolved by operator."
                      : status === "ACKNOWLEDGED"
                      ? "Operator acknowledged active incident."
                      : "Pending operator review & disposition."}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Incident Details & Metadata */}
          <div className="flex flex-col justify-between space-y-6 rounded-xl border border-slate-800/80 bg-background_alt p-4">
            <div className="space-y-4">
              <h3 className="border-b border-slate-800 pb-2 text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>Incident Parameters</span>
                <LuFileText className="size-4 text-sky-400" />
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Detection Type</span>
                  <span className="font-bold text-sky-400 text-sm">
                    {detectionLabel}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                    <FaCamera className="size-3 text-sky-400" />
                    Camera Source
                  </span>
                  <button
                    onClick={() => setShowCameraDetail(true)}
                    className="font-semibold text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 transition-colors"
                  >
                    {cameraDisplayName}
                    <span className="text-[10px] text-slate-500 font-normal">
                      (Inspect Camera)
                    </span>
                  </button>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                    <LuMapPin className="size-3 text-amber-400" />
                    Security Zone Context
                  </span>
                  <a
                    href="/zones"
                    className="font-semibold text-amber-400 hover:text-amber-300 hover:underline transition-colors"
                  >
                    {zoneLabel}
                  </a>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                    <LuClock className="size-3 text-slate-400" />
                    Timestamp
                  </span>
                  <span className="text-slate-300">
                    {formattedStartTime} ({formattedEndTime})
                  </span>
                </div>

                {durationSec > 0 && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">Duration</span>
                    <span className="text-slate-300">{durationSec} seconds</span>
                  </div>
                )}

                {event.data.metadata?.confidence && (
                  <div>
                    <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                      <LuTarget className="size-3 text-emerald-400" />
                      Confidence Score
                    </span>
                    <span className="font-bold text-emerald-400">
                      {(event.data.metadata.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                )}

                {event.data.objects && event.data.objects.length > 0 && (
                  <div>
                    <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                      <LuLayers className="size-3 text-cyan-400" />
                      Objects Detected
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {event.data.objects.map((obj, i) => (
                        <span
                          key={i}
                          className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300 border border-slate-700"
                        >
                          {obj}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Investigation Actions */}
            <div className="space-y-2 pt-4 border-t border-slate-800">
              {status === "ACTIVE" && (
                <Button
                  onClick={handleAcknowledge}
                  className="w-full h-9 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                >
                  <FaEye className="mr-2 size-3.5" />
                  ACKNOWLEDGE INCIDENT
                </Button>
              )}

              {status !== "RESOLVED" && (
                <Button
                  onClick={handleResolve}
                  className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  <FaCheckCircle className="mr-2 size-3.5" />
                  RESOLVE INCIDENT
                </Button>
              )}

              <Button
                onClick={handleExportEvidence}
                variant="outline"
                className="w-full h-9 border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold"
              >
                <FaCompactDisc className="mr-2 size-3.5 text-amber-400" />
                EXPORT EVIDENCE
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                className="w-full h-8 text-slate-400 hover:text-slate-200 text-xs"
              >
                Close Window
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {showCameraDetail && event && (
        <CameraDetailModal
          cameraName={event.camera}
          isOpen={showCameraDetail}
          onClose={() => setShowCameraDetail(false)}
        />
      )}
    </Dialog>
  );
}
