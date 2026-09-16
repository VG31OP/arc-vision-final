import { useMemo } from "react";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { FrigateStats } from "@/types/stats";
import { useFrigateStats } from "@/api/ws";
import {
  getSystemOperationalStatus,
  OperationalState,
  ServiceHealthState,
} from "@/utils/systemStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LuActivity,
  LuTriangleAlert,
  LuCircleCheck,
  LuCpu,
  LuHardDrive,
  LuServer,
  LuShieldAlert,
  LuSlidersHorizontal,
  LuVideo,
  LuWrench,
} from "react-icons/lu";
import { Link } from "react-router-dom";

export default function SystemDiagnostics() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { data: initialStats } = useSWR<FrigateStats>("stats");
  const liveStats = useFrigateStats();
  const stats = liveStats || initialStats;

  const health = useMemo(
    () => getSystemOperationalStatus(stats, config, true),
    [stats, config],
  );

  const getStatusBadge = (state: OperationalState) => {
    switch (state) {
      case "OPERATIONAL":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 px-3 py-1 text-xs font-semibold">
            <LuCircleCheck className="size-4 text-emerald-400" />
            OPERATIONAL
          </Badge>
        );
      case "DEGRADED":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center gap-1.5 px-3 py-1 text-xs font-semibold">
            <LuTriangleAlert className="size-4 text-amber-400" />
            DEGRADED
          </Badge>
        );
      case "ATTENTION REQUIRED":
        return (
          <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 flex items-center gap-1.5 px-3 py-1 text-xs font-semibold">
            <LuShieldAlert className="size-4 text-rose-400" />
            ATTENTION REQUIRED
          </Badge>
        );
      case "OFFLINE":
        return (
          <Badge className="bg-red-950 text-red-400 border-red-800 flex items-center gap-1.5 px-3 py-1 text-xs font-semibold">
            <LuShieldAlert className="size-4 text-red-500" />
            OFFLINE
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground flex items-center gap-1.5 px-3 py-1 text-xs font-semibold">
            UNKNOWN
          </Badge>
        );
    }
  };

  const getServiceBadge = (state: ServiceHealthState) => {
    switch (state) {
      case "RUNNING":
        return (
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
            RUNNING
          </Badge>
        );
      case "DEGRADED":
        return (
          <Badge variant="outline" className="border-amber-500/40 text-amber-400">
            DEGRADED
          </Badge>
        );
      case "STOPPED":
      case "UNAVAILABLE":
        return (
          <Badge variant="outline" className="border-rose-500/40 text-rose-400">
            STOPPED
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-muted-foreground">UNKNOWN</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Operational Overview Card */}
      <Card className="border-border/50 bg-background_alt">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold text-foreground">
                  ARC VISION System Health Center
                </CardTitle>
                {getStatusBadge(health.overallState)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {health.statusMessage}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/settings?page=system">
                  <LuSlidersHorizontal className="mr-1.5 size-3.5" />
                  Configuration Center
                </Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link to="/logs">
                  <LuServer className="mr-1.5 size-3.5" />
                  System Logs
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-xs font-medium">Camera Fleet</span>
                <LuVideo className="size-4 text-sky-400" />
              </div>
              <div className="text-xl font-bold font-mono text-foreground">
                {health.metrics.onlineCameras} / {health.metrics.totalCameras}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {health.metrics.offlineCameras > 0
                  ? `${health.metrics.offlineCameras} Offline`
                  : "All Online"}
              </p>
            </div>

            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-xs font-medium">Detector Rate</span>
                <LuActivity className="size-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold font-mono text-foreground">
                {health.metrics.detectorFps.toFixed(1)}{" "}
                <span className="text-xs font-normal text-muted-foreground">FPS</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Real-Time Hardware Acceleration
              </p>
            </div>

            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-xs font-medium">Host CPU</span>
                <LuCpu className="size-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold font-mono text-foreground">
                {health.metrics.cpuUsage !== null
                  ? `${health.metrics.cpuUsage.toFixed(0)}%`
                  : "N/A"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Processing Health
              </p>
            </div>

            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-xs font-medium">Storage & Media</span>
                <LuHardDrive className="size-4 text-purple-400" />
              </div>
              <div className="text-xl font-bold font-mono text-foreground">
                Active
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Evidence Storage Engine
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Service Health Grid */}
      <Card className="border-border/50 bg-background_alt">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <LuServer className="size-4 text-primary" />
            Core Surveillance Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {health.services.map((svc) => (
              <div
                key={svc.name}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 p-3"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {svc.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {svc.details}
                  </div>
                </div>
                <div>{getServiceBadge(svc.state)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. System Diagnostics & Operator Recovery Guidance */}
      <Card className="border-border/50 bg-background_alt">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <LuWrench className="size-4 text-amber-400" />
              Operational Diagnostics & Recovery Guidance
            </CardTitle>
            <Badge variant="outline" className="text-xs font-mono">
              {health.issues.length} Active Notice(s)
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {health.issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center rounded-lg border border-dashed border-border/60 bg-background/20">
              <LuCircleCheck className="size-8 text-emerald-400 mb-2" />
              <div className="text-sm font-medium text-foreground">
                All System Diagnostics Nominal
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                No active camera connectivity, stream health, detector, or storage anomalies detected.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {health.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-lg border border-border/50 bg-background/60 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="text-[10px] uppercase tracking-wider font-semibold"
                      >
                        {issue.category}
                      </Badge>
                      <span className="text-xs font-semibold text-foreground">
                        {issue.component}
                      </span>
                    </div>
                    <Badge
                      className={
                        issue.state === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-400 border-rose-500/30 text-[10px]"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]"
                      }
                    >
                      {issue.state}
                    </Badge>
                  </div>
                  <div className="text-xs font-medium text-foreground">
                    {issue.problem}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono bg-background/80 p-1.5 rounded border border-border/30">
                    {issue.details}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-sky-400 pt-1 border-t border-border/30">
                    <LuWrench className="size-3.5 flex-shrink-0" />
                    <span className="font-medium">Operator Guidance:</span>
                    <span>{issue.recoveryAction}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
