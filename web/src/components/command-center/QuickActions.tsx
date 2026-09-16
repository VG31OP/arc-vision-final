import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LuVideo, LuShieldAlert, LuFilm, LuActivity, LuSlidersHorizontal } from "react-icons/lu";

export default function QuickActions() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        asChild
        variant="outline"
        size="sm"
        className="border-border/60 bg-card/60 hover:bg-sky-500/10 hover:border-sky-500/40 hover:text-sky-400 font-semibold text-xs transition-all"
      >
        <Link to="/live">
          <LuVideo className="mr-1.5 size-3.5 text-sky-400" />
          LIVE SURVEILLANCE
        </Link>
      </Button>

      <Button
        asChild
        variant="outline"
        size="sm"
        className="border-border/60 bg-card/60 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-400 font-semibold text-xs transition-all"
      >
        <Link to="/review">
          <LuShieldAlert className="mr-1.5 size-3.5 text-amber-400" />
          INCIDENT REVIEW
        </Link>
      </Button>

      <Button
        asChild
        variant="outline"
        size="sm"
        className="border-border/60 bg-card/60 hover:bg-purple-500/10 hover:border-purple-500/40 hover:text-purple-400 font-semibold text-xs transition-all"
      >
        <Link to="/export">
          <LuFilm className="mr-1.5 size-3.5 text-purple-400" />
          EVIDENCE
        </Link>
      </Button>

      <Button
        asChild
        variant="outline"
        size="sm"
        className="border-border/60 bg-card/60 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-400 font-semibold text-xs transition-all"
      >
        <Link to="/system">
          <LuActivity className="mr-1.5 size-3.5 text-emerald-400" />
          SYSTEM HEALTH
        </Link>
      </Button>

      <Button
        asChild
        variant="outline"
        size="sm"
        className="border-border/60 bg-card/60 hover:bg-muted font-semibold text-xs transition-all"
      >
        <Link to="/settings">
          <LuSlidersHorizontal className="mr-1.5 size-3.5" />
          SETTINGS
        </Link>
      </Button>
    </div>
  );
}
