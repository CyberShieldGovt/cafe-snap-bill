import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MENU } from "@/lib/menu";
import { useTableOrder, total, totalQty, type OrderLine } from "@/lib/orders";
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
import { ArrowLeft, Minus, Plus, Trash2, Search, X } from "lucide-react";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/table/$id")({
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
  const [confirmClear, setConfirmClear] = useState(false);

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

  const filteredMenu = useMemo(() => {
    if (!query.trim()) return MENU;
    const q = query.toLowerCase();
    return MENU.map((c) => ({
      ...c,
      items: c.items.filter((i) => i.name.toLowerCase().includes(q)),
    })).filter((c) => c.items.length > 0);
  }, [query]);

  const bill = total(lines);
  const qty = totalQty(lines);

  const handleSaveReadd = () => {
    save(lines);
    toast.success(`Table ${id} saved`, { description: `₹${bill} • ${qty} items` });
    navigate({ to: "/" });
  };

  const handleSettle = () => {
    clear();
    setConfirmClear(false);
    toast.success(`Table ${id} settled`, { description: `Bill ₹${bill} closed` });
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background pb-96 lg:pb-8">
      <Toaster position="top-center" richColors />

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium hover:bg-secondary text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">BTech Cafe</div>
            <div className="text-lg font-bold text-foreground">Table {id}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Current bill</div>
            <div className="text-xl font-bold text-primary">₹{bill}</div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search menu…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-11 rounded-full"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-secondary"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-4 grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Menu */}
        <div className="space-y-8">
          {filteredMenu.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No items match "{query}"</div>
          )}
          {filteredMenu.map((cat) => (
            <section key={cat.id}>
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2 text-foreground">
                <span className="text-2xl">{cat.emoji}</span> {cat.name}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cat.items.map((item) => {
                  const q = qtyOf(item.name);
                  const active = q > 0;
                  return (
                    <div
                      key={item.name}
                      className={`rounded-2xl border-2 p-4 transition-all ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground truncate">{item.name}</div>
                          <div className="text-primary font-bold mt-1">₹{item.price}</div>
                        </div>
                        {active ? (
                          <div className="flex items-center gap-1 bg-primary text-primary-foreground rounded-full p-1">
                            <button
                              onClick={() => setQty(item, q - 1)}
                              className="w-8 h-8 rounded-full hover:bg-primary-foreground/20 flex items-center justify-center"
                              aria-label="Decrease"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-6 text-center font-bold">{q}</span>
                            <button
                              onClick={() => setQty(item, q + 1)}
                              className="w-8 h-8 rounded-full hover:bg-primary-foreground/20 flex items-center justify-center"
                              aria-label="Increase"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setQty(item, 1)}
                            className="rounded-full bg-primary text-primary-foreground font-semibold text-sm px-4 h-9 hover:bg-primary/90 active:scale-95 transition"
                          >
                            Add
                          </button>
                        )}
                      </div>
                      {active && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Subtotal ₹{item.price * q}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Bill sidebar (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-32 rounded-2xl border-2 border-border bg-card p-5">
            <BillPanel
              lines={lines}
              onQty={setQty}
              onRemove={(name) => save(lines.filter((l) => l.name !== name))}
              onSave={handleSaveReadd}
              onSettle={() => setConfirmClear(true)}
              bill={bill}
              qty={qty}
            />
          </div>
        </aside>
      </div>

      {/* Sticky bottom bill (mobile/tablet) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t-2 border-border bg-card shadow-2xl">
        <details className="group">
          <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">{qty} items</div>
              <div className="text-xl font-bold text-foreground">₹{bill}</div>
            </div>
            <div className="text-sm font-medium text-primary group-open:hidden">View bill ↑</div>
            <div className="text-sm font-medium text-primary hidden group-open:block">Hide ↓</div>
          </summary>
          <div className="px-4 pb-4 max-h-[60vh] overflow-auto border-t border-border pt-3">
            <BillPanel
              lines={lines}
              onQty={setQty}
              onRemove={(name) => save(lines.filter((l) => l.name !== name))}
              onSave={handleSaveReadd}
              onSettle={() => setConfirmClear(true)}
              bill={bill}
              qty={qty}
            />
          </div>
        </details>
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

function BillPanel({
  lines,
  onQty,
  onRemove,
  onSave,
  onSettle,
  bill,
  qty,
}: {
  lines: OrderLine[];
  onQty: (item: { name: string; price: number }, qty: number) => void;
  onRemove: (name: string) => void;
  onSave: () => void;
  onSettle: () => void;
  bill: number;
  qty: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">Live Bill</h3>
        <span className="text-xs text-muted-foreground">{qty} items</span>
      </div>
      {lines.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          No items yet. Tap "Add" on any dish.
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-auto pr-1">
          {lines.map((l) => (
            <div key={l.name} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate text-foreground">{l.name}</div>
                <div className="text-xs text-muted-foreground">₹{l.price} × {l.qty} = ₹{l.price * l.qty}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onQty(l, l.qty - 1)}
                  className="w-7 h-7 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center font-semibold text-sm">{l.qty}</span>
                <button
                  onClick={() => onQty(l, l.qty + 1)}
                  className="w-7 h-7 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center"
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
      <div className="flex items-center justify-between pt-3 border-t-2 border-border">
        <span className="font-semibold text-foreground">Grand Total</span>
        <span className="text-2xl font-bold text-primary">₹{bill}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={onSave}
          disabled={lines.length === 0}
          className="h-12 rounded-xl font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80"
        >
          Save & Re-add
        </Button>
        <Button
          onClick={onSettle}
          disabled={lines.length === 0}
          className="h-12 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Save & Clear
        </Button>
      </div>
    </div>
  );
}
