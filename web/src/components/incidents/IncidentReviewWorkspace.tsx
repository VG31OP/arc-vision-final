import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FrigateConfig } from "@/types/frigateConfig";
import { ReviewSegment } from "@/types/review";
import {
  calculateIncidentCounts,
  correlateIncidentSegments,
  filterIncidents,
  IncidentFilterOptions,
  IncidentSeverity,
  IncidentStatus,
} from "@/utils/incidentAdapter";
import { useMemo, useState } from "react";
import {
  FaFilter,
  FaSearch,
  FaShieldAlt,
  FaTimes,
} from "react-icons/fa";
import { LuRefreshCw } from "react-icons/lu";
import useSWR from "swr";
import IncidentCard from "./IncidentCard";

interface IncidentReviewWorkspaceProps {
  events: ReviewSegment[];
  onSelectIncident: (event: ReviewSegment) => void;
  onRefresh?: () => void;
}

export default function IncidentReviewWorkspace({
  events,
  onSelectIncident,
  onRefresh,
}: IncidentReviewWorkspaceProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  // Local state for filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<
    IncidentSeverity | "ALL"
  >("ALL");
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus | "ALL">(
    "ALL",
  );
  const [selectedCamera, setSelectedCamera] = useState<string>("ALL");
  const [selectedZone, setSelectedZone] = useState<string>("ALL");
  const [selectedDetectionClass, setSelectedDetectionClass] = useState<string>("ALL");
  const [acknowledgedIds] = useState<Set<string>>(new Set());

  // Correlate continuous events (window 180s) to eliminate notification storms
  const correlatedEvents = useMemo(() => {
    return correlateIncidentSegments(events || [], 180);
  }, [events]);

  // Operational Counts
  const counts = useMemo(() => {
    return calculateIncidentCounts(correlatedEvents, acknowledgedIds);
  }, [correlatedEvents, acknowledgedIds]);

  // Filter options lists
  const availableCameras = useMemo(() => {
    if (!config?.cameras) return [];
    return Object.keys(config.cameras);
  }, [config]);

  const availableZones = useMemo(() => {
    if (!config?.cameras) return [];
    const zones = new Set<string>();
    Object.values(config.cameras).forEach((cam) => {
      if (cam.zones) {
        Object.keys(cam.zones).forEach((z) => zones.add(z));
      }
    });
    return Array.from(zones);
  }, [config]);

  const availableDetectionClasses = useMemo(() => {
    if (!config?.cameras) return ["person", "car", "dog", "cat"];
    const classes = new Set<string>();
    Object.values(config.cameras).forEach((cam) => {
      const track = cam.objects?.track || config.objects?.track || [];
      track.forEach((t) => classes.add(t));
    });
    return Array.from(classes);
  }, [config]);

  // Filtered incidents list
  const filterOptions: IncidentFilterOptions = useMemo(
    () => ({
      searchQuery,
      severity: selectedSeverity,
      status: selectedStatus,
      camera: selectedCamera,
      zone: selectedZone,
      detectionClass: selectedDetectionClass,
    }),
    [
      searchQuery,
      selectedSeverity,
      selectedStatus,
      selectedCamera,
      selectedZone,
      selectedDetectionClass,
    ],
  );

  const filteredIncidents = useMemo(() => {
    return filterIncidents(correlatedEvents, filterOptions, acknowledgedIds);
  }, [correlatedEvents, filterOptions, acknowledgedIds]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedSeverity !== "ALL" ||
    selectedStatus !== "ALL" ||
    selectedCamera !== "ALL" ||
    selectedZone !== "ALL" ||
    selectedDetectionClass !== "ALL";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedSeverity("ALL");
    setSelectedStatus("ALL");
    setSelectedCamera("ALL");
    setSelectedZone("ALL");
    setSelectedDetectionClass("ALL");
  };

  return (
    <div className="flex size-full flex-col space-y-6 overflow-y-auto bg-background p-6 font-mono text-slate-100">
      {/* Workspace Title & Operational Counts Summary Bar */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-wide text-slate-100 flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg border border-sky-800/60 bg-sky-950/40 text-sky-400">
                <FaShieldAlt className="size-5" />
              </div>
              INCIDENT REVIEW COMMAND CENTER
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time security threat triage, evidence analysis, and operational disposition.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-8 border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
            >
              <LuRefreshCw className="mr-1.5 size-3.5 text-sky-400" />
              Refresh Feed
            </Button>
          </div>
        </div>

        {/* Operational Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="rounded-xl border border-slate-800/80 bg-background_alt p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Incidents
            </span>
            <span className="text-xl font-bold text-slate-100">{counts.total}</span>
          </div>

          <div className="rounded-xl border border-cyan-800/60 bg-cyan-950/20 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
              Active
            </span>
            <span className="text-xl font-bold text-cyan-400">{counts.active}</span>
          </div>

          <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              Acknowledged
            </span>
            <span className="text-xl font-bold text-amber-400">{counts.acknowledged}</span>
          </div>

          <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              Resolved
            </span>
            <span className="text-xl font-bold text-emerald-400">{counts.resolved}</span>
          </div>

          <div className="rounded-xl border border-rose-800/60 bg-rose-950/20 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
              Critical
            </span>
            <span className="text-xl font-bold text-rose-400">{counts.critical}</span>
          </div>

          <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              High
            </span>
            <span className="text-xl font-bold text-amber-400">{counts.high}</span>
          </div>

          <div className="rounded-xl border border-sky-800/60 bg-sky-950/20 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
              Medium
            </span>
            <span className="text-xl font-bold text-sky-400">{counts.medium}</span>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Low
            </span>
            <span className="text-xl font-bold text-slate-400">{counts.low}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="rounded-xl border border-slate-800/80 bg-background_alt p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <FaFilter className="size-3.5 text-sky-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Investigation Filter Controls
            </span>
            {hasActiveFilters && (
              <span className="rounded bg-sky-950 px-2 py-0.5 text-[10px] font-bold text-sky-400 border border-sky-800">
                Filters Active
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResetFilters}
              className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
            >
              <FaTimes className="mr-1 size-3" />
              Reset Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search Query Input */}
          <div className="relative md:col-span-2">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search camera, zone, ID, or detection..."
              className="h-9 pl-9 border-slate-800 bg-slate-950 text-xs font-mono text-slate-200 focus:border-sky-500"
            />
          </div>

          {/* Severity Filter */}
          <Select
            value={selectedSeverity}
            onValueChange={(val) =>
              setSelectedSeverity(val as IncidentSeverity | "ALL")
            }
          >
            <SelectTrigger className="h-9 border-slate-800 bg-slate-950 text-xs text-slate-200">
              <SelectValue placeholder="Severity: All" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-xs text-slate-200">
              <SelectItem value="ALL">Severity: All</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={selectedStatus}
            onValueChange={(val) =>
              setSelectedStatus(val as IncidentStatus | "ALL")
            }
          >
            <SelectTrigger className="h-9 border-slate-800 bg-slate-950 text-xs text-slate-200">
              <SelectValue placeholder="Status: All" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-xs text-slate-200">
              <SelectItem value="ALL">Status: All</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
            </SelectContent>
          </Select>

          {/* Camera Filter */}
          <Select
            value={selectedCamera}
            onValueChange={(val) => setSelectedCamera(val)}
          >
            <SelectTrigger className="h-9 border-slate-800 bg-slate-950 text-xs text-slate-200">
              <SelectValue placeholder="Camera: All" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-xs text-slate-200">
              <SelectItem value="ALL">Camera: All</SelectItem>
              {availableCameras.map((cam) => (
                <SelectItem key={cam} value={cam}>
                  {config?.cameras[cam]?.name || cam.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Security Zone Filter */}
          <Select
            value={selectedZone}
            onValueChange={(val) => setSelectedZone(val)}
          >
            <SelectTrigger className="h-9 border-slate-800 bg-slate-950 text-xs text-slate-200">
              <SelectValue placeholder="Zone: All" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-xs text-slate-200">
              <SelectItem value="ALL">Zone: All</SelectItem>
              {availableZones.map((z) => (
                <SelectItem key={z} value={z}>
                  {z.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Detection Class Filter */}
          <Select
            value={selectedDetectionClass}
            onValueChange={(val) => setSelectedDetectionClass(val)}
          >
            <SelectTrigger className="h-9 border-slate-800 bg-slate-950 text-xs text-slate-200">
              <SelectValue placeholder="Object: All" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-xs text-slate-200">
              <SelectItem value="ALL">Object: All</SelectItem>
              {availableDetectionClasses.map((cls) => (
                <SelectItem key={cls} value={cls}>
                  {cls.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Incident Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing <strong className="text-slate-200">{filteredIncidents.length}</strong> of{" "}
            <strong className="text-slate-200">{correlatedEvents.length}</strong> correlated incidents
          </span>
        </div>

        {filteredIncidents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-background_alt/50 p-12 text-center">
            <FaShieldAlt className="mx-auto size-12 text-slate-600 mb-3" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              No Incidents Match Search Criteria
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Try adjusting your severity, camera, zone, or status filters to inspect recorded security events.
            </p>
            {hasActiveFilters && (
              <Button
                onClick={handleResetFilters}
                size="sm"
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
              >
                Reset All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredIncidents.map((event) => (
              <IncidentCard
                key={event.id}
                event={event}
                onSelect={() => onSelectIncident(event)}
                onOpenDetail={() => onSelectIncident(event)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
