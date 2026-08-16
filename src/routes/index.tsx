import { createFileRoute, Link } from "@tanstack/react-router";
import { Coffee, MapPin, Clock, Phone, QrCode, ArrowRight, Star, Utensils, Wind, ShoppingBag } from "lucide-react";
import heroImg from "@/assets/hero-cafe.jpg";
import rooftopImg from "@/assets/space-rooftop.jpg";
import chaiImg from "@/assets/dish-chai.jpg";
import burgerImg from "@/assets/dish-burger.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BTech Cafe — Chai, Burgers & Rooftop Vibes in Bengaluru" },
      {
        name: "description",
        content:
          "BTech Cafe serves Irani chai, burgers, momos, pasta and more. Scan, order from your table, and track your order live. Quick service, rooftop and smoke zone seating.",
      },
      { property: "og:title", content: "BTech Cafe — Chai, Burgers & Rooftop Vibes" },
      {
        property: "og:description",
        content: "Scan the QR at your table, order in seconds and track it live. Rooftop, smoke zone and takeaway.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const SPACES = [
  { icon: Utensils, title: "Quick Service", desc: "10 fast-turnaround tables on the ground floor for a quick chai-and-go." },
  { icon: Coffee, title: "Rooftop", desc: "12 open-air tables under string lights — our best seats after sunset." },
  { icon: Wind, title: "Smoke Zone", desc: "4 dedicated tables in a ventilated corner, away from the family seating." },
  { icon: ShoppingBag, title: "Takeaway", desc: "Token-based counter pickup. Order, get a token, collect when it's ready." },
];

const HIGHLIGHTS = [
  { name: "Irani Chai", price: 20, img: chaiImg, tag: "Most loved" },
  { name: "Chicken Burger", price: 90, img: burgerImg, tag: "Bestseller" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Coffee className="size-5" />
            </div>
            <div className="leading-none">
              <p className="text-sm font-black tracking-tight">BTech Cafe</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Hyderabad</p>
            </div>
          </div>
          <nav className="flex items-center gap-1.5">
            <Link
              to="/menu"
              className="rounded-full px-3 py-2 text-xs font-bold text-muted-foreground transition hover:text-foreground"
            >
              Menu
            </Link>
            <Link
              to="/order"
              search={{ qr: undefined }}
              className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110"
            >
              <QrCode className="size-3.5" /> Order now
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src={heroImg}
          alt="Chai, bun maska, burger and fries on a wooden table at BTech Cafe"
          width={1600}
          height={1008}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
            <Star className="size-3 fill-primary" /> Chai · Grills · Rooftop
          </span>
          <h1 className="mt-4 max-w-2xl text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Hot chai, loaded burgers and a rooftop that never gets old.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
            Scan the QR on your table, build your order, and watch it move from kitchen to table — no waiting for
            someone to take your order.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/order"
              search={{ qr: undefined }}
              className="group flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/30 transition hover:brightness-110"
            >
              <QrCode className="size-4" /> Order from your table
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/menu"
              className="rounded-full border border-border bg-card/70 px-6 py-3.5 text-sm font-bold backdrop-blur transition hover:border-primary/40"
            >
              Browse the menu
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-black tracking-tight md:text-3xl">Ordering takes 30 seconds</h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            { n: "01", t: "Scan the QR", d: "Every table has its own code — we know exactly where to bring your food." },
            { n: "02", t: "Pick your food", d: "Full menu with live availability. Add notes like 'less spicy' per item." },
            { n: "03", t: "Track it live", d: "Approved → Preparing → Ready. Pay at the counter or at your table." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-5">
              <span className="text-3xl font-black text-primary/25">{s.n}</span>
              <h3 className="mt-2 text-base font-bold">{s.t}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Spaces */}
      <section className="border-y border-border bg-card/40 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-black tracking-tight md:text-3xl">Four ways to sit (or not sit)</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                27 tables across the cafe, plus a takeaway counter that runs on tokens.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {SPACES.map((s) => (
                  <div key={s.title} className="rounded-2xl border border-border bg-background p-4">
                    <s.icon className="size-5 text-primary" />
                    <h3 className="mt-2 text-sm font-bold">{s.title}</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <img
              src={rooftopImg}
              alt="Rooftop seating at dusk with warm string lights"
              width={1200}
              height={900}
              loading="lazy"
              className="aspect-[4/3] w-full rounded-3xl border border-border object-cover shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">What people keep ordering</h2>
          <Link to="/menu" className="shrink-0 text-xs font-bold text-primary hover:underline">
            Full menu →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {HIGHLIGHTS.map((h) => (
            <div key={h.name} className="group overflow-hidden rounded-3xl border border-border bg-card">
              <img
                src={h.img}
                alt={h.name}
                width={1000}
                height={1000}
                loading="lazy"
                className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="flex items-center justify-between gap-3 p-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{h.tag}</span>
                  <h3 className="text-base font-bold">{h.name}</h3>
                </div>
                <span className="text-lg font-black">₹{h.price}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Visit */}
      <section className="border-t border-border bg-card/40 py-14">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-3">
          {[
            { icon: MapPin, t: "Find us", d: "BTech Cafe, Hyderabad" },
            { icon: Clock, t: "Open daily", d: "11:00 AM — 12:00 AM" },
            { icon: Phone, t: "Call us", d: "Ask any staff member" },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-border bg-background p-5">
              <c.icon className="size-5 text-primary" />
              <h3 className="mt-2 text-sm font-bold">{c.t}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-[11px] text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} BTech Cafe. Renovating in August — Irani Chai & Chinese coming soon.</p>
        <Link to="/admin" className="font-semibold hover:text-foreground">
          Staff login
        </Link>
      </footer>
    </div>
  );
}
