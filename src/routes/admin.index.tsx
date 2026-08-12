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
import { Coffee, Utensils, TrendingUp, Circle, BarChart3, Package, Clock, Wallet } from "lucide-react";

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


export const Route = createFileRoute("/admin/")({
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
  const starts = useTableStartedAt();

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
        <div className="mx-auto max-w-6xl px-5 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-foreground text-background flex items-center justify-center shadow-md">
                  <Coffee className="w-4.5 h-4.5" />
                </div>
                <span className="absolute -top-1 left-2.5 w-0.5 h-2.5 bg-primary/60 rounded-full animate-steam" />
                <span className="absolute -top-1 left-4 w-0.5 h-2.5 bg-primary/60 rounded-full animate-steam" style={{ animationDelay: "0.6s" }} />
                <span className="absolute -top-1 left-5.5 w-0.5 h-2.5 bg-primary/60 rounded-full animate-steam" style={{ animationDelay: "1.2s" }} />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold leading-tight">Point of Sale</div>
                <div className="font-black text-foreground text-sm leading-tight">BTech Cafe</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <SyncPill />
              <Link to="/admin/expenses" className="flex items-center gap-1 rounded-full bg-card border border-border px-2.5 py-1.5 text-[11px] font-bold hover:border-primary/40 transition">
                <Wallet className="w-3 h-3" /> Expenses
              </Link>
              <Link to="/admin/inventory" className="flex items-center gap-1 rounded-full bg-card border border-border px-2.5 py-1.5 text-[11px] font-bold hover:border-primary/40 transition">
                <Package className="w-3 h-3" /> Inventory
              </Link>
              <Link to="/admin/sales" className="flex items-center gap-1 rounded-full bg-foreground text-background px-2.5 py-1.5 text-[11px] font-bold hover:bg-primary transition">
                <BarChart3 className="w-3 h-3" /> Sales
              </Link>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold mb-0.5">— Table Service</div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none text-foreground">
                Brewing orders, <span className="shimmer-text">table by table.</span>
              </h1>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatCard icon={<Circle className="w-3 h-3" />} label="Occupied" value={`${occupiedCount}/${ALL_TABLES.length}`} accent />
              <StatCard icon={<TrendingUp className="w-3 h-3" />} label="Open bill" value={`₹${grandTotal}`} />
              <StatCard icon={<Utensils className="w-3 h-3" />} label="Items" value={String(itemsServed)} />
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 pb-6 space-y-4">
        <TableSection
          title="Ground Floor"
          subtitle="Five tables · quick service"
          tables={GROUND_TABLES}
          orders={orders}
          starts={starts}
          layout="row"
        />
        <TableSection
          title="Rooftop"
          subtitle="Twelve tables · open air"
          tables={ROOF_TABLES}
          orders={orders}
          starts={starts}
          layout="grid"
        />
        <TableSection
          title="Smoke Zone"
          subtitle="Five spots · smoking area"
          tables={SMOKE_TABLES}
          orders={orders}
          starts={starts}
          layout="row"
        />
        <TableSection
          title="Takeaway"
          subtitle="Five counters · parcel orders"
          tables={TAKEAWAY_TABLES}
          orders={orders}
          starts={starts}
          layout="row"
        />
      </main>
    </div>
  );
}

function TableSection({
  title,
  subtitle,
  tables,
  orders,
  starts,
  layout,
}: {
  title: string;
  subtitle: string;
  tables: TableDef[];
  orders: Record<string, { name: string; price: number; qty: number }[]>;
  starts: Record<string, number>;
  layout: "row" | "grid";
}) {
  const occ = tables.filter((t) => (orders[t.id] || []).length > 0).length;
  return (
    <section>
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="text-[9px] uppercase tracking-[0.25em] text-primary font-bold">— {title}</div>
          <h2 className="text-sm font-black text-foreground leading-tight">{subtitle}</h2>
        </div>
        <div className="text-[11px] font-semibold text-muted-foreground">
          {occ}/{tables.length} occupied
        </div>
      </div>
      <div
        className={
          layout === "row"
            ? "grid grid-cols-3 sm:grid-cols-5 gap-2"
            : "grid grid-cols-4 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-6 gap-2"
        }
      >
        {tables.map((t, i) => (
          <TableCard
            key={t.id}
            table={t}
            lines={orders[t.id] || []}
            startedAt={starts[t.id]}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}

function useNowTick(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function TableCard({
  table: t,
  lines,
  startedAt,
  index: i,
}: {
  table: TableDef;
  lines: { name: string; price: number; qty: number }[];
  startedAt: number | undefined;
  index: number;
}) {
  const occupied = lines.length > 0;
  const amt = total(lines);
  const qty = totalQty(lines);
  const now = useNowTick(30_000);

  return (
    <Link
      to="/admin/table/$id"
      params={{ id: t.id }}
      style={{ animationDelay: `${i * 25}ms` }}
      className={`group relative animate-slide-up rounded-xl p-2.5 overflow-hidden transition-all duration-300 active:scale-[0.98] hover:-translate-y-0.5 ${
        occupied
          ? "bg-gradient-to-br from-primary via-primary to-[oklch(0.62_0.19_35)] text-primary-foreground shadow-md shadow-primary/25"
          : "bg-card text-card-foreground border border-border hover:border-primary/40 hover:shadow-sm"
      }`}
    >
      <div className="relative flex items-start justify-between">
        <div className="text-xl font-black leading-none tracking-tight">
          {t.short}
        </div>
        <span
          className={`w-1.5 h-1.5 rounded-full mt-1 ${occupied ? "bg-primary-foreground animate-pulse" : "bg-muted-foreground/40"}`}
        />
      </div>
      <div className="relative mt-2 flex items-end justify-between gap-1">
        <div className="min-w-0">
          <div className={`text-sm font-black leading-none ${occupied ? "" : "text-muted-foreground"}`}>
            ₹{amt}
          </div>
          <div
            className={`text-[9px] font-semibold uppercase tracking-wider mt-0.5 truncate ${
              occupied ? "text-primary-foreground/80" : "text-muted-foreground"
            }`}
          >
            {occupied ? `${qty} item${qty !== 1 ? "s" : ""}` : "Free"}
          </div>
        </div>
      </div>
      {occupied && startedAt && (
        <div
          className={`relative mt-1.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${
            occupied ? "text-primary-foreground/90" : "text-muted-foreground"
          }`}
          title={`Opened at ${formatBilledAt(startedAt)}`}
        >
          <Clock className="w-2.5 h-2.5" />
          <span className="truncate">{formatElapsed(startedAt, now)}</span>
        </div>
      )}
    </Link>
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
      className={`rounded-xl px-3 py-1.5 border min-w-[88px] ${
        accent
          ? "bg-foreground text-background border-foreground"
          : "bg-card text-card-foreground border-border"
      }`}
    >
      <div className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest ${accent ? "text-background/70" : "text-muted-foreground"}`}>
        {icon} {label}
      </div>
      <div className="text-base font-black leading-tight mt-0.5">{value}</div>
    </div>
  );
}
