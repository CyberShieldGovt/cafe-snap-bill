import { createFileRoute, Link } from "@tanstack/react-router";
import { TABLE_COUNT, useAllOrders, total, totalQty } from "@/lib/orders";
import { Coffee, Utensils, TrendingUp, Circle } from "lucide-react";

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
  const tables = Array.from({ length: TABLE_COUNT }, (_, i) => i + 1);

  const occupiedCount = tables.filter((n) => (orders[String(n)] || []).length > 0).length;
  const grandTotal = tables.reduce((s, n) => s + total(orders[String(n)] || []), 0);
  const itemsServed = tables.reduce((s, n) => s + totalQty(orders[String(n)] || []), 0);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-primary/20 blur-3xl animate-float-slow" />
        <div className="absolute top-40 -right-32 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl animate-float-slower" />
        <div className="absolute inset-0 bg-grid opacity-40" />
      </div>

      {/* Hero */}
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
            <div className="flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1.5 shadow-sm">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary/60 animate-pulse-ring" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-primary" />
              </span>
              <span className="text-xs font-medium text-foreground">Live • Offline mode</span>
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
              Tap a table below to take orders, edit bills, or settle up. Everything is saved instantly — no internet needed.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl">
            <StatCard icon={<Circle className="w-4 h-4" />} label="Occupied" value={`${occupiedCount}/${TABLE_COUNT}`} accent />
            <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Open bill" value={`₹${grandTotal}`} />
            <StatCard icon={<Utensils className="w-4 h-4" />} label="Items live" value={String(itemsServed)} />
          </div>
        </div>
      </header>

      {/* Tables */}
      <main className="relative mx-auto max-w-6xl px-6 pb-16">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Your tables</h2>
            <p className="text-sm text-muted-foreground">Tap a card to open the order screen.</p>
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">
            <span className="inline-block w-2 h-2 rounded-full bg-primary mr-1.5 align-middle" />
            Occupied
            <span className="inline-block w-2 h-2 rounded-full bg-border mx-1.5 ml-4 align-middle" />
            Available
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tables.map((n, i) => {
            const lines = orders[String(n)] || [];
            const occupied = lines.length > 0;
            const amt = total(lines);
            const qty = totalQty(lines);
            return (
              <Link
                key={n}
                to="/table/$id"
                params={{ id: String(n) }}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`group relative animate-slide-up rounded-[28px] p-6 overflow-hidden transition-all duration-300 active:scale-[0.98] hover:-translate-y-1 ${
                  occupied
                    ? "bg-gradient-to-br from-primary via-primary to-[oklch(0.62_0.19_35)] text-primary-foreground shadow-2xl shadow-primary/40"
                    : "bg-card text-card-foreground border-2 border-border hover:border-primary/40 hover:shadow-xl"
                }`}
              >
                {/* decorative */}
                <div
                  className={`absolute -right-12 -top-12 w-40 h-40 rounded-full ${
                    occupied ? "bg-primary-foreground/10" : "bg-primary/5"
                  } transition-transform duration-500 group-hover:scale-125`}
                />
                <div
                  className={`absolute -right-6 -bottom-8 w-28 h-28 rounded-full ${
                    occupied ? "bg-primary-foreground/5" : "bg-primary/[0.03]"
                  }`}
                />

                <div className="relative flex items-start justify-between">
                  <div>
                    <div
                      className={`text-[10px] font-bold uppercase tracking-[0.25em] ${
                        occupied ? "text-primary-foreground/80" : "text-muted-foreground"
                      }`}
                    >
                      Table No.
                    </div>
                    <div className="text-6xl font-black mt-1 leading-none tracking-tighter">
                      {String(n).padStart(2, "0")}
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full ${
                      occupied
                        ? "bg-primary-foreground/20 text-primary-foreground backdrop-blur-sm"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${occupied ? "bg-primary-foreground animate-pulse" : "bg-muted-foreground/50"}`}
                    />
                    {occupied ? "OCCUPIED" : "AVAILABLE"}
                  </div>
                </div>

                <div className="relative mt-10 flex items-end justify-between">
                  <div>
                    <div
                      className={`text-[10px] font-bold uppercase tracking-widest ${
                        occupied ? "text-primary-foreground/80" : "text-muted-foreground"
                      }`}
                    >
                      Current Bill
                    </div>
                    <div className="text-3xl font-black mt-1">₹{amt}</div>
                    {occupied && (
                      <div className="text-xs mt-1 text-primary-foreground/80">
                        {qty} item{qty !== 1 ? "s" : ""} running
                      </div>
                    )}
                  </div>
                  <div
                    className={`text-sm font-bold flex items-center gap-1 transition-all group-hover:gap-2 ${
                      occupied ? "text-primary-foreground" : "text-primary"
                    }`}
                  >
                    {occupied ? "Continue" : "Open"}
                    <span className="text-lg">→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <footer className="mt-16 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© BTech Cafe • Temporary POS while PetPooja is down</div>
          <div className="flex items-center gap-4">
            <span>💾 Auto-saves locally</span>
            <span>📶 Works offline</span>
          </div>
        </footer>
      </main>
    </div>
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
