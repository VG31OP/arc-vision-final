import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FrigateConfig } from "@/types/frigateConfig";
import { ReviewSegment } from "@/types/review";
import { useMemo } from "react";
import { FaShieldAlt } from "react-icons/fa";
import { LuChevronRight, LuMapPin } from "react-icons/lu";
import { Link } from "react-router-dom";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";

interface ZoneStatus {
  name: string;
  cameraName: string;
  activeIncidents: number;
  recentDetections: number;
  isRestricted: boolean;
}

export default function ZoneActivityWidget() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { data: reviews } = useSWR<ReviewSegment[]>([
    "review",
    { limit: 50 },
  ]);

  const zoneList = useMemo<ZoneStatus[]>(() => {
    if (!config?.cameras) return [];

    const zones: ZoneStatus[] = [];

    Object.entries(config.cameras).forEach(([camName, cam]) => {
      if (!cam.enabled_in_config || !cam.zones) return;

      Object.keys(cam.zones).forEach((zoneName) => {
        const lowerName = zoneName.toLowerCase();
        const isRestricted =
          lowerName.includes("restricted") ||
          lowerName.includes("secure") ||
          lowerName.includes("danger") ||
          lowerName.includes("vault") ||
          lowerName.includes("no_entry");

        // Count matching review events for this camera and zone
        let activeIncidents = 0;
        let recentDetections = 0;

        if (reviews) {
          reviews.forEach((r) => {
            if (r.camera === camName && r.data?.zones?.includes(zoneName)) {
              recentDetections += 1;
              if (!r.has_been_reviewed) {
                activeIncidents += 1;
              }
            }
          });
        }

        zones.push({
          name: zoneName,
          cameraName: camName,
          activeIncidents,
          recentDetections,
          isRestricted,
        });
      });
    });

    return zones.sort((a, b) => b.activeIncidents - a.activeIncidents);
  }, [config, reviews]);

  if (zoneList.length === 0) {
    return null;
  }

  return (
    <Card className="border border-border/60 bg-card/60 backdrop-blur-sm font-mono">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4 border-b border-border/40">
        <div className="flex items-center space-x-2">
          <LuMapPin className="size-4 text-amber-400" />
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground">
            SECURITY ZONE ACTIVITY ({zoneList.length})
          </CardTitle>
        </div>
        <Link
          to="/zones"
          className="flex items-center text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
        >
          SECURITY ZONES
          <LuChevronRight className="ml-1 size-3" />
        </Link>
      </CardHeader>

      <CardContent className="px-4 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {zoneList.slice(0, 6).map((zone) => {
            const hasAlerts = zone.activeIncidents > 0;

            return (
              <div
                key={`${zone.cameraName}-${zone.name}`}
                className={`flex flex-col justify-between rounded-lg border p-3 transition-colors ${
                  hasAlerts
                    ? "border-amber-800/60 bg-amber-950/20 hover:border-amber-700"
                    : "border-border/40 bg-background/40 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-bold text-xs text-slate-100 uppercase tracking-wide">
                        {zone.name.replace(/_/g, " ")}
                      </span>
                      {zone.isRestricted && (
                        <Badge
                          variant="outline"
                          className="border-rose-500/40 bg-rose-500/10 text-rose-400 text-[9px] px-1 py-0"
                        >
                          RESTRICTED
                        </Badge>
                      )}
                    </div>

                    <p className="text-[10px] text-muted-foreground capitalize flex items-center gap-1">
                      <FaShieldAlt className="size-2.5 text-sky-400" />
                      CAM: {zone.cameraName.replace(/_/g, " ").toUpperCase()}
                    </p>
                  </div>

                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      hasAlerts
                        ? "bg-rose-950 text-rose-400 border border-rose-800"
                        : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    }`}
                  >
                    {hasAlerts ? `${zone.activeIncidents} ACTIVE` : "CLEAR"}
                  </span>
                </div>

                <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Activity: {zone.recentDetections} events</span>
                  <Link
                    to={`/review?zones=${zone.name}`}
                    className="text-sky-400 hover:text-sky-300 font-semibold"
                  >
                    Inspect Zone →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
