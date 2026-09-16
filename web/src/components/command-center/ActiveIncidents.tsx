import { ReviewSegment } from "@/types/review";
import useSWR from "swr";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LuShieldAlert, LuChevronRight, LuCamera } from "react-icons/lu";
import { baseUrl } from "@/api/baseUrl";

export default function ActiveIncidents() {
  const { data: reviews } = useSWR<ReviewSegment[]>([
    "review",
    { limit: 8, reviewed: 0 },
  ]);

  return (
    <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
        <div className="flex items-center space-x-2">
          <LuShieldAlert className="size-4 text-amber-400" />
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground">
            ACTIVE INCIDENTS
          </CardTitle>
        </div>
        <Link
          to="/review"
          className="flex items-center text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
        >
          VIEW ALL INCIDENTS
          <LuChevronRight className="ml-1 size-3" />
        </Link>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {!reviews || reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-8 text-center">
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-400 mb-2">
              <LuShieldAlert className="size-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              No Active Incidents
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              The monitored environment is currently clear.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {reviews.slice(0, 5).map((review) => {
              const mainObject =
                review.data.objects?.[0] || review.data.audio?.[0] || "object";
              const cameraName = review.camera || "camera";
              const timestamp = new Date(review.start_time * 1000).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              const zones = review.data.zones || [];

              return (
                <Link
                  key={review.id}
                  to={`/review?id=${review.id}`}
                  className="group flex items-center justify-between rounded-lg border border-border/40 bg-background/40 p-2.5 transition-all hover:border-sky-500/40 hover:bg-sky-500/5"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative size-12 overflow-hidden rounded-md border border-border/60 bg-muted/40">
                      <img
                        src={`${baseUrl}api/events/${review.id}/thumbnail.jpg`}
                        alt={mainObject}
                        className="size-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/60 -z-10">
                        <LuCamera className="size-4 text-muted-foreground" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-foreground uppercase tracking-wide">
                          {mainObject} DETECTED
                        </span>
                        <Badge
                          variant="outline"
                          className="border-amber-500/30 bg-amber-500/10 text-amber-400 font-mono text-[9px] px-1.5 py-0"
                        >
                          {review.severity === "alert" ? "CRITICAL" : "MEDIUM"}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                        {cameraName.replace(/_/g, " ")}{" "}
                        {zones.length > 0 && `• ${zones.join(", ")}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {timestamp}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
