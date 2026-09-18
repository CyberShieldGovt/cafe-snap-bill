import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DAILY_ITEMS,
  STAFF_NAMES,
  deleteDailyInventory,
  saveDailyInventory,
  useDailyInventoryLogs,
  type ShiftType,
} from "@/lib/daily-inventory";
import { ArrowLeft, ClipboardList, LogIn, LogOut, Check, Trash2, User } from "lucide-react";

export const Route = createFileRoute("/admin/daily-inventory")({
  head: () => ({
    meta: [
      { title: "Daily Inventory — BTech Cafe" },
      { name: "description", content: "Staff login and logout stock count for BTech Cafe kitchen items." },
      { property: "og:title", content: "Daily Inventory — BTech Cafe" },
      { property: "og:description", content: "Record kitchen stock at the start and end of every shift." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DailyInventoryPage,
});

function DailyInventoryPage() {
  const { logs, loading, refresh } = useDailyInventoryLogs();

  const [staff, setStaff] = useState<string | null>(null);
  const [otherStaff, setOtherStaff] = useState("");
  const [shift, setShift] = useState<ShiftType | null>(null);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const staffName = staff === "Other" ? otherStaff.trim() : (staff ?? "");
  const step = !staffName ? 1 : !shift ? 2 : 3;

  const filled = useMemo(
    () => DAILY_ITEMS.filter((i) => (qty[i] ?? "").trim() !== "").length,
    [qty]
  );

  function reset() {
    setStaff(null);
    setOtherStaff("");
    setShift(null);
    setQty({});
    setNote("");
  }

  async function submit() {
    setErr(null);
    const items = DAILY_ITEMS.filter((i) => (qty[i] ?? "").trim() !== "").map((i) => ({
      name: i,
      qty: Number(qty[i]) || 0,
    }));
    if (items.length === 0) {
      setErr("Enter a count for at least one item.");
      return;
    }
    setSaving(true);
    try {
      await saveDailyInventory({ staffName, shiftType: shift as ShiftType, items, note: note.trim() || null });
      setDone(true);
      reset();
      await refresh();
      setTimeout(() => setDone(false), 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link
            to="/admin"
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-bold hover:border-primary/40"
          >
            <ArrowLeft className="size-3" /> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" />
            <h1 className="text-sm font-black tracking-tight">Daily Inventory</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-5">
        {done && (
          <div className="flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-xs font-bold text-primary">
            <Check className="size-4" /> Saved. Count recorded for the shift.
          </div>
        )}

        {/* Step 1 — staff */}
        <section className="rounded-3xl border border-border bg-card p-4">
          <StepTitle n={1} label="Who is recording?" active={step === 1} />
          <div className="mt-3 flex flex-wrap gap-2">
            {[...STAFF_NAMES, "Other"].map((n) => (
              <button
                key={n}
                onClick={() => {
                  setStaff(n);
                  if (n !== "Other") setOtherStaff("");
                }}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition ${
                  staff === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                <User className="size-3" /> {n}
              </button>
            ))}
          </div>
          {staff === "Other" && (
            <input
              value={otherStaff}
              onChange={(e) => setOtherStaff(e.target.value)}
              placeholder="Type the staff name"
              className="mt-3 w-full max-w-xs rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          )}
        </section>

        {/* Step 2 — login / logout */}
        <section className={`rounded-3xl border border-border bg-card p-4 ${!staffName ? "opacity-50" : ""}`}>
          <StepTitle n={2} label="Login or Logout count?" active={step === 2} />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(
              [
                { k: "LOGIN", t: "Login", d: "Stock in hand when the shift starts", icon: LogIn },
                { k: "LOGOUT", t: "Logout", d: "Stock left when the shift ends", icon: LogOut },
              ] as const
            ).map((o) => (
              <button
                key={o.k}
                disabled={!staffName}
                onClick={() => setShift(o.k)}
                className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed ${
                  shift === o.k ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                }`}
              >
                <o.icon className={`mt-0.5 size-4 ${shift === o.k ? "text-primary" : "text-muted-foreground"}`} />
                <span>
                  <span className="block text-sm font-bold">{o.t}</span>
                  <span className="block text-[11px] text-muted-foreground">{o.d}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Step 3 — items */}
        <section className={`rounded-3xl border border-border bg-card p-4 ${step < 3 ? "opacity-50" : ""}`}>
          <StepTitle n={3} label="Enter the counts" active={step === 3} />
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DAILY_ITEMS.map((i) => (
              <label key={i} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2">
                <span className="text-xs font-semibold">{i}</span>
                <input
                  inputMode="decimal"
                  disabled={step < 3}
                  value={qty[i] ?? ""}
                  onChange={(e) => setQty((q) => ({ ...q, [i]: e.target.value }))}
                  placeholder="0"
                  className="w-16 rounded-lg border border-border bg-card px-2 py-1 text-right text-xs font-bold outline-none focus:border-primary"
                />
              </label>
            ))}
          </div>

          <input
            value={note}
            disabled={step < 3}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional) — e.g. paneer running low"
            className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />

          {err && <p className="mt-2 text-xs font-bold text-destructive">{err}</p>}

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={submit}
              disabled={step < 3 || saving}
              className="rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
            >
              {saving ? "Saving…" : `Save ${shift === "LOGOUT" ? "logout" : "login"} count`}
            </button>
            <span className="text-[11px] text-muted-foreground">{filled} item(s) filled</span>
          </div>
        </section>

        {/* History */}
        <section className="rounded-3xl border border-border bg-card p-4">
          <h2 className="text-sm font-black">Recent counts</h2>
          {loading ? (
            <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No counts recorded yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {logs.map((l) => (
                <li key={l.id} className="rounded-2xl border border-border bg-background p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        l.shift_type === "LOGIN" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {l.shift_type}
                    </span>
                    <span className="text-xs font-bold">{l.staff_name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(l.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                    <button
                      onClick={async () => {
                        await deleteDailyInventory(l.id);
                        refresh();
                      }}
                      className="ml-auto rounded-full border border-border p-1.5 text-muted-foreground hover:border-destructive hover:text-destructive"
                      aria-label="Delete entry"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(l.items ?? []).map((it) => (
                      <span key={it.name} className="rounded-lg bg-muted px-2 py-0.5 text-[11px] font-semibold">
                        {it.name}: <b>{it.qty}</b>
                      </span>
                    ))}
                  </div>
                  {l.note && <p className="mt-1.5 text-[11px] italic text-muted-foreground">{l.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function StepTitle({ n, label, active }: { n: number; label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid size-6 place-items-center rounded-full text-[11px] font-black ${
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {n}
      </span>
      <h2 className="text-sm font-black tracking-tight">{label}</h2>
    </div>
  );
}
