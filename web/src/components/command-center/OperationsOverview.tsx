import { Card, CardContent } from "@/components/ui/card";
import { FrigateConfig } from "@/types/frigateConfig";
import { FrigateStats } from "@/types/stats";
import { LuCamera, LuShieldAlert, LuCpu, LuDisc } from "react-icons/lu";
import useSWR from "swr";
import { useFrigateStats } from "@/api/ws";
import { ReviewSegment } from "@/types/review";

export default function OperationsOverview() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { data: initialStats } = useSWR<FrigateStats>("stats");
  const liveStats = useFrigateStats();
  const stats = liveStats || initialStats;

  const { data: reviews } = useSWR<ReviewSegment[]>([
    "review",
    { limit: 50, reviewed: 0 },
  ]);

  const totalCameras = config ? Object.keys(config.cameras).length : 0;
  const activeCameras = config
    ? Object.values(config.cameras).filter((c) => c.enabled_in_config).length
    : 0;

  const incidentsToday = reviews ? reviews.length : 0;

  // Detection speed / status check
  const detectionStatus = stats?.detectors
    ? "ACTIVE"
    : stats?.gpu_usages
      ? "GPU ACCELERATED"
      : "ACTIVE (CPU)";

  const recordingActive = config
    ? Object.values(config.cameras).some((c) => c.record.enabled)
    : false;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 font-mono">
      {/* CAMERAS ONLINE */}
      <Card className="border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
        <CardContent className="flex items-center justify-between p-0">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              CAMERAS ONLINE
            </p>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {activeCameras}
              </span>
              <span className="text-xs text-muted-foreground">
                / {totalCameras} TOTAL
              </span>
            </div>
          </div>
          <div className="rounded-xl bg-sky-500/10 p-3 text-sky-400">
            <LuCamera className="size-5" />
          </div>
        </CardContent>
      </Card>

      {/* ACTIVE INCIDENTS */}
      <Card className="border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
        <CardContent className="flex items-center justify-between p-0">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              INCIDENTS TODAY
            </p>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold tracking-tight text-amber-400">
                {incidentsToday}
              </span>
              <span className="text-xs text-muted-foreground">UNREVIEWED</span>
            </div>
          </div>
          <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
            <LuShieldAlert className="size-5" />
          </div>
        </CardContent>
      </Card>

      {/* DETECTION ENGINE */}
      <Card className="border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
        <CardContent className="flex items-center justify-between p-0">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              DETECTION ENGINE
            </p>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
                </span>
                {detectionStatus}
              </span>
            </div>
          </div>
          <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
            <LuCpu className="size-5" />
          </div>
        </CardContent>
      </Card>

      {/* RECORDING ENGINE */}
      <Card className="border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
        <CardContent className="flex items-center justify-between p-0">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              RECORDING RETENTION
            </p>
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                  recordingActive ? "text-sky-400" : "text-muted-foreground"
                }`}
              >
                {recordingActive ? "ACTIVE" : "STANDBY"}
              </span>
            </div>
          </div>
          <div className="rounded-xl bg-sky-500/10 p-3 text-sky-400">
            <LuDisc className="size-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
