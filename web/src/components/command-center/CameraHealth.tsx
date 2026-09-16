import { FrigateConfig } from "@/types/frigateConfig";
import { FrigateStats } from "@/types/stats";
import useSWR from "swr";
import { useFrigateStats } from "@/api/ws";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LuActivity } from "react-icons/lu";
import { useState } from "react";
import CameraDetailModal from "@/components/camera/CameraDetailModal";
import { ReviewSegment } from "@/types/review";

export default function CameraHealth() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { data: initialStats } = useSWR<FrigateStats>("stats");
  const liveStats = useFrigateStats();
  const stats = liveStats || initialStats;

  const { data: reviews } = useSWR<ReviewSegment[]>([
    "review",
    { limit: 50, reviewed: 0 },
  ]);

  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);

  if (!config) return null;

  const cameras = Object.values(config.cameras).filter(
    (c) => c.enabled_in_config,
  );

  return (
    <>
      <Card className="border border-border/60 bg-card/60 backdrop-blur-sm font-mono">
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
          <div className="flex items-center space-x-2">
            <LuActivity className="size-4 text-sky-400" />
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground">
              CAMERA STATUS WALL
            </CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">
            {cameras.length} CAMERAS MONITORED
          </span>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="divide-y divide-border/40 overflow-hidden rounded-lg border border-border/40 bg-background/40">
            {cameras.map((camera) => {
              const camStats = stats?.cameras?.[camera.name];
              const fps = camStats?.camera_fps
                ? Math.round(camStats.camera_fps)
                : 0;
              const processFps = camStats?.process_fps
                ? Math.round(camStats.process_fps)
                : 0;
              const skippedFps = camStats?.skipped_fps || 0;

              let statusLabel = "OFFLINE";
              let statusColor = "rose";

              if (!stats) {
                statusLabel = "CONNECTING";
                statusColor = "amber";
              } else if (fps > 0) {
                if (skippedFps > 5 || processFps === 0) {
                  statusLabel = "DEGRADED";
                  statusColor = "amber";
                } else {
                  statusLabel = "ONLINE";
                  statusColor = "emerald";
                }
              }

              // Active alerts for this camera
              const cameraActiveAlerts = reviews
                ? reviews.filter((r) => r.camera === camera.name).length
                : 0;

              return (
                <div
                  key={camera.name}
                  onClick={() => setSelectedCamera(camera.name)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2.5 text-xs transition-colors hover:bg-sky-500/10 cursor-pointer group gap-2"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`size-2.5 rounded-full ${
                        statusColor === "emerald"
                          ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse"
                          : statusColor === "amber"
                          ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                          : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground capitalize group-hover:text-sky-400 transition-colors">
                          {camera.name.replace(/_/g, " ")}
                        </p>
                        {cameraActiveAlerts > 0 && (
                          <Badge className="bg-rose-950 text-rose-400 border border-rose-800 text-[9px] px-1 py-0 font-bold">
                            {cameraActiveAlerts} ALERTS
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {camera.detect.width}x{camera.detect.height} • DET:{" "}
                        {camera.detect.enabled ? "ON" : "OFF"} • REC:{" "}
                        {camera.record.enabled ? "ON" : "OFF"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3">
                    <div className="text-right">
                      <p className="font-mono text-xs font-semibold text-foreground">
                        {fps} <span className="text-[10px] text-muted-foreground">FPS</span>
                      </p>
                      {processFps > 0 && (
                        <p className="text-[10px] text-emerald-400 font-semibold">
                          {processFps} DET/S
                        </p>
                      )}
                    </div>

                    <Badge
                      variant="outline"
                      className={
                        statusColor === "emerald"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[10px]"
                          : statusColor === "amber"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400 font-mono text-[10px]"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30 font-mono text-[10px]"
                      }
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedCamera && (
        <CameraDetailModal
          cameraName={selectedCamera}
          isOpen={Boolean(selectedCamera)}
          onClose={() => setSelectedCamera(null)}
        />
      )}
    </>
  );
}

