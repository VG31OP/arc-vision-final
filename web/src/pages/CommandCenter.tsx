import { useMemo } from "react";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { FrigateStats } from "@/types/stats";
import { useFrigateStats, useFrigateReviews } from "@/api/ws";
import { getSystemOperationalStatus } from "@/utils/systemStatus";
import OperationsOverview from "@/components/command-center/OperationsOverview";
import CameraHealth from "@/components/command-center/CameraHealth";
import ActiveIncidents from "@/components/command-center/ActiveIncidents";
import ActivityTimeline from "@/components/command-center/ActivityTimeline";
import QuickActions from "@/components/command-center/QuickActions";
import ActiveAlertsWidget from "@/components/command-center/ActiveAlertsWidget";
import ZoneActivityWidget from "@/components/command-center/ZoneActivityWidget";
import LiveDashboardView from "@/views/live/LiveDashboardView";
import { useAllowedCameras } from "@/hooks/use-allowed-cameras";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@/config/branding";
export default function CommandCenter() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { data: initialStats } = useSWR<FrigateStats>("stats");
  const liveStats = useFrigateStats();
  const stats = liveStats || initialStats;
  useFrigateReviews();

  const allowedCameras = useAllowedCameras();

  const cameras = useMemo(() => {
    if (!config) return [];
    return Object.values(config.cameras)
      .filter((conf) => conf.ui.dashboard && conf.enabled_in_config)
      .filter((cam) => allowedCameras.includes(cam.name))
      .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
  }, [config, allowedCameras]);

  // Evaluate dynamic operational status using shared system status utility
  const systemStatus = useMemo(() => {
    const health = getSystemOperationalStatus(stats, config);
    switch (health.overallState) {
      case "OFFLINE":
        return { label: "SYSTEM OFFLINE", color: "rose" };
      case "ATTENTION REQUIRED":
        return { label: "ATTENTION REQUIRED", color: "rose" };
      case "DEGRADED":
        return { label: "SYSTEM DEGRADED", color: "amber" };
      case "OPERATIONAL":
        return { label: "SYSTEM OPERATIONAL", color: "emerald" };
      default:
        return { label: "SYSTEM UNKNOWN", color: "amber" };
    }
  }, [config, stats]);

  return (
    <div className="scrollbar-container size-full select-none overflow-y-auto p-4 md:p-6 space-y-6 bg-background font-mono">
      {/* COMMAND CENTER HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              {BRAND.name} COMMAND CENTER
            </h1>
            <Badge
              variant="outline"
              className={`font-mono text-xs px-2.5 py-0.5 font-semibold ${
                systemStatus.color === "emerald"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : systemStatus.color === "amber"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-400"
              }`}
            >
              <span className="mr-1.5 inline-block size-1.5 rounded-full bg-current animate-pulse" />
              {systemStatus.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {BRAND.descriptor} — {BRAND.tagline}
          </p>
        </div>

        <QuickActions />
      </div>

      {/* ACTIVE HIGH PRIORITY ALERTS */}
      <ActiveAlertsWidget />

      {/* OPERATIONAL KPI OVERVIEW */}
      <OperationsOverview />

      {/* LIVE OVERVIEW GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            LIVE SURVEILLANCE OVERVIEW
          </h2>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-2 overflow-hidden shadow-sm">
          <LiveDashboardView
            cameras={cameras.slice(0, 4)}
            cameraGroup="default"
            includeBirdseye={false}
            onSelectCamera={() => {}}
            fullscreen={false}
            toggleFullscreen={() => {}}
          />
        </div>
      </div>

      {/* INCIDENTS & CAMERA HEALTH GRID */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActiveIncidents />
        <CameraHealth />
      </div>

      {/* SECURITY ZONE ACTIVITY */}
      <ZoneActivityWidget />

      {/* ACTIVITY TIMELINE */}
      <ActivityTimeline />
    </div>
  );
}
