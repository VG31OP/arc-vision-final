import { baseUrl } from "@/api/baseUrl";
import { useFormattedTimestamp, use24HourTime } from "@/hooks/use-date-utils";
import useImageLoaded from "@/hooks/use-image-loaded";
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
import axios from "axios";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  FaCompactDisc,
  FaShieldAlt,
  FaCheckCircle,
  FaArrowRight,
  FaCamera,
} from "react-icons/fa";
import { LuClock, LuMapPin } from "react-icons/lu";
import { toast } from "sonner";
import useSWR from "swr";
import ImageLoadingIndicator from "../indicators/ImageLoadingIndicator";
import { Button } from "../ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../ui/context-menu";

interface IncidentCardProps {
  event: ReviewSegment;
  isActive?: boolean;
  onSelect?: () => void;
  onOpenDetail?: () => void;
}

export default function IncidentCard({
  event,
  isActive = false,
  onSelect,
  onOpenDetail,
}: IncidentCardProps) {
  const { t } = useTranslation(["views/events", "common"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();
  const is24Hour = use24HourTime(config);

  const formattedTime = useFormattedTimestamp(
    event.start_time,
    is24Hour ? "HH:mm:ss" : "h:mm:ss a",
    config?.ui.timezone,
  );

  const formattedDate = useFormattedTimestamp(
    event.start_time,
    "MMM d, yyyy",
    config?.ui.timezone,
  );

  const severity = getIncidentSeverity(event);
  const status = getIncidentStatus(event.has_been_reviewed, isActive);
  const severityStyle = getSeverityBadgeStyle(severity);
  const statusStyle = getStatusBadgeStyle(status);
  const detectionLabel = getIncidentDetectionLabel(
    event.data?.objects,
    event.data?.detections,
  );
  const zoneLabel = getIncidentZoneLabel(event.data?.zones);
  const cameraDisplayName =
    config?.cameras[event.camera]?.name || event.camera.toUpperCase();

  const handleMarkResolved = useCallback(
    async (e?: React.MouseEvent) => {
      e?.stopPropagation();
      try {
        await axios.post("reviews/viewed", { ids: [event.id] });
        event.has_been_reviewed = true;
        toast.success(t("markAsReviewed", "Incident marked as resolved"), {
          position: "top-center",
        });
      } catch (err) {
        toast.error("Failed to update incident status");
      }
    },
    [event, t],
  );

  const handleExportEvidence = useCallback(
    async (e?: React.MouseEvent) => {
      e?.stopPropagation();
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
          toast.success("Evidence export job submitted", {
            position: "top-center",
          });
        }
      } catch (err) {
        toast.error("Failed to export evidence");
      }
    },
    [event, cameraDisplayName, detectionLabel],
  );

  const cardContent = (
    <div
      onClick={() => {
        onSelect?.();
      }}
      className={cn(
        "group relative flex flex-col rounded-xl border bg-background_alt/90 p-4 font-mono shadow-md backdrop-blur-sm transition-all duration-200 hover:border-sky-500/50 hover:shadow-sky-950/20",
        isActive
          ? "border-sky-500 bg-sky-950/20 ring-1 ring-sky-500/50"
          : "border-slate-800/80 hover:bg-background_alt",
      )}
    >
      {/* Header Badges */}
      <div className="mb-3 flex items-center justify-between">
        {/* Status Badge */}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wider",
            statusStyle.bg,
            statusStyle.text,
            statusStyle.border,
          )}
        >
          <span className={cn("size-1.5 rounded-full", statusStyle.dot)} />
          {status}
        </span>

        {/* Severity Badge */}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wider",
            severityStyle.bg,
            severityStyle.text,
            severityStyle.border,
          )}
        >
          <FaShieldAlt className="size-2.5" />
          {severity}
        </span>
      </div>

      {/* Detection Title */}
      <div className="mb-2">
        <h3 className="text-sm font-bold text-slate-100 tracking-wide">
          {detectionLabel}
        </h3>
        {event.data.metadata?.confidence && (
          <span className="text-[11px] font-medium text-slate-400">
            {(event.data.metadata.confidence * 100).toFixed(0)}% confidence
          </span>
        )}
      </div>

      {/* Thumbnail Preview */}
      <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
        <ImageLoadingIndicator
          className="absolute inset-0"
          imgLoaded={imgLoaded}
        />
        <img
          ref={imgRef}
          src={`${baseUrl}${event.thumb_path.replace("/media/frigate/", "")}`}
          alt={detectionLabel}
          loading="lazy"
          onLoad={onImgLoad}
          className={cn(
            "size-full object-cover transition-transform duration-300 group-hover:scale-105",
            imgLoaded ? "opacity-100" : "opacity-0",
          )}
        />
      </div>

      {/* Camera & Zone Metadata */}
      <div className="mb-3 space-y-1 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <FaCamera className="size-3 text-sky-400" />
          <span>{cameraDisplayName}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <LuMapPin className="size-3 text-amber-400" />
          <span>{zoneLabel}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <LuClock className="size-3 text-slate-500" />
          <span>
            {formattedDate} · {formattedTime}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto flex items-center gap-2 pt-2 border-t border-slate-800/80">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail?.();
          }}
          className="flex-1 h-8 text-[11px] font-semibold border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 hover:text-white"
        >
          <FaCamera className="mr-1.5 size-3 text-sky-400" />
          SNAPSHOT
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail?.();
          }}
          className="flex-1 h-8 text-[11px] font-semibold bg-sky-600 hover:bg-sky-500 text-white"
        >
          REVIEW
          <FaArrowRight className="ml-1.5 size-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{cardContent}</ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-slate-900 border-slate-800 text-slate-200">
        <ContextMenuItem
          onClick={handleOpenDetail}
          className="cursor-pointer hover:bg-slate-800 text-xs"
        >
          <FaArrowRight className="mr-2 size-3 text-sky-400" />
          Investigate Incident
        </ContextMenuItem>
        <ContextMenuItem
          onClick={handleExportEvidence}
          className="cursor-pointer hover:bg-slate-800 text-xs"
        >
          <FaCompactDisc className="mr-2 size-3 text-amber-400" />
          Export Evidence
        </ContextMenuItem>
        {!event.has_been_reviewed && (
          <ContextMenuItem
            onClick={handleMarkResolved}
            className="cursor-pointer hover:bg-slate-800 text-xs text-emerald-400"
          >
            <FaCheckCircle className="mr-2 size-3 text-emerald-400" />
            Resolve Incident
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );

  function handleOpenDetail() {
    onOpenDetail?.();
  }
}
