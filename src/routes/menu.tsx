import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { customerMenu } from "@/lib/customer.functions";
import { Coffee, ArrowLeft, Leaf, QrCode, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — BTech Cafe" },
      {
        name: "description",
        content: "Full BTech Cafe menu: Irani chai, burgers, sandwiches, maggi, pasta, momos, fries, shakes and more.",
      },
      { property: "og:title", content: "Menu — BTech Cafe" },
      { property: "og:description", content: "Chai, burgers, momos, pasta, shakes and more at BTech Cafe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MenuPage,
});

type Cat = {
  id: string;
  name: string;
  emoji: string;
  items: {
    id: string;
    name: string;
    price: number;
    is_veg: boolean | null;
    is_available: boolean;
    description: string | null;
  }[];
};

function MenuPage() {
  const { data, isLoading } = useQuery({ queryKey: ["customer-menu"], queryFn: () => customerMenu() });
  const cats = (data ?? []) as Cat[];
  const [page, setPage] = useState(0);
  const pagerRef = useRef<HTMLDivElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);

  function goToPage(i: number) {
    const el = pagerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setPage(i);
  }

  useEffect(() => {
    const chip = tabsRef.current?.children[page] as HTMLElement | undefined;
    chip?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [page]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" className="-ml-2 rounded-lg p-2 transition hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Coffee className="size-4" />
            </div>
            <h1 className="text-sm font-black tracking-tight">Our Menu</h1>
          </div>
          <Link
            to="/order"
            search={{ qr: undefined }}
            className="ml-auto flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground"
          >
            <QrCode className="size-3.5" /> Order
          </Link>
        </div>
        {cats.length > 0 && (
          <div ref={tabsRef} className="scrollbar-none mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-3">
            {cats.map((c, i) => (
              <button
                key={c.id}
                onClick={() => goToPage(i)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  page === i
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {c.emoji} {c.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {isLoading && <p className="py-16 text-center text-sm text-muted-foreground">Loading the menu…</p>}

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
              <div className="scrollbar-none mx-auto h-full max-w-5xl overflow-y-auto px-4 py-5">
                <h2 className="text-xl font-black tracking-tight">
                  {c.emoji} {c.name}
                </h2>
                <div className="mt-4 grid gap-2.5 pb-16 sm:grid-cols-2">
                  {c.items.map((i) => (
                    <div
                      key={i.id}
                      className={`flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 ${
                        i.is_available ? "" : "opacity-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {i.is_veg && <Leaf className="size-3 shrink-0 text-green-500" />}
                          <p className="truncate text-sm font-bold">{i.name}</p>
                        </div>
                        {i.description && <p className="mt-0.5 text-[11px] text-muted-foreground">{i.description}</p>}
                        {!i.is_available && (
                          <p className="mt-0.5 text-[11px] font-semibold text-destructive">Unavailable today</p>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-black">₹{i.price}</span>
                    </div>
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
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
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
    </div>
  );
}
