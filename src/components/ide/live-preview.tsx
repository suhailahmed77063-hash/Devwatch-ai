"use client";

import { useState, useRef, useCallback } from "react";
import {
  Globe, RefreshCw, Monitor, Tablet, Smartphone, ExternalLink,
  Loader2, AlertCircle, Wifi, WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<Device, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

export function LivePreview({
  projectId,
  url,
  status,
}: {
  projectId: string;
  url?: string;
  status?: "loading" | "ready" | "error";
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const previewUrl = url || `/api/projects/${projectId}/preview`;

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleOpenExternal = useCallback(() => {
    if (url) window.open(url, "_blank");
  }, [url]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c]">
      {/* Header */}
      <div className="h-9 shrink-0 border-b border-white/5 flex items-center gap-2 px-3">
        <Globe className="w-3.5 h-3.5 text-acc-soft" />
        <span className="text-[11px] font-semibold text-zinc-300">Preview</span>

        <div className="flex-1" />

        {/* Device selector */}
        <div className="flex items-center gap-0.5 glass rounded-lg p-0.5">
          {(["desktop", "tablet", "mobile"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={cn(
                "p-1 rounded-md transition",
                device === d ? "text-acc-soft bg-white/10" : "text-zinc-500 hover:text-white"
              )}
              title={d}
            >
              {d === "desktop" && <Monitor className="w-3.5 h-3.5" />}
              {d === "tablet" && <Tablet className="w-3.5 h-3.5" />}
              {d === "mobile" && <Smartphone className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>

        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {url && (
          <button
            onClick={handleOpenExternal}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* URL bar */}
      <div className="h-7 shrink-0 border-b border-white/5 flex items-center px-3 gap-2">
        <div className="flex items-center gap-1.5">
          {status === "loading" && <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />}
          {status === "ready" && <Wifi className="w-3 h-3 text-emerald-400" />}
          {status === "error" && <WifiOff className="w-3 h-3 text-red-400" />}
          {!status && <Globe className="w-3 h-3 text-zinc-500" />}
        </div>
        <span className="text-[10px] text-zinc-500 font-mono truncate flex-1">
          {url || "No preview available"}
        </span>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 min-h-0 flex items-start justify-center overflow-auto bg-zinc-900 p-4">
        <div
          className={cn(
            "bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300 h-full",
            device !== "desktop" && "border border-zinc-700"
          )}
          style={{ width: DEVICE_WIDTHS[device], maxWidth: "100%" }}
        >
          {status === "error" ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500 p-8">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-center">Preview unavailable</p>
              <p className="text-xs text-center text-zinc-600">
                Build and run the app to see a live preview
              </p>
            </div>
          ) : status === "loading" ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
              <Loader2 className="w-8 h-8 text-acc-soft animate-spin" />
              <p className="text-sm">Loading preview...</p>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              key={refreshKey}
              src={previewUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title="Live Preview"
            />
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="h-6 shrink-0 px-3 border-t border-white/5 flex items-center gap-3 text-[10px] text-zinc-600">
        <span className="capitalize">{device}</span>
        <span>{DEVICE_WIDTHS[device]}</span>
        <span className="flex-1" />
        {status === "ready" && <span className="text-emerald-400">● Live</span>}
        {status === "loading" && <span className="text-amber-400">● Loading</span>}
        {status === "error" && <span className="text-red-400">● Error</span>}
      </div>
    </div>
  );
}
