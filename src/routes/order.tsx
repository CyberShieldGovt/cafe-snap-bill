import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { customerMenu, resolveQr, startSession, submitCustomerOrder } from "@/lib/customer.functions";
import {
  Coffee,
  Minus,
  Plus,
  ShoppingBag,
  Leaf,
  Loader2,
  MapPin,
  ArrowLeft,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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

type Item = {
  id: string;
  name: string;
  price: number;
  is_veg: boolean | null;
  is_available: boolean;
  description: string | null;
};
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
  const [checkout, setCheckout] = useState(false);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const pagerRef = useRef<HTMLDivElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);

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
  const searching = q.trim().length > 0;
  const results = useMemo(() => {
    if (!searching) return [];
    const t = q.trim().toLowerCase();
    return allItems.filter((i) => i.name.toLowerCase().includes(t));
  }, [q, searching, allItems]);

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

  function goToPage(i: number) {
    const el = pagerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setPage(i);
  }

  // Keep the active chip visible as the customer swipes between pages
  useEffect(() => {
    const chip = tabsRef.current?.children[page] as HTMLElement | undefined;
    chip?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [page]);

  async function place() {
    if (lines.length === 0) return;
    if (!name.trim() || mobile.length < 10) {
      setError("Please add your name and 10-digit mobile number.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      let s = session;
      if (!s) {
        const res = await startSession({ data: { qr: qr ?? null, name, mobile } });
        s = { id: res.sessionId, name, mobile };
        localStorage.setItem(SESSION_KEY, JSON.stringify(s));
        setSession(s);
      }
      const res = await submitCustomerOrder({
        data: {
          sessionId: s.id,
          qr: qr ?? null,
          name: s.name,
          mobile: s.mobile,
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

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" className="-ml-2 rounded-lg p-2 transition hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Coffee className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black leading-none tracking-tight">
              {session ? `Hi ${session.name.split(" ")[0]} 👋` : "BTech Cafe"}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="size-3" /> {location?.label ?? (qr ? "Finding your table…" : "Takeaway counter")}
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
            {searching && (
              <button onClick={() => setQ("")} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {!searching && cats.length > 0 && (
          <div ref={tabsRef} className="scrollbar-none mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-3">
            {cats.map((c, i) => (
              <button
                key={c.id}
                onClick={() => goToPage(i)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  page === i
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

      {menu.isLoading && <p className="py-16 text-center text-sm text-muted-foreground">Loading the menu…</p>}

      {searching ? (
        <main className="scrollbar-none mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-4 py-4">
          {results.length === 0 && (
            <p className="py-16 text-center text-sm text-muted-foreground">Nothing matches “{q}”.</p>
          )}
          <div className="grid gap-2.5 pb-32 sm:grid-cols-2">
            {results.map((i) => (
              <ItemRow key={i.id} item={i} qty={cart[i.id] ?? 0} onAdd={add} />
            ))}
          </div>
        </main>
      ) : (
        <div className="relative min-h-0 flex-1">
          <div
            ref={pagerRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
              if (i !== page) setPage(i);
            }}
            className="scrollbar-none flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
          >
            {cats.map((c) => (
              <section key={c.id} className="h-full w-full shrink-0 snap-center snap-always">
                <div className="scrollbar-none mx-auto h-full max-w-5xl overflow-y-auto px-4 py-4">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-xl font-black tracking-tight">
                      {c.emoji} {c.name}
                    </h2>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      {c.items.length} items
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2.5 pb-32 sm:grid-cols-2">
                    {c.items.map((i) => (
                      <ItemRow key={i.id} item={i} qty={cart[i.id] ?? 0} onAdd={add} />
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>

          {cats.length > 1 && (
            <>
              <button
                onClick={() => goToPage(Math.max(0, page - 1))}
                disabled={page === 0}
                aria-label="Previous category"
                className="absolute left-1 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-card/90 backdrop-blur disabled:opacity-30 sm:grid"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => goToPage(Math.min(cats.length - 1, page + 1))}
                disabled={page === cats.length - 1}
                aria-label="Next category"
                className="absolute right-1 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-card/90 backdrop-blur disabled:opacity-30 sm:grid"
              >
                <ChevronRight className="size-4" />
              </button>
              <div className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center gap-1.5">
                {cats.map((c, i) => (
                  <span
                    key={c.id}
                    className={`h-1.5 rounded-full transition-all ${
                      i === page ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/40"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {count > 0 && !checkout && (
        <div className="border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl">
          <button
            onClick={() => setCheckout(true)}
            className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-2xl bg-primary px-5 py-3.5 text-primary-foreground shadow-xl shadow-primary/25"
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <ShoppingBag className="size-4" />
              {count} item{count > 1 ? "s" : ""}
            </span>
            <span className="text-sm font-black">Review · ₹{total}</span>
          </button>
        </div>
      )}

      {checkout && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm">
          <div className="max-h-[88dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-background p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight">Your order</h2>
              <button onClick={() => setCheckout(false)} className="rounded-lg p-2 hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {lines.map((l) => (
                <div key={l.item.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold">{l.item.name}</span>
                  <div className="flex shrink-0 items-center gap-1 rounded-lg bg-muted p-0.5">
                    <button onClick={() => add(l.item.id, -1)} className="grid size-6 place-items-center rounded-md">
                      <Minus className="size-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-black">{l.qty}</span>
                    <button onClick={() => add(l.item.id, 1)} className="grid size-6 place-items-center rounded-md">
                      <Plus className="size-3" />
                    </button>
                  </div>
                  <span className="w-14 shrink-0 text-right font-black">₹{l.item.price * l.qty}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm font-black">
              <span>Total</span>
              <span>₹{total}</span>
            </div>

            {!session && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={60}
                    placeholder="Your name"
                    className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Mobile</label>
                  <input
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    inputMode="numeric"
                    placeholder="10-digit number"
                    className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}

            <label className="mt-4 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Note for the kitchen
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder="e.g. less spicy, no onion"
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
            />

            {error && <p className="mt-3 text-xs font-semibold text-destructive">{error}</p>}

            <button
              onClick={place}
              disabled={busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Place order · ₹{total}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow({
  item: i,
  qty,
  onAdd,
}: {
  item: Item;
  qty: number;
  onAdd: (id: string, d: number) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition ${
        qty > 0 ? "border-primary/50 bg-primary/5" : "border-border bg-card"
      } ${i.is_available ? "" : "opacity-50"}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {i.is_veg && <Leaf className="size-3 shrink-0 text-green-500" />}
          <p className="truncate text-sm font-bold">{i.name}</p>
        </div>
        {i.description && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{i.description}</p>}
        <p className="mt-0.5 text-sm font-black text-primary">₹{i.price}</p>
        {!i.is_available && <p className="text-[11px] font-semibold text-destructive">Unavailable</p>}
      </div>
      {i.is_available &&
        (qty === 0 ? (
          <button
            onClick={() => onAdd(i.id, 1)}
            className="shrink-0 rounded-xl border border-primary/40 px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
          >
            Add
          </button>
        ) : (
          <div className="flex shrink-0 items-center gap-1 rounded-xl bg-primary p-1 text-primary-foreground">
            <button onClick={() => onAdd(i.id, -1)} className="grid size-7 place-items-center rounded-lg hover:bg-black/15">
              <Minus className="size-3.5" />
            </button>
            <span className="w-5 text-center text-sm font-black">{qty}</span>
            <button onClick={() => onAdd(i.id, 1)} className="grid size-7 place-items-center rounded-lg hover:bg-black/15">
              <Plus className="size-3.5" />
            </button>
          </div>
        ))}
    </div>
  );
}
