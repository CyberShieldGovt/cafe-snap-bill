import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MENU } from "@/lib/menu";
import { useTableOrder, total, totalQty, tableLabel, type OrderLine } from "@/lib/orders";
import { createBill } from "@/lib/bills";
import { printBill } from "@/lib/print";
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
import { ArrowLeft, Minus, Plus, Trash2, Search, X, ChevronRight, ShoppingBag, Printer } from "lucide-react";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/admin/table/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Table ${params.id} — BTech Cafe` }],
  }),
  component: TableOrder,
});

function TableOrder() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { lines, save, clear } = useTableOrder(id);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>(MENU[0].id);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [discountPct, setDiscountPct] = useState<number>(0);

  const qtyOf = (name: string) => lines.find((l) => l.name === name)?.qty || 0;

  const setQty = (item: { name: string; price: number }, qty: number) => {
    let next: OrderLine[];
    const existing = lines.find((l) => l.name === item.name);
    if (existing) {
      next = qty <= 0
        ? lines.filter((l) => l.name !== item.name)
        : lines.map((l) => (l.name === item.name ? { ...l, qty } : l));
    } else if (qty > 0) {
      next = [...lines, { name: item.name, price: item.price, qty }];
    } else {
      next = lines;
    }
    save(next);
  };

  const searching = query.trim().length > 0;
  const q = query.toLowerCase();

  const searchResults = useMemo(() => {
    if (!searching) return [];
    return MENU.map((c) => ({
      ...c,
      items: c.items.filter((i) => i.name.toLowerCase().includes(q)),
    })).filter((c) => c.items.length > 0);
  }, [searching, q]);

  const currentCategory = MENU.find((c) => c.id === activeCat) || MENU[0];

  const subtotal = total(lines);
  const safePct = Math.max(0, Math.min(100, Number.isFinite(discountPct) ? discountPct : 0));
  const discountAmt = Math.round((subtotal * safePct) / 100);
  const bill = subtotal - discountAmt;
  const qty = totalQty(lines);

  /** Append a synthetic discount line so bill history + printed receipts show it. */
  const withDiscountLines = (base: OrderLine[]): OrderLine[] => {
    if (safePct <= 0 || discountAmt <= 0 || base.length === 0) return base;
    return [
      ...base,
      { name: `Discount (${safePct}%)`, price: -discountAmt, qty: 1 },
    ];
  };

  const handleSaveReadd = () => {
    save(lines);
    toast.success(`Table ${id} saved`, { description: `₹${bill} • ${qty} items` });
    navigate({ to: "/admin" });
  };

  const handleSavePrint = async (withKot: boolean) => {
    if (lines.length === 0) return;
    save(lines);
    const b = createBill({ tableId: id, tableLabel: tableLabel(id), lines: withDiscountLines(lines) });
    const res = await printBill(b, withKot);
    if (res.ok) {
      toast.success(`Bill ${b.id} printed`, {
        description: `${tableLabel(id)} · ₹${b.total}${withKot ? " · Bill + KOT" : " · Customer copy"} · ${res.printer}`,
      });
    } else {
      toast.error("Printer offline", {
        description:
          "Bill saved. Is QZ Tray running and the TVS printer connected? A preview was opened as a fallback.",
      });
    }
    // Auto settle & clear after printing
    clear();
    setDiscountPct(0);
    navigate({ to: "/admin" });
  };

  const handleSettle = () => {
    if (lines.length > 0) {
      createBill({ tableId: id, tableLabel: tableLabel(id), lines: withDiscountLines(lines) });
    }
    clear();
    setDiscountPct(0);
    setConfirmClear(false);
    toast.success(`Table ${id} settled`, { description: `Bill ₹${bill} closed` });
    navigate({ to: "/admin" });
  };


  const categoryCount = (catId: string) => {
    const cat = MENU.find((c) => c.id === catId);
    if (!cat) return 0;
    return cat.items.reduce((s, it) => s + qtyOf(it.name), 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" richColors />

      {/* Top bar */}
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
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">BTech Cafe</div>
            <div className="text-lg font-black text-foreground leading-tight">{tableLabel(id)}</div>
          </div>
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search all items…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-10 rounded-full bg-secondary border-transparent focus-visible:bg-card"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-background"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Bill</div>
            <div className="text-xl font-black text-primary leading-tight">₹{bill}</div>
          </div>
        </div>
        <div className="md:hidden mx-auto max-w-[1400px] px-4 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search all items…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-10 rounded-full bg-secondary border-transparent"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-background"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 py-6 grid grid-cols-1 lg:grid-cols-[240px_1fr_360px] gap-5">
        {/* Category Sidebar */}
        <aside className="lg:sticky lg:top-[88px] lg:self-start">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3 px-2">
            Menu · {MENU.length} sections
          </div>
          {/* Mobile: horizontal scroll */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {MENU.map((cat) => {
              const count = categoryCount(cat.id);
              const active = cat.id === activeCat && !searching;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCat(cat.id);
                    setQuery("");
                  }}
                  className={`shrink-0 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold border-2 transition ${
                    active
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card text-foreground border-border"
                  }`}
                >
                  <span className="text-base">{cat.emoji}</span>
                  {cat.name}
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Desktop: vertical rail */}
          <nav className="hidden lg:flex flex-col gap-1 rounded-3xl bg-card border-2 border-border p-2">
            {MENU.map((cat) => {
              const count = categoryCount(cat.id);
              const active = cat.id === activeCat && !searching;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCat(cat.id);
                    setQuery("");
                  }}
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all ${
                    active
                      ? "bg-foreground text-background shadow-lg"
                      : "hover:bg-secondary text-foreground"
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      active ? "bg-primary text-primary-foreground" : "bg-secondary group-hover:bg-card"
                    }`}
                  >
                    {cat.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate leading-tight">{cat.name}</div>
                    <div className={`text-[10px] ${active ? "text-background/60" : "text-muted-foreground"}`}>
                      {cat.items.length} items
                    </div>
                  </div>
                  {count > 0 ? (
                    <span className="bg-primary text-primary-foreground text-[10px] font-black px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                  ) : (
                    <ChevronRight className={`w-4 h-4 transition-transform ${active ? "translate-x-0" : "opacity-40 group-hover:translate-x-0.5"}`} />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Items */}
        <div>
          {searching ? (
            <div className="space-y-8">
              <div className="text-sm text-muted-foreground">
                Results for <span className="font-semibold text-foreground">"{query}"</span>
              </div>
              {searchResults.length === 0 && (
                <div className="text-center py-16 text-muted-foreground rounded-3xl border-2 border-dashed border-border">
                  No items match your search.
                </div>
              )}
              {searchResults.map((cat) => (
                <CategorySection
                  key={cat.id}
                  category={cat}
                  qtyOf={qtyOf}
                  setQty={setQty}
                />
              ))}
            </div>
          ) : (
            <CategorySection category={currentCategory} qtyOf={qtyOf} setQty={setQty} big />
          )}
        </div>

        {/* Bill sidebar (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-[88px] rounded-3xl border-2 border-border bg-card p-5 shadow-lg">
            <BillPanel
              lines={lines}
              onQty={setQty}
              onRemove={(name) => save(lines.filter((l) => l.name !== name))}
              onSave={handleSaveReadd}
              onPrint={handleSavePrint}
              onSettle={() => setConfirmClear(true)}
              subtotal={subtotal}
              discountPct={safePct}
              onDiscountPctChange={setDiscountPct}
              discountAmt={discountAmt}
              bill={bill}
              qty={qty}
            />
          </div>
        </aside>
      </div>

      {/* Mobile Bill FAB / Drawer */}
      <div className="lg:hidden">
        {qty > 0 && !showBill && (
          <button
            onClick={() => setShowBill(true)}
            className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 px-5 py-3.5 font-bold active:scale-95 transition"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>{qty} • ₹{bill}</span>
            <span className="text-lg leading-none">→</span>
          </button>
        )}
        {showBill && (
          <div className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowBill(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 inset-x-0 rounded-t-3xl bg-card border-t-2 border-border shadow-2xl max-h-[85vh] overflow-auto animate-slide-up"
            >
              <div className="sticky top-0 bg-card p-4 flex items-center justify-between border-b border-border">
                <div className="font-bold text-lg">Bill · {tableLabel(id)}</div>
                <button onClick={() => setShowBill(false)} className="p-2 rounded-full hover:bg-secondary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5">
                <BillPanel
                  lines={lines}
                  onQty={setQty}
                  onRemove={(name) => save(lines.filter((l) => l.name !== name))}
                  onSave={handleSaveReadd}
                  onPrint={handleSavePrint}
                  onSettle={() => setConfirmClear(true)}
                  subtotal={subtotal}
                  discountPct={safePct}
                  onDiscountPctChange={setDiscountPct}
                  discountAmt={discountAmt}
                  bill={bill}
                  qty={qty}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Settle this bill and clear the table?</AlertDialogTitle>
            <AlertDialogDescription>
              Table {id} will be marked Available and the ₹{bill} bill will be closed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSettle} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Settle & Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CategorySection({
  category,
  qtyOf,
  setQty,
  big,
}: {
  category: (typeof MENU)[number];
  qtyOf: (name: string) => number;
  setQty: (item: { name: string; price: number }, qty: number) => void;
  big?: boolean;
}) {
  return (
    <section className="animate-slide-up" key={category.id}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-foreground text-background flex items-center justify-center text-2xl shadow-md">
          {category.emoji}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-primary font-bold">Category</div>
          <h2 className={`font-black tracking-tight text-foreground leading-tight ${big ? "text-3xl" : "text-2xl"}`}>
            {category.name}
          </h2>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">{category.items.length} items</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-3">
        {category.items.map((item, i) => {
          const q = qtyOf(item.name);
          const active = q > 0;
          return (
            <div
              key={item.name}
              style={{ animationDelay: `${i * 25}ms` }}
              className={`animate-slide-up group relative rounded-2xl border-2 p-4 transition-all ${
                active
                  ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-md shadow-primary/10"
                  : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-foreground leading-tight">{item.name}</div>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="text-lg font-black text-primary">₹{item.price}</span>
                    {active && (
                      <span className="text-[11px] text-muted-foreground">
                        · Sub ₹{item.price * q}
                      </span>
                    )}
                  </div>
                </div>
                {active ? (
                  <div className="flex items-center gap-1 bg-primary text-primary-foreground rounded-full p-1 shadow-md">
                    <button
                      onClick={() => setQty(item, q - 1)}
                      className="w-8 h-8 rounded-full hover:bg-primary-foreground/20 flex items-center justify-center active:scale-90 transition"
                      aria-label="Decrease"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center font-black">{q}</span>
                    <button
                      onClick={() => setQty(item, q + 1)}
                      className="w-8 h-8 rounded-full hover:bg-primary-foreground/20 flex items-center justify-center active:scale-90 transition"
                      aria-label="Increase"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setQty(item, 1)}
                    className="rounded-full bg-foreground text-background font-bold text-sm px-4 h-9 hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BillPanel({
  lines,
  onQty,
  onRemove,
  onSave,
  onPrint,
  onSettle,
  subtotal,
  discountPct,
  onDiscountPctChange,
  discountAmt,
  bill,
  qty,
}: {
  lines: OrderLine[];
  onQty: (item: { name: string; price: number }, qty: number) => void;
  onRemove: (name: string) => void;
  onSave: () => void;
  onPrint: (withKot: boolean) => void;
  onSettle: () => void;
  subtotal: number;
  discountPct: number;
  onDiscountPctChange: (n: number) => void;
  discountAmt: number;
  bill: number;
  qty: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Live Bill</div>
          <h3 className="text-xl font-black text-foreground">Order Summary</h3>
        </div>
        <span className="bg-secondary text-secondary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
          {qty} item{qty !== 1 ? "s" : ""}
        </span>
      </div>
      {lines.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center border-2 border-dashed border-border rounded-2xl">
          <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Bill is empty. Add items to get started.
        </div>
      ) : (
        <div className="space-y-1 max-h-80 overflow-auto pr-1 -mr-1">
          {lines.map((l) => (
            <div key={l.name} className="flex items-center gap-2 py-2.5 border-b border-border last:border-0">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate text-foreground">{l.name}</div>
                <div className="text-xs text-muted-foreground">₹{l.price} × {l.qty} = <span className="font-bold text-foreground">₹{l.price * l.qty}</span></div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onQty(l, l.qty - 1)}
                  className="w-7 h-7 rounded-full bg-secondary hover:bg-secondary/70 flex items-center justify-center"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-5 text-center font-bold text-sm">{l.qty}</span>
                <button
                  onClick={() => onQty(l, l.qty + 1)}
                  className="w-7 h-7 rounded-full bg-secondary hover:bg-secondary/70 flex items-center justify-center"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onRemove(l.name)}
                  className="w-7 h-7 rounded-full text-destructive hover:bg-destructive/10 flex items-center justify-center ml-1"
                  aria-label="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-2xl border-2 border-border bg-secondary/40 p-3 flex items-center gap-3">
        <label htmlFor="discount-pct" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Discount
        </label>
        <div className="relative flex-1">
          <Input
            id="discount-pct"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            value={discountPct === 0 ? "" : discountPct}
            onChange={(e) => {
              const v = e.target.value === "" ? 0 : parseFloat(e.target.value);
              onDiscountPctChange(Number.isFinite(v) ? v : 0);
            }}
            placeholder="0"
            className="h-9 pr-8 text-right font-bold"
            disabled={lines.length === 0}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">%</span>
        </div>
        <div className="text-sm font-bold text-primary whitespace-nowrap">
          −₹{discountAmt}
        </div>
      </div>
      <div className="rounded-2xl bg-foreground text-background p-4">
        <div className="flex items-center justify-between text-xs text-background/70">
          <span>Subtotal</span>
          <span>₹{subtotal}</span>
        </div>
        {discountAmt > 0 && (
          <div className="flex items-center justify-between text-xs text-background/70 mt-1">
            <span>Discount ({discountPct}%)</span>
            <span>−₹{discountAmt}</span>
          </div>
        )}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-background/20">
          <span className="font-bold">Grand Total</span>
          <span className="text-2xl font-black text-primary">₹{bill}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={onSave}
          disabled={lines.length === 0}
          className="h-12 rounded-2xl font-bold bg-secondary text-secondary-foreground hover:bg-secondary/70 border-2 border-border"
        >
          Save & Re-add
        </Button>
        <Button
          onClick={onSettle}
          disabled={lines.length === 0}
          className="h-12 rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30"
        >
          Settle & Clear
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <Button
          onClick={() => onPrint(true)}
          disabled={lines.length === 0}
          className="w-full h-12 rounded-2xl font-bold bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" /> Save & KOT Print
        </Button>
        <Button
          onClick={() => onPrint(false)}
          disabled={lines.length === 0}
          variant="outline"
          className="w-full h-12 rounded-2xl font-bold border-2 flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" /> Save & Print (Customer Copy)
        </Button>
      </div>
    </div>
  );
}

