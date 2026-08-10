import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2, Wallet, TrendingDown, ChefHat, ShoppingBasket, Carrot, Drumstick, Milk } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";
import { useExpenses, addExpense, deleteExpense, type ExpenseCategory, type ChefName, type PayType } from "@/lib/expenses";

export const Route = createFileRoute("/admin/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — BTech Cafe" },
      { name: "description", content: "Track daily cafe expenses: chef payments, grocery, vegetables, chicken and milk." },
    ],
  }),
  component: ExpensesPage,
});

type CatDef = { id: ExpenseCategory; label: string; icon: React.ReactNode; color: string };
const CATS: CatDef[] = [
  { id: "chef", label: "Chef's Payment", icon: <ChefHat className="w-4 h-4" />, color: "bg-primary/10 text-primary" },
  { id: "grocery", label: "Grocery", icon: <ShoppingBasket className="w-4 h-4" />, color: "bg-amber-500/10 text-amber-600" },
  { id: "vegetables", label: "Vegetables", icon: <Carrot className="w-4 h-4" />, color: "bg-green-500/10 text-green-600" },
  { id: "chicken", label: "Chicken", icon: <Drumstick className="w-4 h-4" />, color: "bg-red-500/10 text-red-600" },
  { id: "milk", label: "Milk", icon: <Milk className="w-4 h-4" />, color: "bg-blue-500/10 text-blue-600" },
];

function ExpensesPage() {
  const { list } = useExpenses();
  const [cat, setCat] = useState<ExpenseCategory>("chef");
  const [chef, setChef] = useState<ChefName>("Hussain");
  const [payType, setPayType] = useState<PayType>("daily");
  const [amount, setAmount] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("Kg");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayTotal = list.filter((e) => e.spent_at.startsWith(todayKey)).reduce((s, e) => s + e.amount, 0);
  const monthKey = todayKey.slice(0, 7);
  const monthTotal = list.filter((e) => e.spent_at.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0);

  const filtered = useMemo(() => list.filter((e) => e.category === cat), [list, cat]);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await addExpense({
        category: cat,
        subcategory: cat === "chef" ? chef : null,
        pay_type: cat === "chef" ? payType : null,
        quantity: cat === "chicken" || cat === "milk" ? (Number(qty) || null) : null,
        unit: cat === "chicken" ? "Kg" : cat === "milk" ? unit : null,
        amount: amt,
        note: note.trim() || null,
      });
      toast.success("Expense added");
      setAmount("");
      setQty("");
      setNote("");
    } catch (e) {
      toast.error("Failed to save");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteExpense(id);
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" richColors />
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <Link to="/admin" className="p-2 -ml-2 rounded-lg hover:bg-muted transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-primary font-bold">— Expense Tracker</div>
            <h1 className="text-lg font-black leading-tight">Expenses</h1>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Stat label="Today" value={`₹${todayTotal}`} icon={<TrendingDown className="w-3.5 h-3.5" />} />
            <Stat label="This Month" value={`₹${monthTotal}`} icon={<Wallet className="w-3.5 h-3.5" />} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 grid lg:grid-cols-[280px_1fr] gap-5">
        {/* Category rail */}
        <aside className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-2 mb-1">Categories</div>
          {CATS.map((c) => {
            const active = cat === c.id;
            const total = list.filter((e) => e.category === c.id).reduce((s, e) => s + e.amount, 0);
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition text-left ${
                  active ? "bg-foreground text-background border-foreground" : "bg-card hover:border-primary/40 border-border"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${active ? "bg-background/10" : c.color}`}>{c.icon}</span>
                  <span className="text-sm font-bold">{c.label}</span>
                </span>
                <span className={`text-xs font-bold ${active ? "text-background/80" : "text-muted-foreground"}`}>₹{total}</span>
              </button>
            );
          })}
        </aside>

        {/* Form + list */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-sm font-black mb-3">Add {CATS.find((c) => c.id === cat)?.label}</div>
            <div className="grid sm:grid-cols-2 gap-3">
              {cat === "chef" && (
                <>
                  <Field label="Chef">
                    <div className="flex gap-2">
                      {(["Hussain", "Raju"] as ChefName[]).map((n) => (
                        <button
                          key={n}
                          onClick={() => setChef(n)}
                          className={`flex-1 py-2 rounded-lg border text-sm font-bold transition ${
                            chef === n ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/40"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Payment Type">
                    <div className="flex gap-2">
                      {(["daily", "monthly"] as PayType[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPayType(p)}
                          className={`flex-1 py-2 rounded-lg border text-sm font-bold capitalize transition ${
                            payType === p ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/40"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </Field>
                </>
              )}
              {(cat === "chicken" || cat === "milk") && (
                <Field label={cat === "chicken" ? "Quantity (Kg)" : "Quantity (Litre)"}>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder="e.g. 5"
                    />
                    {cat === "milk" && (
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="rounded-md border border-border bg-background px-2 text-sm font-bold"
                      >
                        <option value="Litre">Litre</option>
                        <option value="Ml">Ml</option>
                        <option value="Packet">Packet</option>
                      </select>
                    )}
                  </div>
                </Field>
              )}
              <Field label="Amount (₹)">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="Note (optional)">
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. weekly grocery" />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={submit} disabled={saving} className="gap-1.5">
                <Plus className="w-4 h-4" /> {saving ? "Saving..." : "Add Expense"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="text-sm font-black">Recent — {CATS.find((c) => c.id === cat)?.label}</div>
              <div className="text-xs font-bold text-muted-foreground">{filtered.length} entries</div>
            </div>
            {filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">No entries yet.</div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.slice(0, 100).map((e) => (
                  <li key={e.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">
                        {e.subcategory ? `${e.subcategory}` : CATS.find((c) => c.id === e.category)?.label}
                        {e.pay_type && <span className="ml-2 text-[10px] uppercase font-black text-primary">{e.pay_type}</span>}
                        {e.quantity != null && (
                          <span className="ml-2 text-xs font-semibold text-muted-foreground">
                            {e.quantity} {e.unit || ""}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(e.spent_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        {e.note && <span className="ml-2">· {e.note}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-base font-black">₹{e.amount}</div>
                      <button
                        onClick={() => remove(e.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-1.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-sm font-black leading-tight">{value}</div>
    </div>
  );
}
