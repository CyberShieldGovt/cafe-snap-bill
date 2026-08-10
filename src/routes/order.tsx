import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { customerMenu, resolveQr, startSession, submitCustomerOrder } from "@/lib/customer.functions";
import { Coffee, Minus, Plus, ShoppingBag, Leaf, Loader2, MapPin, ArrowLeft, Search } from "lucide-react";

export const Route = createFileRoute("/order")({
  validateSearch: (s: Record<string, unknown>) => ({ qr: typeof s.qr === "string" ? s.qr : undefined }),
  head: () => ({
    meta: [
      { title: "Order — BTech Cafe" },
      { name: "description", content: "Scan, pick your food and send it straight to the BTech Cafe kitchen." },
      { property: "og:title", content: "Order — BTech Cafe" },
      { property: "og:description", content: "Order from your table at BTech Cafe and track it live." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderPage,
});

type Item = { id: string; name: string; price: number; is_veg: boolean | null; is_available: boolean; description: string | null };
type Cat = { id: string; name: string; emoji: string; items: Item[] };

const SESSION_KEY = "btech-guest-session-v1";

function OrderPage() {
  const { qr } = Route.useSearch();
  const navigate = useNavigate();

  const [session, setSession] = useState<{ id: string; name: string; mobile: string } | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s?.id) {
          setSession(s);
          setName(s.name ?? "");
          setMobile(s.mobile ?? "");
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loc = useQuery({
    queryKey: ["qr", qr],
    queryFn: () => resolveQr({ data: { qr: qr! } }),
    enabled: Boolean(qr),
  });
  const menu = useQuery({ queryKey: ["customer-menu"], queryFn: () => customerMenu() });
  const cats = (menu.data ?? []) as Cat[];

  const allItems = useMemo(() => cats.flatMap((c) => c.items), [cats]);
  const filtered = useMemo(() => {
    if (!q.trim()) return null;
    const t = q.toLowerCase();
    return allItems.filter((i) => i.name.toLowerCase().includes(t));
  }, [q, allItems]);
  const current = cats.find((c) => c.id === activeCat) ?? cats[0];

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ item: allItems.find((i) => i.id === id), qty }))
        .filter((l): l is { item: Item; qty: number } => Boolean(l.item) && l.qty > 0),
    [cart, allItems]
  );
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  const add = (id: string, d: number) =>
    setCart((c) => {
      const next = Math.max(0, (c[id] ?? 0) + d);
      const copy = { ...c };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });

  async function beginSession(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await startSession({ data: { qr: qr ?? null, name, mobile } });
      const s = { id: res.sessionId, name, mobile };
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      setSession(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start your session.");
    } finally {
      setBusy(false);
    }
  }

  async function place() {
    if (!session || lines.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const res = await submitCustomerOrder({
        data: {
          sessionId: session.id,
          qr: qr ?? null,
          name: session.name,
          mobile: session.mobile,
          notes: note || undefined,
          items: lines.map((l) => ({ item_id: l.item.id, qty: l.qty })),
        },
      });
      setCart({});
      setNote("");
      navigate({ to: "/order-status/$token", params: { token: res.trackingToken } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place your order.");
    } finally {
      setBusy(false);
    }
  }

  const location = loc.data as { label?: string; location_type?: string } | null | undefined;

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
        <form onSubmit={beginSession} className="w-full max-w-sm rounded-3xl border border-border bg-card p-6">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Coffee className="size-6" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight">Welcome to BTech Cafe</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {qr && location?.label
              ? `You're at ${location.label}. Tell us who you are and start ordering.`
              : qr && loc.isFetched && !location
                ? "That QR code isn't valid — please ask our staff."
                : "Takeaway order — we'll give you a token number."}
          </p>
          <label className="mt-5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Your name"
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <label className="mt-3 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Mobile</label>
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            placeholder="10-digit number"
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          {error && <p className="mt-3 text-xs font-semibold text-destructive">{error}</p>}
          <button
            disabled={busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" />} Start ordering
          </button>
          <Link to="/" className="mt-3 block text-center text-[11px] font-semibold text-muted-foreground hover:text-foreground">
            Back to home
          </Link>
        </form>
      </div>
    );
  }

  const shown = filtered ?? current?.items ?? [];

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" className="-ml-2 rounded-lg p-2 transition hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-sm font-black leading-none tracking-tight">Hi {session.name.split(" ")[0]} 👋</p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="size-3" /> {location?.label ?? "Takeaway counter"}
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search chai, burger, momos…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>
        {!filtered && cats.length > 0 && (
          <div className="scrollbar-none mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-3">
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  current?.id === c.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {c.emoji} {c.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        {menu.isLoading && <p className="py-16 text-center text-sm text-muted-foreground">Loading the menu…</p>}
        <div className="grid gap-2.5 sm:grid-cols-2">
          {shown.map((i) => {
            const qty = cart[i.id] ?? 0;
            return (
              <div
                key={i.id}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition ${
                  qty > 0 ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                } ${i.is_available ? "" : "opacity-50"}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {i.is_veg && <Leaf className="size-3 shrink-0 text-green-500" />}
                    <p className="truncate text-sm font-bold">{i.name}</p>
                  </div>
                  <p className="mt-0.5 text-sm font-black text-primary">₹{i.price}</p>
                  {!i.is_available && <p className="text-[11px] font-semibold text-destructive">Unavailable</p>}
                </div>
                {i.is_available &&
                  (qty === 0 ? (
                    <button
                      onClick={() => add(i.id, 1)}
                      className="shrink-0 rounded-xl border border-primary/40 px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
                    >
                      Add
                    </button>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1 rounded-xl bg-primary p-1 text-primary-foreground">
                      <button onClick={() => add(i.id, -1)} className="grid size-7 place-items-center rounded-lg hover:bg-black/15">
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-black">{qty}</span>
                      <button onClick={() => add(i.id, 1)} className="grid size-7 place-items-center rounded-lg hover:bg-black/15">
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>

        {count > 0 && (
          <div className="mt-5 rounded-2xl border border-border bg-card p-4">
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Note for the kitchen
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder="e.g. less spicy, no onion"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
        )}
        {error && <p className="mt-4 text-center text-xs font-semibold text-destructive">{error}</p>}
      </main>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl">
          <button
            onClick={place}
            disabled={busy}
            className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-2xl bg-primary px-5 py-3.5 text-primary-foreground shadow-xl shadow-primary/25 disabled:opacity-60"
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ShoppingBag className="size-4" />}
              {count} item{count > 1 ? "s" : ""}
            </span>
            <span className="text-sm font-black">Place order · ₹{total}</span>
          </button>
        </div>
      )}
    </div>
  );
}
