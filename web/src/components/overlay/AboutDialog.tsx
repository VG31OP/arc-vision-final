import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/branding";
import { LuShieldCheck, LuInfo, LuExternalLink } from "react-icons/lu";

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<"product" | "licenses">("product");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card text-card-foreground border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold text-lg">
              AV
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {BRAND.name}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {BRAND.descriptor} &bull; v{BRAND.version}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex gap-2 border-b border-border pb-2 mt-2">
          <Button
            variant={tab === "product" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab("product")}
            className="flex items-center gap-1.5"
          >
            <LuInfo className="size-4" />
            About Product
          </Button>
          <Button
            variant={tab === "licenses" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab("licenses")}
            className="flex items-center gap-1.5"
          >
            <LuShieldCheck className="size-4" />
            Open Source Notices
          </Button>
        </div>

        {tab === "product" ? (
          <div className="space-y-4 py-2 text-sm leading-relaxed">
            <div className="p-4 rounded-lg bg-muted/40 border border-border">
              <p className="font-semibold text-foreground text-base mb-1">
                "{BRAND.tagline}"
              </p>
              <p className="text-muted-foreground text-xs">
                ARC VISION is a real-time intelligent surveillance platform designed for enterprise and command-center operation. Featuring multi-camera intelligence, incident review workflows, security zone monitoring, and operational diagnostics.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded border border-border bg-background">
                <div className="font-semibold text-foreground mb-1">Command & Control</div>
                <div className="text-muted-foreground">
                  Live multi-stream monitoring with MediaMTX, WebRTC low-latency, and interactive security zones.
                </div>
              </div>
              <div className="p-3 rounded border border-border bg-background">
                <div className="font-semibold text-foreground mb-1">Incident Intelligence</div>
                <div className="text-muted-foreground">
                  Automated threat detection, object tracking, and evidence collection workflows.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2 text-xs leading-relaxed max-h-[350px] overflow-y-auto pr-1">
            <p className="text-muted-foreground">
              ARC VISION incorporates open-source software and component libraries. We gratefully acknowledge the creators and maintainers of the underlying open-source projects.
            </p>

            <div className="p-3 rounded border border-border bg-muted/20 space-y-2">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>Frigate NVR</span>
                <span className="text-[10px] text-muted-foreground">MIT License</span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Copyright &copy; 2019 Blake Blackshear. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files...
              </p>
              <a
                href="https://github.com/blakeblackshear/frigate"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline text-[11px]"
              >
                Upstream Repository <LuExternalLink className="size-3" />
              </a>
            </div>

            <div className="p-3 rounded border border-border bg-muted/20 space-y-1.5">
              <div className="font-semibold text-foreground">Other Open Source Components</div>
              <ul className="list-disc list-inside text-muted-foreground text-[11px] space-y-0.5">
                <li>OpenCV (Apache 2.0 / BSD) &bull; Computer vision library</li>
                <li>FastAPI & Pydantic (MIT License) &bull; High-performance backend routing</li>
                <li>go2rtc (MIT License) &bull; Low-latency video streaming</li>
                <li>React & TailwindCSS (MIT License) &bull; Frontend application framework</li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
