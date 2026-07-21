import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  format,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  ArrowLeft,
  Search,
  Printer,
  Eye,
  Trash2,
  IndianRupee,
  Receipt,
  TrendingUp,
  Timer,
  X,
} from "lucide-react";
import { useBills, type Bill } from "@/lib/bills";
import { useAllOrders } from "@/lib/orders";
import { printBill, getPrinterWidth, setPrinterWidth, type PrinterWidth } from "@/lib/print";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Toaster, toast } from "sonner";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [{ title: "Sales Summary — BTech Cafe" }],
  }),
  component: SalesPage,
});

type Preset = "today" | "yesterday" | "7d" | "30d" | "month" | "all";

function rangeFor(preset: Preset): { from: number; to: number } {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: +startOfDay(now), to: +endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: +startOfDay(y), to: +endOfDay(y) };
    }
    case "7d":
      return { from: +startOfDay(subDays(now, 6)), to: +endOfDay(now) };
    case "30d":
      return { from: +startOfDay(subDays(now, 29)), to: +endOfDay(now) };
    case "month":
      return { from: +startOfMonth(now), to: +endOfMonth(now) };
    case "all":
      return { from: 0, to: +endOfDay(now) };
  }
}

function SalesPage() {
  const { bills, remove } = useBills();
  const orders = useAllOrders();
  const [preset, setPreset] = useState<Preset>("today");
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState<Bill | null>(null);

  const { from, to } = rangeFor(preset);
  const inRange = useMemo(
    () => bills.filter((b) => b.createdAt >= from && b.createdAt <= to),
    [bills, from, to]
  );

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return inRange;
    return inRange.filter(
      (b) =>
        b.id.toLowerCase().includes(q) ||
        b.tableLabel.toLowerCase().includes(q) ||
        b.date.toLowerCase().includes(q) ||
        String(b.total).includes(q)
    );
  }, [inRange, q]);

  const todayRange = rangeFor("today");
  const today = bills.filter(
    (b) => b.createdAt >= todayRange.from && b.createdAt <= todayRange.to
  );
  const todaySales = today.reduce((s, b) => s + b.total, 0);
  const ordersToday = today.length;
  const avgBill = ordersToday ? Math.round(todaySales / ordersToday) : 0;
  const highest = today.reduce((m, b) => Math.max(m, b.total), 0);
  const lowest = ordersToday ? today.reduce((m, b) => Math.min(m, b.total), Infinity) : 0;
  const pendingTables = Object.keys(orders).length;
  const completed = bills.length;

  // Items sold today: sum quantities per item across today's bills
  const itemsSoldToday = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of today) {
      for (const l of b.lines) {
        map.set(l.name, (map.get(l.name) || 0) + l.qty);
      }
    }
    return Array.from(map.entries())
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);
  }, [today]);

  const [printerWidth, setPrinterWidthState] = useState<PrinterWidth>(58);
  useEffect(() => {
    setPrinterWidthState(getPrinterWidth());
  }, []);
  const changeWidth = (w: PrinterWidth) => {
    setPrinterWidth(w);
    setPrinterWidthState(w);
  };

  // Daily chart across preset range
  const chartData = useMemo(() => {
    const start = new Date(Math.max(from, +subDays(new Date(), 29)));
    const days = eachDayOfInterval({ start, end: new Date(to) });
    return days.map((d) => {
      const sum = bills
        .filter((b) => isSameDay(new Date(b.createdAt), d))
        .reduce((s, b) => s + b.total, 0);
      return { day: format(d, "d MMM"), sales: sum };
    });
  }, [bills, from, to]);

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" richColors />
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-lg">
        <div className="mx-auto max-w-[1400px] px-4 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold hover:bg-secondary text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" /> Tables
          </Link>
          <div className="h-8 w-px bg-border" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              BTech Cafe
            </div>
            <div className="text-lg font-black text-foreground leading-tight">Sales Summary</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <Stat label="Today's Sales" value={`₹${todaySales}`} icon={<IndianRupee className="w-4 h-4" />} accent />
          <Stat label="Orders Today" value={String(ordersToday)} icon={<Receipt className="w-4 h-4" />} />
          <Stat label="Average Bill" value={`₹${avgBill}`} icon={<TrendingUp className="w-4 h-4" />} />
          <Stat label="Highest Bill" value={`₹${highest}`} icon={<TrendingUp className="w-4 h-4" />} />
          <Stat label="Lowest Bill" value={`₹${lowest}`} icon={<TrendingUp className="w-4 h-4" />} />
          <Stat label="Pending Tables" value={String(pendingTables)} icon={<Timer className="w-4 h-4" />} />
          <Stat label="Completed Bills" value={String(completed)} icon={<Receipt className="w-4 h-4" />} />
        </div>

        {/* Chart */}
        <section className="rounded-3xl border-2 border-border bg-card p-5">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-primary font-bold">— Trends</div>
              <h3 className="text-xl font-black text-foreground">Sales Over Time</h3>
            </div>
            <PresetPicker value={preset} onChange={setPreset} />
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
                  formatter={(v: number) => [`₹${v}`, "Sales"]}
                />
                <Bar dataKey="sales" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Bills table */}
        <section className="rounded-3xl border-2 border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-primary font-bold">— History</div>
              <h3 className="text-xl font-black text-foreground">Bills</h3>
            </div>
            <div className="ml-auto relative w-full max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search bill / table / amount / date"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 h-10 rounded-full bg-secondary border-transparent"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground rounded-2xl border-2 border-dashed border-border">
              No bills found for this filter.
            </div>
          ) : (
            <div className="overflow-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-foreground">
                  <tr className="text-left">
                    <Th>Bill No</Th>
                    <Th>Table</Th>
                    <Th>Items</Th>
                    <Th>Amount</Th>
                    <Th>Status</Th>
                    <Th>Date</Th>
                    <Th>Time</Th>
                    <Th className="text-right pr-4">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id} className="border-t border-border hover:bg-secondary/40">
                      <Td className="font-bold">{b.id}</Td>
                      <Td>{b.tableLabel}</Td>
                      <Td>{b.itemCount}</Td>
                      <Td className="font-bold text-primary">₹{b.total}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {b.status}
                        </span>
                      </Td>
                      <Td>{b.date}</Td>
                      <Td>{b.time}</Td>
                      <Td className="text-right pr-2">
                        <div className="inline-flex items-center gap-1">
                          <IconBtn label="View" onClick={() => setViewing(b)}>
                            <Eye className="w-4 h-4" />
                          </IconBtn>
                          <IconBtn label="Reprint" onClick={() => printBill(b)}>
                            <Printer className="w-4 h-4" />
                          </IconBtn>
                          <IconBtn label="Delete" onClick={() => setDeleting(b)} destructive>
                            <Trash2 className="w-4 h-4" />
                          </IconBtn>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* View modal */}
      {viewing && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-card border-2 border-border shadow-2xl max-h-[85vh] overflow-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card p-4 flex items-center justify-between border-b border-border">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Bill</div>
                <div className="font-black text-lg">#{viewing.id}</div>
              </div>
              <button
                onClick={() => setViewing(null)}
                className="p-2 rounded-full hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Table</span>
                <span className="font-semibold">{viewing.tableLabel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span>{viewing.date} · {viewing.time}</span>
              </div>
              <div className="rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60">
                    <tr>
                      <Th>Item</Th>
                      <Th className="text-center">Qty</Th>
                      <Th className="text-right pr-3">Amt</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewing.lines.map((l) => (
                      <tr key={l.name} className="border-t border-border">
                        <Td>{l.name}</Td>
                        <Td className="text-center">{l.qty}</Td>
                        <Td className="text-right pr-3">₹{l.price * l.qty}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rounded-2xl bg-foreground text-background p-4 flex items-center justify-between">
                <span className="font-bold">Grand Total</span>
                <span className="text-2xl font-black text-primary">₹{viewing.total}</span>
              </div>
              <Button
                onClick={() => printBill(viewing)}
                className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Reprint Receipt
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bill #{deleting?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the bill from history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) {
                  remove(deleting.id);
                  toast.success(`Bill ${deleting.id} deleted`);
                  setDeleting(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
      className={`rounded-2xl p-4 border-2 ${
        accent
          ? "bg-foreground text-background border-foreground"
          : "bg-card text-card-foreground border-border"
      }`}
    >
      <div
        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${
          accent ? "text-background/70" : "text-muted-foreground"
        }`}
      >
        {icon} {label}
      </div>
      <div className="text-xl font-black mt-1">{value}</div>
    </div>
  );
}

function PresetPicker({ value, onChange }: { value: Preset; onChange: (p: Preset) => void }) {
  const items: { id: Preset; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "7d", label: "7 Days" },
    { id: "30d", label: "30 Days" },
    { id: "month", label: "This Month" },
    { id: "all", label: "All" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 transition ${
            value === it.id
              ? "bg-foreground text-background border-foreground"
              : "bg-card text-foreground border-border hover:border-primary/40"
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2 text-[10px] uppercase tracking-widest font-bold ${className}`}>
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 ${className}`}>{children}</td>;
}

function IconBtn({
  children,
  onClick,
  label,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}
