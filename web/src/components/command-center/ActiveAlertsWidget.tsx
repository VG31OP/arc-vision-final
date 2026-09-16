import { useAllowedCameras } from "@/hooks/use-allowed-cameras";
import { ReviewSegment } from "@/types/review";
import { generateSecurityAlerts } from "@/utils/intelligence/alertRules";
import { getPriorityStyle } from "@/utils/intelligence/incidentRules";
import {
  isAlertAudioMuted,
  playAlertNotificationSound,
  setAlertAudioMuted,
} from "@/utils/intelligence/notificationAudio";
import { useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaEye, FaShieldAlt } from "react-icons/fa";
import { LuBellRing, LuMapPin, LuVolume2, LuVolumeX } from "react-icons/lu";
import { Link } from "react-router-dom";
import useSWR from "swr";
import IncidentDetailModal from "../incidents/IncidentDetailModal";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";

export default function ActiveAlertsWidget() {
  const allowedCameras = useAllowedCameras();
  const [selectedIncidentDetail, setSelectedIncidentDetail] =
    useState<ReviewSegment | null>(null);
  const [muted, setMuted] = useState(isAlertAudioMuted());
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);

  const { data: reviewItems, mutate: reloadReviews } = useSWR<ReviewSegment[]>(
    ["review", { limit: 50 }],
  );

  const activeAlerts = useMemo(() => {
    if (!reviewItems) return [];
    const alerts = generateSecurityAlerts(reviewItems, [], acknowledgedIds);
    return alerts
      .filter(
        (a) =>
          allowedCameras.includes(a.camera) &&
          a.status === "ACTIVE" &&
          (a.priority === "CRITICAL" || a.priority === "HIGH"),
      )
      .slice(0, 3);
  }, [reviewItems, allowedCameras, acknowledgedIds]);

  // Trigger subtle audio notification for newly arriving high priority alert
  useEffect(() => {
    if (activeAlerts.length > 0) {
      const topAlert = activeAlerts[0];
      playAlertNotificationSound(topAlert.incidentId, topAlert.priority);
    }
  }, [activeAlerts]);

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
      toast.success("Alert & Incident Resolved", { position: "top-center" });
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
      toast.error("Failed to open incident details");
    }
  };

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-5 shadow-lg font-mono">
      <div className="mb-4 flex items-center justify-between border-b border-rose-900/40 pb-3">
        <div className="flex items-center gap-2">
          <LuBellRing className="size-4 text-rose-400 animate-pulse" />
          <h2 className="text-sm font-bold text-rose-300 uppercase tracking-wider">
            HIGH PRIORITY ACTIVE ALERTS ({activeAlerts.length})
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            title={muted ? "Unmute alert sounds" : "Mute alert sounds"}
          >
            {muted ? (
              <LuVolumeX className="size-3.5 text-rose-400" />
            ) : (
              <LuVolume2 className="size-3.5 text-emerald-400" />
            )}
            <span className="text-[10px]">{muted ? "MUTED" : "AUDIO ON"}</span>
          </button>

          <Link
            to="/alerts"
            className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            View Alert Center →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {activeAlerts.map((alert) => {
          const priorityStyle = getPriorityStyle(alert.priority);

          return (
            <div
              key={alert.id}
              className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-2 shadow-md hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
                  >
                    <span className={`size-1.5 rounded-full ${priorityStyle.dot}`} />
                    {alert.priority}
                  </span>

                  <span className="text-[10px] text-slate-400">
                    <FormattedAlertTime timestamp={alert.timestamp} />
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-100 truncate mb-1">
                  {alert.detection}
                </h4>

                <p className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800 line-clamp-2">
                  {alert.reason}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-semibold text-slate-300">
                    <FaShieldAlt className="size-3 text-sky-400" />
                    {alert.camera.toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <LuMapPin className="size-3" />
                    {alert.zone}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openIncidentInvestigation(alert.incidentId)}
                    className="h-6 flex-1 text-[10px] px-2 font-bold bg-sky-950/60 text-sky-400 hover:bg-sky-900/60"
                  >
                    <FaEye className="mr-1 size-2.5" />
                    INVESTIGATE
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => handleAcknowledge(alert.id, e)}
                    className="h-6 text-[10px] px-2 font-semibold border-slate-800 bg-slate-900 text-amber-400 hover:bg-slate-800"
                  >
                    ACK
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => handleResolve(alert.incidentId, e)}
                    className="h-6 text-[10px] px-2 font-semibold border-slate-800 bg-slate-900 text-emerald-400 hover:bg-slate-800"
                  >
                    <FaCheckCircle className="mr-1 size-2.5" />
                    RESOLVE
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <IncidentDetailModal
        event={selectedIncidentDetail}
        isOpen={Boolean(selectedIncidentDetail)}
        onClose={() => setSelectedIncidentDetail(null)}
        onRefresh={reloadReviews}
      />
    </div>
  );
}

function FormattedAlertTime({ timestamp }: { timestamp: number }) {
  const formatted = useFormattedTimestamp(timestamp, "HH:mm:ss");
  return <span>{formatted}</span>;
}
