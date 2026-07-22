import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ALL_TABLES,
  GROUND_TABLES,
  ROOF_TABLES,
  useAllOrders,
  useTableStartedAt,
  total,
  totalQty,
  type TableDef,
} from "@/lib/orders";
import { SyncPill } from "@/components/sync-pill";
import { Coffee, Utensils, TrendingUp, Circle, BarChart3, Package, Clock } from "lucide-react";

function formatElapsed(startMs: number, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  if (diffSec < 60) return "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"}`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs} hr${hrs === 1 ? "" : "s"}` : `${hrs} hr ${rem} min${rem === 1 ? "" : "s"}`;
}

function formatBilledAt(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BTech Cafe — POS & Table Billing" },
      { name: "description", content: "Offline POS and table billing for BTech Cafe." },
      { property: "og:title", content: "BTech Cafe POS" },
      { property: "og:description", content: "Fast, tablet-friendly table billing for BTech Cafe." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const orders = useAllOrders();

  const occupiedCount = ALL_TABLES.filter((t) => (orders[t.id] || []).length > 0).length;
  const grandTotal = ALL_TABLES.reduce((s, t) => s + total(orders[t.id] || []), 0);
  const itemsServed = ALL_TABLES.reduce((s, t) => s + totalQty(orders[t.id] || []), 0);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-primary/20 blur-3xl animate-float-slow" />
        <div className="absolute top-40 -right-32 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl animate-float-slower" />
        <div className="absolute inset-0 bg-grid opacity-40" />
      </div>

      <header className="relative">
        <div className="mx-auto max-w-6xl px-6 pt-10 pb-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-lg">
                  <Coffee className="w-6 h-6" />
                </div>
                <span className="absolute -top-1 left-3 w-1 h-3 bg-primary/60 rounded-full animate-steam" />
                <span className="absolute -top-1 left-5 w-1 h-3 bg-primary/60 rounded-full animate-steam" style={{ animationDelay: "0.6s" }} />
                <span className="absolute -top-1 left-7 w-1 h-3 bg-primary/60 rounded-full animate-steam" style={{ animationDelay: "1.2s" }} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">Point of Sale</div>
                <div className="font-bold text-foreground">BTech Cafe</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SyncPill />
              <Link
                to="/inventory"
                className="flex items-center gap-1.5 rounded-full bg-card border border-border px-3.5 py-2 text-xs font-bold shadow-sm hover:border-primary/40 text-foreground transition"
              >
                <Package className="w-3.5 h-3.5" /> Inventory
              </Link>
              <Link
                to="/sales"
                className="flex items-center gap-1.5 rounded-full bg-foreground text-background px-3.5 py-2 text-xs font-bold shadow-sm hover:bg-primary transition"
              >
                <BarChart3 className="w-3.5 h-3.5" /> Sales Summary
              </Link>
              <div className="flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1.5 shadow-sm">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary/60 animate-pulse-ring" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-primary" />
                </span>
                <span className="text-xs font-medium text-foreground">Live</span>
              </div>
            </div>
          </div>

          <div className="animate-slide-up">
            <div className="text-xs uppercase tracking-[0.3em] text-primary font-bold mb-3">
              — Table Service Dashboard
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[0.95] text-foreground">
              Brewing orders,
              <br />
              <span className="shimmer-text">table by table.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              Tap a table to take orders, edit bills, print receipts or settle up. Everything saves instantly.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl">
            <StatCard icon={<Circle className="w-4 h-4" />} label="Occupied" value={`${occupiedCount}/${ALL_TABLES.length}`} accent />
            <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Open bill" value={`₹${grandTotal}`} />
            <StatCard icon={<Utensils className="w-4 h-4" />} label="Items live" value={String(itemsServed)} />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-16 space-y-10">
        <TableSection
          title="Ground Floor"
          subtitle="Five tables · quick service"
          tables={GROUND_TABLES}
          orders={orders}
          layout="row"
        />
        <TableSection
          title="Rooftop"
          subtitle="Twelve tables · open air"
          tables={ROOF_TABLES}
          orders={orders}
          layout="grid"
        />

        <footer className="mt-16 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© BTech Cafe · Nallurahalli, Bengaluru</div>
          <div className="flex items-center gap-4">
            <span>💾 Auto-saves locally</span>
            <span>🖨️ Thermal print ready</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

function TableSection({
  title,
  subtitle,
  tables,
  orders,
  layout,
}: {
  title: string;
  subtitle: string;
  tables: TableDef[];
  orders: Record<string, { name: string; price: number; qty: number }[]>;
  layout: "row" | "grid";
}) {
  const occ = tables.filter((t) => (orders[t.id] || []).length > 0).length;
  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold">— {title}</div>
          <h2 className="text-2xl font-black text-foreground leading-tight">{subtitle}</h2>
        </div>
        <div className="text-xs font-semibold text-muted-foreground">
          {occ}/{tables.length} occupied
        </div>
      </div>
      <div
        className={
          layout === "row"
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3"
            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
        }
      >
        {tables.map((t, i) => {
          const lines = orders[t.id] || [];
          const occupied = lines.length > 0;
          const amt = total(lines);
          const qty = totalQty(lines);
          return (
            <Link
              key={t.id}
              to="/table/$id"
              params={{ id: t.id }}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`group relative animate-slide-up rounded-2xl p-4 overflow-hidden transition-all duration-300 active:scale-[0.98] hover:-translate-y-0.5 ${
                occupied
                  ? "bg-gradient-to-br from-primary via-primary to-[oklch(0.62_0.19_35)] text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-card text-card-foreground border-2 border-border hover:border-primary/40 hover:shadow-md"
              }`}
            >
              <div
                className={`absolute -right-8 -top-8 w-24 h-24 rounded-full ${
                  occupied ? "bg-primary-foreground/10" : "bg-primary/5"
                } transition-transform duration-500 group-hover:scale-125`}
              />
              <div className="relative flex items-start justify-between">
                <div>
                  <div
                    className={`text-[9px] font-bold uppercase tracking-[0.2em] ${
                      occupied ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    Table
                  </div>
                  <div className="text-3xl font-black mt-0.5 leading-none tracking-tight">
                    {t.short}
                  </div>
                </div>
                <span
                  className={`w-2 h-2 rounded-full ${occupied ? "bg-primary-foreground animate-pulse" : "bg-muted-foreground/40"}`}
                />
              </div>
              <div className="relative mt-4 flex items-end justify-between">
                <div>
                  <div className={`text-lg font-black ${occupied ? "" : "text-muted-foreground"}`}>
                    ₹{amt}
                  </div>
                  <div
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      occupied ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {occupied ? `${qty} item${qty !== 1 ? "s" : ""}` : "Available"}
                  </div>
                </div>
                <span
                  className={`text-sm font-bold transition-all group-hover:translate-x-0.5 ${
                    occupied ? "text-primary-foreground" : "text-primary"
                  }`}
                >
                  →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 border ${
        accent
          ? "bg-foreground text-background border-foreground"
          : "bg-card text-card-foreground border-border"
      }`}
    >
      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${accent ? "text-background/70" : "text-muted-foreground"}`}>
        {icon} {label}
      </div>
      <div className="text-2xl font-black mt-1">{value}</div>
    </div>
  );
}
