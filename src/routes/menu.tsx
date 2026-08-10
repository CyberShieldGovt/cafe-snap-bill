import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { customerMenu } from "@/lib/customer.functions";
import { Coffee, ArrowLeft, Leaf, QrCode } from "lucide-react";
import { useState } from "react";

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
  items: { id: string; name: string; price: number; is_veg: boolean | null; is_available: boolean; description: string | null }[];
};

function MenuPage() {
  const { data, isLoading } = useQuery({ queryKey: ["customer-menu"], queryFn: () => customerMenu() });
  const cats = (data ?? []) as Cat[];
  const [active, setActive] = useState<string | null>(null);
  const current = cats.find((c) => c.id === active) ?? cats[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" className="rounded-lg p-2 -ml-2 transition hover:bg-muted">
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
            className="ml-auto flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground"
          >
            <QrCode className="size-3.5" /> Order
          </Link>
        </div>
        {cats.length > 0 && (
          <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-3">
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  current?.id === c.id
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

      <main className="mx-auto max-w-5xl px-4 py-6">
        {isLoading && <p className="py-16 text-center text-sm text-muted-foreground">Loading the menu…</p>}
        {current && (
          <>
            <h2 className="text-xl font-black tracking-tight">
              {current.emoji} {current.name}
            </h2>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {current.items.map((i) => (
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
                    {!i.is_available && <p className="mt-0.5 text-[11px] font-semibold text-destructive">Unavailable today</p>}
                  </div>
                  <span className="shrink-0 text-sm font-black">₹{i.price}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
