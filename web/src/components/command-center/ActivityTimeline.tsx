import { ReviewSegment } from "@/types/review";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LuClock } from "react-icons/lu";
import { useFrigateReviews } from "@/api/ws";
import { useEffect } from "react";
import { evaluateIncidentIntelligence } from "@/utils/intelligence/incidentRules";

export default function ActivityTimeline() {
  const { data: reviews, mutate: reloadReviews } = useSWR<ReviewSegment[]>([
    "review",
    { limit: 12 },
  ]);

  const liveReview = useFrigateReviews();

  // Listen to live WebSocket review updates
  useEffect(() => {
    if (liveReview) {
      reloadReviews();
    }
  }, [liveReview, reloadReviews]);

  return (
    <Card className="border border-border/60 bg-card/60 backdrop-blur-sm font-mono">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
        <div className="flex items-center space-x-2">
          <LuClock className="size-4 text-sky-400" />
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground">
            REAL-TIME ACTIVITY FEED
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {!reviews || reviews.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">
            No recent surveillance activity logged.
          </div>
        ) : (
          <div className="relative border-l border-border/60 ml-2.5 space-y-3 py-1">
            {reviews.slice(0, 6).map((review) => {
              const intel = evaluateIncidentIntelligence(review);
              const mainObject =
                review.data.objects?.[0] || review.data.audio?.[0] || "motion";
              const cameraName = review.camera || "camera";
              const timestamp = new Date(review.start_time * 1000).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              const dotColor =
                intel.priority === "CRITICAL"
                  ? "bg-rose-500 ring-rose-950"
                  : intel.priority === "HIGH"
                  ? "bg-amber-500 ring-amber-950"
                  : "bg-sky-400 ring-sky-950";

              return (
                <div key={review.id} className="relative pl-5 text-xs">
                  {/* Timeline Dot */}
                  <span className={`absolute -left-[5px] top-1 size-2 rounded-full ring-4 ${dotColor}`} />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-foreground uppercase tracking-wide">
                        {mainObject} DETECTED
                      </span>
                      <span className="text-muted-foreground capitalize">
                        • {cameraName.replace(/_/g, " ")}
                      </span>
                    </div>

                    <span className="font-mono text-[11px] text-muted-foreground">
                      {timestamp}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
