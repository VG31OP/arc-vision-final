import ActivityIndicator from "@/components/indicators/activity-indicator";
import Heading from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { useAllowedCameras } from "@/hooks/use-allowed-cameras";
import { cn } from "@/lib/utils";
import { FrigateConfig } from "@/types/frigateConfig";
import { ReviewSegment } from "@/types/review";
import { FrigateStats } from "@/types/stats";
import {
  calculateCameraAnalytics,
  calculateDetectionDistribution,
  calculateHourlyTrend,
  calculatePeakActivityWindow,
  calculateZoneAnalytics,
  extractSystemProcessingHealth,
} from "@/utils/intelligence/analytics";
import { useMemo, useState } from "react";
import {
  FaChartBar,
  FaCheckCircle,
  FaClock,
  FaVideo,
} from "react-icons/fa";
import { LuMapPin, LuLayers, LuActivity, LuHardDrive, LuCpu } from "react-icons/lu";
import useSWR from "swr";

export default function Analytics() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { data: stats } = useSWR<FrigateStats>("stats");
  const allowedCameras = useAllowedCameras();

  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h");

  const limit = timeRange === "24h" ? 200 : timeRange === "7d" ? 500 : 1000;
  const { data: reviewItems } = useSWR<ReviewSegment[]>([
    "review",
    { limit },
  ]);

  const configuredCameras = useMemo(() => {
    if (!config?.cameras) return [];
    return Object.keys(config.cameras).filter((c) => allowedCameras.includes(c));
  }, [config, allowedCameras]);

  const filteredReviewItems = useMemo(() => {
    if (!reviewItems) return [];
    return reviewItems.filter((item) => allowedCameras.includes(item.camera));
  }, [reviewItems, allowedCameras]);

  const hourlyTrends = useMemo(() => {
    return calculateHourlyTrend(filteredReviewItems);
  }, [filteredReviewItems]);

  const maxHourlyCount = useMemo(() => {
    return Math.max(...hourlyTrends.map((h) => h.count), 1);
  }, [hourlyTrends]);

  const cameraAnalytics = useMemo(() => {
    return calculateCameraAnalytics(filteredReviewItems, configuredCameras);
  }, [filteredReviewItems, configuredCameras]);

  const zoneAnalytics = useMemo(() => {
    return calculateZoneAnalytics(filteredReviewItems);
  }, [filteredReviewItems]);

  const detectionDistribution = useMemo(() => {
    return calculateDetectionDistribution(filteredReviewItems);
  }, [filteredReviewItems]);

  const peakWindow = useMemo(() => {
    return calculatePeakActivityWindow(filteredReviewItems);
  }, [filteredReviewItems]);

  const healthMetrics = useMemo(() => {
    return extractSystemProcessingHealth(stats);
  }, [stats]);

  if (!config) {
    return (
      <div className="flex size-full items-center justify-center bg-background">
        <ActivityIndicator />
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col overflow-y-auto bg-background p-6 font-mono text-slate-100">
      {/* Header Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-sky-800/80 bg-sky-950/50 text-sky-400">
            <FaChartBar className="size-5" />
          </div>
          <div>
            <Heading as="h1" className="text-xl font-bold text-slate-100">
              OPERATIONAL ANALYTICS
            </Heading>
            <p className="text-xs text-slate-400">
              Real-time threat trends, zone metrics, and detection processing health
            </p>
          </div>
        </div>

        {/* Time Filters */}
        <div className="flex items-center gap-2">
          {(["24h", "7d", "30d"] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={`h-8 text-xs font-bold ${
                timeRange === range
                  ? "bg-sky-600 hover:bg-sky-500 text-white"
                  : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {range === "24h" ? "Last 24 Hours" : range === "7d" ? "Last 7 Days" : "Last 30 Days"}
            </Button>
          ))}
        </div>
      </div>

      {/* Executive Counters Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800/80 bg-background_alt p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            TOTAL INCIDENTS ({timeRange.toUpperCase()})
          </span>
          <span className="text-2xl font-bold text-sky-400">
            {filteredReviewItems.length}
          </span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-background_alt p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
            <FaClock className="size-3 text-amber-400" />
            PEAK ACTIVITY WINDOW
          </span>
          <span className="text-base font-bold text-amber-400">
            {peakWindow.windowLabel}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            ({peakWindow.count} incidents)
          </span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-background_alt p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            DETECTOR INFERENCE
          </span>
          <span className="text-2xl font-bold text-emerald-400">
            {healthMetrics.avgInferenceMs} <span className="text-xs font-normal">ms</span>
          </span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-background_alt p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            DETECTION PIPELINE
          </span>
          <span className="text-2xl font-bold text-cyan-400">
            {healthMetrics.detectionFps} <span className="text-xs font-normal">FPS</span>
          </span>
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-6">
        {/* Hourly Trend Chart (Span 2) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800/80 bg-background_alt p-5 shadow-lg flex flex-col justify-between">
          <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <LuActivity className="size-4 text-sky-400" />
              24-Hour Incident Distribution Trend
            </h3>
            <span className="text-[11px] text-slate-400">
              Peak: {maxHourlyCount} inc/hr
            </span>
          </div>

          {/* Bar Chart Canvas Container */}
          <div className="flex h-52 items-end gap-1.5 pt-4 pb-2 border-b border-slate-800/60">
            {hourlyTrends.map((h, i) => {
              const heightPct = Math.round((h.count / maxHourlyCount) * 100);

              return (
                <div key={i} className="group relative flex flex-1 flex-col items-center h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 hidden group-hover:flex flex-col items-center rounded bg-slate-900 border border-slate-700 px-2 py-1 text-[10px] text-slate-200 shadow-xl z-20 whitespace-nowrap">
                    <span>{h.hourLabel}: {h.count} incidents</span>
                    {h.criticalCount > 0 && (
                      <span className="text-rose-400 font-bold">
                        {h.criticalCount} high priority
                      </span>
                    )}
                  </div>

                  {/* Bar Element */}
                  <div
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                    className={cn(
                      "w-full rounded-t transition-all duration-300",
                      h.criticalCount > 0
                        ? "bg-gradient-to-t from-sky-600 to-rose-500"
                        : h.count > 0
                        ? "bg-sky-600 hover:bg-sky-500"
                        : "bg-slate-800/40",
                    )}
                  />
                </div>
              );
            })}
          </div>

          {/* X Axis Labels */}
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2">
            <span>00:00</span>
            <span>04:00</span>
            <span>08:00</span>
            <span>12:00</span>
            <span>16:00</span>
            <span>20:00</span>
            <span>23:00</span>
          </div>
        </div>

        {/* Object Detection Categories */}
        <div className="rounded-xl border border-slate-800/80 bg-background_alt p-5 shadow-lg flex flex-col justify-between">
          <div className="mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <LuLayers className="size-4 text-amber-400" />
              Detection Class Distribution
            </h3>
          </div>

          <div className="space-y-4">
            {detectionDistribution.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-300">{item.label}</span>
                  <span className="text-slate-400 font-mono">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800">
                  <div
                    style={{ width: `${item.percentage}%` }}
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      item.label === "Person"
                        ? "bg-rose-500"
                        : item.label === "Vehicle"
                        ? "bg-amber-500"
                        : item.label === "Animal"
                        ? "bg-emerald-500"
                        : "bg-sky-500",
                    )}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
            Calculated from real object detection classifications.
          </div>
        </div>
      </div>

      {/* Row 2: Camera & Zone Activity + Processing Health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Camera Activity Distribution */}
        <div className="rounded-xl border border-slate-800/80 bg-background_alt p-5 shadow-lg">
          <div className="mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <FaVideo className="size-3.5 text-sky-400" />
              Camera Activity Distribution
            </h3>
          </div>

          <div className="space-y-3">
            {cameraAnalytics.map((c) => (
              <div key={c.camera} className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-200">
                    {c.camera.toUpperCase()}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {c.count} incidents ({c.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                  <div
                    style={{ width: `${c.percentage}%` }}
                    className="h-full rounded-full bg-sky-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zone Activity Distribution */}
        <div className="rounded-xl border border-slate-800/80 bg-background_alt p-5 shadow-lg">
          <div className="mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <LuMapPin className="size-4 text-amber-400" />
              Security Zone Frequency
            </h3>
          </div>

          <div className="space-y-3">
            {zoneAnalytics.length === 0 ? (
              <div className="text-xs text-slate-500">No zone events recorded.</div>
            ) : (
              zoneAnalytics.map((z) => (
                <div key={z.zone} className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-200">{z.zone}</span>
                    <span className="text-slate-400 font-mono">
                      {z.count} events ({z.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      style={{ width: `${z.percentage}%` }}
                      className="h-full rounded-full bg-amber-500"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Processing & System Health */}
        <div className="rounded-xl border border-slate-800/80 bg-background_alt p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <LuCpu className="size-4 text-emerald-400" />
                Processing Engine Health
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Detection Engine</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <FaCheckCircle className="size-3" /> OPERATIONAL
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Camera Streams</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {healthMetrics.onlineCameraCount} / {healthMetrics.cameraCount} Online
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Camera Input Pipeline</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {healthMetrics.cameraFps} FPS
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Inference Speed</span>
                <span className="font-bold text-sky-400 font-mono">
                  {healthMetrics.avgInferenceMs} ms
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <LuHardDrive className="size-3 text-slate-400" /> System Uptime
                </span>
                <span className="font-semibold text-slate-300 font-mono">
                  {healthMetrics.uptimeHours} hours
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
