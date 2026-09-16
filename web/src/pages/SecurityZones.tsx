import { baseUrl } from "@/api/baseUrl";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import Heading from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { useAllowedCameras } from "@/hooks/use-allowed-cameras";
import { FrigateConfig } from "@/types/frigateConfig";
import { parseCoordinates } from "@/utils/canvasUtil";
import MasksAndZonesView from "@/views/settings/MasksAndZonesView";
import { useMemo, useState } from "react";
import {
  FaCamera,
  FaCheckCircle,
  FaShieldAlt,
  FaVideo,
} from "react-icons/fa";
import { LuMapPin, LuPlus, LuSlidersHorizontal } from "react-icons/lu";
import useSWR from "swr";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import CameraDetailModal from "@/components/camera/CameraDetailModal";

export default function SecurityZones() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const allowedCameras = useAllowedCameras();

  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [editingCamera, setEditingCamera] = useState<string | null>(null);
  const [inspectingCamera, setInspectingCamera] = useState<string | null>(null);
  const [, setUnsavedChanges] = useState(false);

  const camerasWithZones = useMemo(() => {
    if (!config?.cameras) return [];
    return Object.keys(config.cameras)
      .filter((cam) => allowedCameras.includes(cam))
      .map((camName) => {
        const camConfig = config.cameras[camName];
        const zones = Object.entries(camConfig.zones || {}).map(
          ([zoneName, zConfig]) => ({
            name: zoneName,
            coordinates: zConfig.coordinates,
            objects: zConfig.objects || [],
            enabled: zConfig.enabled !== false,
            color: zConfig.color || [220, 38, 38],
            friendlyName: zConfig.friendly_name,
          }),
        );
        return {
          camera: camName,
          displayName: camConfig.name || camName.toUpperCase(),
          zones,
          detectWidth: camConfig.detect.width,
          detectHeight: camConfig.detect.height,
        };
      });
  }, [config, allowedCameras]);

  const totalZonesCount = useMemo(() => {
    return camerasWithZones.reduce((acc, c) => acc + c.zones.length, 0);
  }, [camerasWithZones]);

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
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg border border-sky-800/60 bg-sky-950/40 text-sky-400">
              <FaShieldAlt className="size-5" />
            </div>
            <div>
              <Heading as="h1" className="text-xl font-bold text-slate-100">
                SECURITY ZONES
              </Heading>
              <p className="text-xs text-slate-400">
                Where security rules apply — spatial monitoring & detection boundaries
              </p>
            </div>
          </div>
        </div>

        {/* Camera Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={selectedCamera === "" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCamera("")}
            className={`h-8 text-xs font-semibold ${
              selectedCamera === ""
                ? "bg-sky-600 hover:bg-sky-500 text-white"
                : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800"
            }`}
          >
            All Cameras ({camerasWithZones.length})
          </Button>
          {camerasWithZones.map((c) => (
            <Button
              key={c.camera}
              variant={selectedCamera === c.camera ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCamera(c.camera)}
              className={`h-8 text-xs font-semibold ${
                selectedCamera === c.camera
                  ? "bg-sky-600 hover:bg-sky-500 text-white"
                  : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <FaCamera className="mr-1.5 size-3 text-sky-400" />
              {c.displayName} ({c.zones.length})
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800/80 bg-background_alt p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            CONFIGURED ZONES
          </span>
          <span className="text-2xl font-bold text-sky-400">{totalZonesCount}</span>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-background_alt p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            MONITORED CAMERAS
          </span>
          <span className="text-2xl font-bold text-emerald-400">
            {camerasWithZones.length}
          </span>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-background_alt p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            STATUS
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <FaCheckCircle className="size-3" /> ACTIVE
          </span>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-background_alt p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            DETECTION PIPELINE
          </span>
          <span className="text-xs font-semibold text-slate-300">
            REALTIME BOUNDING
          </span>
        </div>
      </div>

      {/* Empty State */}
      {totalZonesCount === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-background_alt/50 p-12 text-center">
          <LuMapPin className="mb-4 size-12 text-slate-600" />
          <h3 className="mb-2 text-base font-bold text-slate-200 uppercase tracking-wider">
            NO SECURITY ZONES
          </h3>
          <p className="max-w-md text-xs text-slate-400 mb-6">
            Configure a security zone to monitor specific areas and elevate threat severity when motion or detections occur inside restricted boundaries.
          </p>
          <Button
            onClick={() => setEditingCamera(camerasWithZones[0]?.camera || "")}
            className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold h-9"
          >
            <LuPlus className="mr-2 size-4" />
            Configure Security Zone
          </Button>
        </div>
      )}

      {/* Security Zones Grid per Camera */}
      <div className="space-y-8">
        {camerasWithZones
          .filter((c) => !selectedCamera || c.camera === selectedCamera)
          .map((c) => (
            <div
              key={c.camera}
              className="rounded-2xl border border-slate-800/80 bg-background_alt p-5 shadow-lg"
            >
              {/* Camera Header */}
              <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded bg-slate-800 text-sky-400">
                    <FaVideo className="size-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 tracking-wide">
                      {c.displayName}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {c.detectWidth}x{c.detectHeight} · {c.zones.length} active zone(s)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInspectingCamera(c.camera)}
                    className="h-8 border-sky-800/60 bg-sky-950/40 text-sky-400 hover:bg-sky-900/40 text-xs font-semibold"
                  >
                    <FaCamera className="mr-1.5 size-3" />
                    Inspect Camera
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingCamera(c.camera)}
                    className="h-8 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 text-xs font-semibold"
                  >
                    <LuSlidersHorizontal className="mr-1.5 size-3 text-sky-400" />
                    Edit Camera Zones
                  </Button>
                </div>
              </div>

              {/* Zones Cards Grid */}
              {c.zones.length === 0 ? (
                <div className="rounded-xl border border-slate-800/50 bg-slate-950/40 p-6 text-center text-xs text-slate-500">
                  No security zones configured for {c.displayName}.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {c.zones.map((z) => {
                    const parsedPoints = parseCoordinates(z.coordinates);
                    const polySvgPoints = parsedPoints
                      .map(
                        ([x, y]) =>
                          `${(x * 100).toFixed(1)}%,${(y * 100).toFixed(1)}%`,
                      )
                      .join(" ");

                    return (
                      <div
                        key={z.name}
                        className="group relative flex flex-col rounded-xl border border-slate-800/90 bg-slate-950 p-4 transition-all duration-200 hover:border-sky-500/50"
                      >
                        {/* Zone Name & Status */}
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <LuMapPin className="size-3.5 text-amber-400" />
                            {z.friendlyName || z.name.replace(/_/g, " ")}
                          </h4>
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-800/60 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-400" />
                            ACTIVE
                          </span>
                        </div>

                        {/* Snapshot & Polygon Overlay */}
                        <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                          <img
                            src={`${baseUrl}api/${c.camera}/latest.jpg`}
                            alt={c.displayName}
                            className="size-full object-cover opacity-80"
                          />
                          {/* SVG Polygon overlay */}
                          {polySvgPoints && (
                            <svg className="absolute inset-0 size-full">
                              <polygon
                                points={polySvgPoints}
                                fill={`rgba(${z.color.join(",")}, 0.35)`}
                                stroke={`rgb(${z.color.join(",")})`}
                                strokeWidth="2"
                              />
                            </svg>
                          )}
                        </div>

                        {/* Monitored Objects */}
                        <div className="mt-auto space-y-2 text-xs">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                              Monitored Detections
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {z.objects.length > 0 ? (
                                z.objects.map((obj) => (
                                  <span
                                    key={obj}
                                    className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300 border border-slate-700"
                                  >
                                    {obj.toUpperCase()}
                                  </span>
                                ))
                              ) : (
                                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-700">
                                  ALL DETECTIONS
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Security Zone Polygon Editor Modal */}
      {editingCamera && (
        <Dialog open={Boolean(editingCamera)} onOpenChange={() => setEditingCamera(null)}>
          <DialogContent className="max-w-5xl border-slate-800 bg-slate-950 p-6 text-slate-100">
            <DialogHeader className="mb-4 border-b border-slate-800 pb-3">
              <DialogTitle className="text-base font-bold tracking-wide text-sky-400 flex items-center gap-2">
                <LuSlidersHorizontal className="size-4" />
                SECURITY ZONE EDITOR — {editingCamera.toUpperCase()}
              </DialogTitle>
            </DialogHeader>

            <MasksAndZonesView
              selectedCamera={editingCamera}
              setUnsavedChanges={setUnsavedChanges}
            />
          </DialogContent>
        </Dialog>
      )}

      {inspectingCamera && (
        <CameraDetailModal
          cameraName={inspectingCamera}
          isOpen={Boolean(inspectingCamera)}
          onClose={() => setInspectingCamera(null)}
        />
      )}
    </div>
  );
}
