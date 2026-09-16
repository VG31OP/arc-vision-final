import { baseUrl } from "@/api/baseUrl";
import { useDetectState, useEnabledState, useRecordingsState } from "@/api/ws";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAutoFrigateStats } from "@/hooks/use-stats";
import { cn } from "@/lib/utils";
import { FrigateConfig } from "@/types/frigateConfig";
import { ReviewSegment } from "@/types/review";
import {
  getIncidentDetectionLabel,
  getIncidentSeverity,
  getSeverityBadgeStyle,
} from "@/utils/incidentAdapter";
import axios from "axios";
import { useState } from "react";
import {
  FaArrowLeft,
  FaCamera,
  FaShieldAlt,
  FaVideo,
} from "react-icons/fa";
import {
  LuActivity,
  LuCrosshair,
  LuExternalLink,
  LuLayers,
  LuMapPin,
  LuHardDrive,
  LuClock,
} from "react-icons/lu";
import { Link } from "react-router-dom";
import useSWR from "swr";
import LivePlayer from "../player/LivePlayer";

interface CameraDetailModalProps {
  cameraName: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectIncident?: (incident: ReviewSegment) => void;
}

type TabType =
  | "overview"
  | "detection"
  | "zones"
  | "recording"
  | "health"
  | "incidents";

export default function CameraDetailModal({
  cameraName,
  isOpen,
  onClose,
  onSelectIncident,
}: CameraDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const { data: config } = useSWR<FrigateConfig>("config");
  const stats = useAutoFrigateStats();

  const cameraConfig = cameraName && config?.cameras ? config.cameras[cameraName] : null;

  const { payload: enabledPayload, send: _sendEnabled } = useEnabledState(
    cameraName || "",
  );
  const { payload: detectPayload, send: sendDetect } = useDetectState(
    cameraName || "",
  );
  const { payload: recordPayload, send: sendRecord } = useRecordingsState(
    cameraName || "",
  );

  const isEnabled =
    enabledPayload !== null
      ? enabledPayload === "ON"
      : cameraConfig?.enabled ?? true;
  const isDetectON =
    detectPayload !== null
      ? detectPayload === "ON"
      : cameraConfig?.detect?.enabled ?? true;
  const isRecordON =
    recordPayload !== null
      ? recordPayload === "ON"
      : cameraConfig?.record?.enabled ?? true;

  const camStats = cameraName && stats?.cameras ? stats.cameras[cameraName] : null;
  const cameraFps = camStats?.camera_fps ?? 0;
  const detectionFps = camStats?.detection_fps ?? 0;
  const ffmpegCpu = cameraName && stats?.cpu_usages && camStats?.ffmpeg_pid
    ? stats.cpu_usages[camStats.ffmpeg_pid]?.cpu_average
    : "N/A";
  const detectCpu = cameraName && stats?.cpu_usages && camStats?.pid
    ? stats.cpu_usages[camStats.pid]?.cpu_average
    : "N/A";

  const isOnline = isEnabled && cameraFps > 0;
  const statusLabel = isEnabled
    ? cameraFps > 0
      ? "ONLINE"
      : "OFFLINE"
    : "DISABLED";

  const statusBg = isEnabled
    ? cameraFps > 0
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
      : "bg-rose-500/10 text-rose-400 border-rose-500/30"
    : "bg-slate-800 text-slate-400 border-slate-700";

  // Fetch recent incidents for this camera
  const { data: recentIncidents } = useSWR<ReviewSegment[]>(
    isOpen && cameraName
      ? `reviews-camera-${cameraName}`
      : null,
    async () => {
      const resp = await axios.get("review", {
        params: { cameras: cameraName, limit: 12 },
      });
      return resp.data;
    },
    { revalidateOnFocus: false },
  );

  if (!cameraName || !cameraConfig) return null;

  const streamName =
    cameraConfig.live?.streams && Object.keys(cameraConfig.live.streams).length > 0
      ? Object.values(cameraConfig.live.streams)[0]
      : cameraName;

  const trackedObjects =
    cameraConfig.objects?.track ||
    config?.objects?.track || [
      "person",
      "car",
      "motorcycle",
      "bicycle",
      "dog",
      "cat",
    ];

  const configuredZones = cameraConfig.zones ? Object.entries(cameraConfig.zones) : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl border-slate-800 bg-slate-950 p-0 font-mono text-slate-100 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="border-b border-slate-800/80 bg-background_alt p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <FaArrowLeft className="mr-1.5 size-3" />
                Back
              </Button>
              <div className="h-4 w-px bg-slate-800" />
              <div>
                <DialogTitle className="text-base font-bold tracking-wide text-sky-400 flex items-center gap-2">
                  <FaCamera className="size-4 text-sky-400" />
                  {cameraConfig.friendly_name || cameraName.toUpperCase()}
                  <span className="text-xs font-normal text-slate-500">
                    ({cameraName})
                  </span>
                </DialogTitle>
              </div>
            </div>

            {/* Quick Status Badges & Controls */}
            <div className="flex items-center gap-4">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold",
                  statusBg,
                )}
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-400",
                  )}
                />
                {statusLabel}
              </span>

              <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                <span className="text-xs text-slate-400">Detect:</span>
                <Switch
                  checked={isDetectON}
                  onCheckedChange={(checked) =>
                    sendDetect(checked ? "ON" : "OFF")
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Record:</span>
                <Switch
                  checked={isRecordON}
                  onCheckedChange={(checked) =>
                    sendRecord(checked ? "ON" : "OFF")
                  }
                />
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 mt-4 border-t border-slate-800/60 pt-3 text-xs">
            {[
              { id: "overview", label: "OVERVIEW & LIVE", icon: FaVideo },
              { id: "detection", label: "DETECTION SETTINGS", icon: LuCrosshair },
              { id: "zones", label: `SECURITY ZONES (${configuredZones.length})`, icon: LuMapPin },
              { id: "recording", label: "RECORDING EVIDENCE", icon: LuHardDrive },
              { id: "health", label: "SYSTEM & HEALTH", icon: LuActivity },
              {
                id: "incidents",
                label: `RECENT INCIDENTS (${recentIncidents?.length || 0})`,
                icon: FaShieldAlt,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all",
                    isActive
                      ? "bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50",
                  )}
                >
                  <Icon className="size-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: OVERVIEW & LIVE STREAM */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-inner">
                <LivePlayer
                  cameraConfig={cameraConfig}
                  streamName={streamName}
                  preferredLiveMode="webrtc"
                  useWebGL={true}
                  playInBackground={false}
                />
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                  <span className="text-[11px] text-slate-400 uppercase font-bold block">
                    Camera FPS
                  </span>
                  <span className="text-xl font-extrabold text-sky-400">
                    {cameraFps > 0 ? cameraFps : "0"}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                  <span className="text-[11px] text-slate-400 uppercase font-bold block">
                    Detection FPS
                  </span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    {detectionFps > 0 ? detectionFps : "0"}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                  <span className="text-[11px] text-slate-400 uppercase font-bold block">
                    FFmpeg CPU Usage
                  </span>
                  <span className="text-xl font-extrabold text-amber-400">
                    {ffmpegCpu !== "N/A" ? `${ffmpegCpu}%` : "N/A"}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                  <span className="text-[11px] text-slate-400 uppercase font-bold block">
                    Detector CPU Usage
                  </span>
                  <span className="text-xl font-extrabold text-cyan-400">
                    {detectCpu !== "N/A" ? `${detectCpu}%` : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DETECTION SETTINGS */}
          {activeTab === "detection" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">
                      Real-time Object Detection Engine
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configured backend parameters for object detection and tracking.
                    </p>
                  </div>
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-bold border",
                      isDetectON
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/30",
                    )}
                  >
                    Detection {isDetectON ? "ENABLED" : "DISABLED"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1 font-semibold">
                      Target Detection Rate:
                    </span>
                    <span className="text-slate-200 font-bold">
                      {cameraConfig.detect?.fps || 5} FPS
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1 font-semibold">
                      Current Runtime FPS:
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {detectionFps} FPS
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1 font-semibold">
                      Max Stationary Interval:
                    </span>
                    <span className="text-slate-200 font-bold">
                      {cameraConfig.detect?.stationary?.interval || "Default (50 frames)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1 font-semibold">
                      Stationary Threshold:
                    </span>
                    <span className="text-slate-200 font-bold">
                      {cameraConfig.detect?.stationary?.threshold || "Default (50)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tracked Object Classes */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <LuLayers className="size-4 text-sky-400" />
                  Tracked Object Classes ({trackedObjects.length})
                </h3>
                <p className="text-xs text-slate-400">
                  ARC VISION actively filters and attributes the following object detection categories:
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  {trackedObjects.map((obj, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-950/30 px-3 py-1 text-xs font-bold text-sky-300"
                    >
                      <LuCrosshair className="size-3 text-sky-400" />
                      {obj.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY ZONES */}
          {activeTab === "zones" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    Configured Security Zones
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Spatial perimeter boundaries defined for {cameraConfig.friendly_name || cameraName}.
                  </p>
                </div>
                <Link to="/zones">
                  <Button
                    size="sm"
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                  >
                    <LuExternalLink className="mr-1.5 size-3.5" />
                    Open Security Zone Editor
                  </Button>
                </Link>
              </div>

              {configuredZones.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
                  <LuMapPin className="mx-auto size-8 text-slate-600 mb-2" />
                  <h4 className="text-sm font-bold text-slate-300">
                    No Security Zones Defined
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    No spatial security zones are currently configured for this camera. Click above to define perimeter boundaries.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {configuredZones.map(([zoneName, zoneConfig]) => {
                    const pointCount = zoneConfig.coordinates
                      ? Array.isArray(zoneConfig.coordinates)
                        ? zoneConfig.coordinates.length
                        : zoneConfig.coordinates.split(",").length / 2
                      : 0;

                    return (
                      <div
                        key={zoneName}
                        className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="font-bold text-sky-400 text-sm flex items-center gap-1.5">
                            <LuMapPin className="size-4 text-amber-400" />
                            {zoneName.toUpperCase().replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                            {pointCount} Vertices
                          </span>
                        </div>

                        <div className="text-xs space-y-1 text-slate-400">
                          <div>
                            <span className="font-semibold text-slate-300">Objects: </span>
                            {zoneConfig.objects?.join(", ") || "All tracked objects"}
                          </div>
                          {zoneConfig.inertia && (
                            <div>
                              <span className="font-semibold text-slate-300">Inertia: </span>
                              {zoneConfig.inertia} frames
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RECORDING POLICY */}
          {activeTab === "recording" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">
                      Evidence Storage & Retention
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Automated recording retention policy and evidence archiving settings.
                    </p>
                  </div>
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-bold border",
                      isRecordON
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/30",
                    )}
                  >
                    Recording {isRecordON ? "ACTIVE" : "DISABLED"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1 font-semibold">
                      Retention Days:
                    </span>
                    <span className="text-sky-400 font-bold text-sm">
                      {cameraConfig.record?.retain?.days ?? 7} Days
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1 font-semibold">
                      Continuous Recording Mode:
                    </span>
                    <span className="text-slate-200 font-bold capitalize">
                      {cameraConfig.record?.detections?.retain?.mode || cameraConfig.record?.alerts?.retain?.mode || "Active"}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <Link to="/export">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold"
                    >
                      <LuExternalLink className="mr-1.5 size-3.5 text-amber-400" />
                      Manage Evidence Exports
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SYSTEM & HEALTH */}
          {activeTab === "health" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
                  <LuActivity className="size-4 text-sky-400" />
                  Processing Pipeline Health Diagnostics
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1 font-semibold">
                      RTSP Ingestion Source:
                    </span>
                    <code className="text-sky-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 block truncate">
                      {cameraConfig.ffmpeg?.inputs?.[0]?.path || "RTSP Stream configured"}
                    </code>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1 font-semibold">
                      FFmpeg Process ID (PID):
                    </span>
                    <span className="text-slate-200 font-mono font-bold">
                      {camStats?.ffmpeg_pid || "Not running"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1 font-semibold">
                      Detector Process ID (PID):
                    </span>
                    <span className="text-slate-200 font-mono font-bold">
                      {camStats?.pid || "Not running"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1 font-semibold">
                      Pipeline Status:
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {isOnline ? "Healthy (Ingesting)" : "Degraded / Offline"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: RECENT INCIDENTS */}
          {activeTab === "incidents" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <FaShieldAlt className="size-4 text-amber-400" />
                  Camera Security Incidents
                </h3>
                <Link to={`/review?cameras=${cameraName}`}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-sky-400 hover:text-sky-300"
                  >
                    View All Incidents →
                  </Button>
                </Link>
              </div>

              {!recentIncidents || recentIncidents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
                  <FaShieldAlt className="mx-auto size-8 text-slate-600 mb-2" />
                  <h4 className="text-sm font-bold text-slate-300">
                    No Recent Incidents Recorded
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    This camera has no active or archived security incidents logged in the system.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recentIncidents.map((inc) => {
                    const severity = getIncidentSeverity(inc);
                    const severityStyle = getSeverityBadgeStyle(severity);
                    const detectionLabel = getIncidentDetectionLabel(
                      inc.data?.objects,
                      inc.data?.detections,
                    );
                    const thumbUrl = `${baseUrl}${inc.thumb_path.replace(
                      "/media/frigate/",
                      "",
                    )}`;

                    return (
                      <div
                        key={inc.id}
                        onClick={() => onSelectIncident?.(inc)}
                        className="group cursor-pointer rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 transition-all hover:border-sky-500/50 hover:bg-slate-900"
                      >
                        <div className="relative aspect-video w-full overflow-hidden rounded border border-slate-800 bg-slate-950 mb-2">
                          <img
                            src={thumbUrl}
                            alt={detectionLabel}
                            className="size-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span
                            className={cn(
                              "absolute top-1.5 right-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold border",
                              severityStyle.bg,
                              severityStyle.text,
                              severityStyle.border,
                            )}
                          >
                            {severity}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-200 truncate">
                          {detectionLabel}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
                          <span className="flex items-center gap-1">
                            <LuClock className="size-3 text-slate-500" />
                            {new Date(inc.start_time * 1000).toLocaleTimeString()}
                          </span>
                          <span className="text-sky-400 font-semibold">Investigate →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
