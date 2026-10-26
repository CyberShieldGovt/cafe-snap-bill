import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ArrowLeft, IndianRupee, Target, CalendarDays, Receipt, TrendingUp, Utensils, CircleCheck } from "lucide-react";
import { buildExpectedSummary } from "@/lib/expected-sales";

export const Route = createFileRoute("/admin/expected-sales")({
  head: () => ({
    meta: [{ title: "Expected Sales — BTech Cafe" }],
  }),
  component: ExpectedSalesPage,
});

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function ExpectedSalesPage() {
  const s = useMemo(() => buildExpectedSummary(new Date()), []);

  const targetPct = Math.min(100, Math.round((s.mtdSales / s.monthlyTargetLow) * 100));
  const chartData = s.days.map((d) => ({ day: d.short, sales: d.sales }));
  const topItem = s.items[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-lg">
        <div className="mx-auto max-w-[1400px] px-4 py-3 flex items-center gap-3">
          <Link
            to="/admin"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold hover:bg-secondary text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" /> Tables
          </Link>
          <div className="h-8 w-px bg-border" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              BTech Cafe · {s.monthLabel}
            </div>
            <div className="text-lg font-black text-foreground leading-tight">Expected Sales</div>
          </div>
          <Link
            to="/admin/sales"
            className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition"
          >
            Sales Summary →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 space-y-6">
        {/* Target banner */}
        <section className="rounded-3xl border-2 border-border bg-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-primary font-bold">— Monthly Target</div>
              <h3 className="text-2xl font-black text-foreground leading-tight">
                {inr(s.monthlyTargetLow)} – {inr(s.monthlyTargetHigh)}
              </h3>
              <div className="text-xs font-semibold text-muted-foreground mt-1">
                Daily target {inr(s.dailyTargetLow)} – {inr(s.dailyTargetHigh)} · start of month to today
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Month till date</div>
              <div className="text-2xl font-black text-primary leading-tight">{inr(s.mtdSales)}</div>
              <div className="text-xs font-semibold text-muted-foreground">{targetPct}% of target</div>
            </div>
          </div>
          <div className="mt-4 h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[oklch(0.62_0.19_35)] transition-all"
              style={{ width: `${targetPct}%` }}
            />
          </div>
        </section>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <Stat label="Sales Till Date" value={inr(s.mtdSales)} icon={<IndianRupee className="w-4 h-4" />} accent />
          <Stat label="Expected / Day" value={`${inr(s.dailyTargetLow)}–${inr(s.dailyTargetHigh).slice(1)}`} icon={<Target className="w-4 h-4" />} />
          <Stat label="Avg / Day" value={inr(s.avgPerDay)} icon={<TrendingUp className="w-4 h-4" />} />
          <Stat label="Settled Tables" value={String(s.mtdTables)} icon={<CircleCheck className="w-4 h-4" />} />
          <Stat label="Bills" value={String(s.mtdOrders)} icon={<Receipt className="w-4 h-4" />} />
          <Stat label="Days Counted" value={`${s.elapsedDays}/${s.daysInMonth}`} icon={<CalendarDays className="w-4 h-4" />} />
        </div>

        {/* Chart */}
        <section className="rounded-3xl border-2 border-border bg-card p-5">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-primary font-bold">— {s.monthLabel}</div>
              <h3 className="text-xl font-black text-foreground">Expected Sales Per Day</h3>
            </div>
            <div className="text-xs text-muted-foreground font-semibold">
              {s.elapsedDays} days · {inr(s.mtdSales)} total
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [inr(v), "Expected"]}
                />
                <Bar dataKey="sales" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Item-wise summary */}
        <section className="rounded-3xl border-2 border-border bg-card p-5">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-primary font-bold">— {s.monthLabel}</div>
              <h3 className="text-xl font-black text-foreground">Items Expected Sold</h3>
            </div>
            <div className="text-xs text-muted-foreground font-semibold">
              {s.items.length} unique · {s.items.reduce((a, i) => a + i.qty, 0)} total
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {s.items.map((it, idx) => (
              <div
                key={it.name}
                className={`flex items-center justify-between gap-2 rounded-2xl border-2 px-3 py-2.5 ${
                  idx === 0 ? "bg-foreground text-background border-foreground" : "bg-secondary/40 border-border"
                }`}
              >
                <div className="min-w-0">
                  <span className="text-sm font-semibold truncate block">{it.name}</span>
                  <span className={`text-[10px] font-bold ${idx === 0 ? "text-background/70" : "text-muted-foreground"}`}>
                    {inr(it.amount)}
                  </span>
                </div>
                <span
                  className={`shrink-0 text-xs font-black px-2 py-0.5 rounded-full ${
                    idx === 0 ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
                  }`}
                >
                  {it.qty}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Daily breakdown */}
        <section className="rounded-3xl border-2 border-border bg-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-primary font-bold">— Day by Day</div>
              <h3 className="text-xl font-black text-foreground">Daily Breakdown</h3>
            </div>
            {topItem && (
              <div className="text-xs text-muted-foreground font-semibold">
                Top seller: <span className="text-foreground font-bold">{topItem.name}</span>
              </div>
            )}
          </div>
          <div className="overflow-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-foreground">
                <tr className="text-left">
                  <Th>Date</Th>
                  <Th>Expected Sales</Th>
                  <Th>Settled Tables</Th>
                  <Th>Bills</Th>
                  <Th>Avg / Bill</Th>
                  <Th className="text-right pr-4">Top Item</Th>
                </tr>
              </thead>
              <tbody>
                {s.days.map((d) => {
                  const top = d.items[0];
                  return (
                    <tr key={d.label} className="border-t border-border hover:bg-secondary/40">
                      <Td className="font-bold">{d.label}</Td>
                      <Td className="font-bold text-primary">{inr(d.sales)}</Td>
                      <Td>{d.tables}</Td>
                      <Td>{d.orders}</Td>
                      <Td>{inr(Math.round(d.sales / Math.max(1, d.orders)))}</Td>
                      <Td className="text-right pr-4">
                        {top ? `${top.name} × ${top.qty}` : "—"}
                      </Td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-border bg-secondary/60">
                  <Td className="font-black">Total</Td>
                  <Td className="font-black text-primary">{inr(s.mtdSales)}</Td>
                  <Td className="font-black">{s.mtdTables}</Td>
                  <Td className="font-black">{s.mtdOrders}</Td>
                  <Td className="font-black">{inr(Math.round(s.mtdSales / Math.max(1, s.mtdOrders)))}</Td>
                  <Td className="text-right pr-4">
                    <Utensils className="w-4 h-4 inline" />
                  </Td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] font-semibold text-muted-foreground">
            Plan figures from the start of the month — daily values sit in the ₹7,000–₹11,500 band with the month
            tracking ₹1.8L till date against the ₹3.5–4L monthly target.
          </p>
        </section>
      </main>
    </div>
  );
}

function Stat({
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
      className={`rounded-2xl px-4 py-3 border-2 ${
        accent ? "bg-foreground text-background border-foreground" : "bg-card text-card-foreground border-border"
      }`}
    >
      <div
        className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${
          accent ? "text-background/70" : "text-muted-foreground"
        }`}
      >
        {icon} {label}
      </div>
      <div className="text-lg font-black leading-tight mt-1 truncate">{value}</div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest ${className}`}>{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 ${className}`}>{children}</td>;
}
