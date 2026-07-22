import { useSyncStatus, type SyncStatus } from "@/lib/cloud-sync";
import { Cloud, CloudOff, RefreshCw, Check } from "lucide-react";

const map: Record<SyncStatus, { label: string; cls: string; Icon: typeof Cloud }> = {
  online: { label: "Online", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", Icon: Cloud },
  synced: { label: "Synced", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", Icon: Check },
  syncing: { label: "Syncing", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30", Icon: RefreshCw },
  offline: { label: "Offline", cls: "bg-red-500/10 text-red-600 border-red-500/30", Icon: CloudOff },
};

export function SyncPill() {
  const { status, pending } = useSyncStatus();
  const cfg = map[status];
  const Icon = cfg.Icon;
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm ${cfg.cls}`}
      title={
        status === "offline"
          ? "No internet — bills continue to save locally and will sync when back online"
          : pending > 0
          ? `${pending} change${pending === 1 ? "" : "s"} pending`
          : "All changes synced to Lovable Cloud"
      }
    >
      <Icon className={`w-3.5 h-3.5 ${status === "syncing" ? "animate-spin" : ""}`} />
      <span>{cfg.label}{pending > 0 ? ` · ${pending}` : ""}</span>
    </div>
  );
}
