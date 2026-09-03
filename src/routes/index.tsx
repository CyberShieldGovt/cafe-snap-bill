import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Coffee,
  MapPin,
  Clock,
  Phone,
  QrCode,
  ArrowRight,
  Star,
  Utensils,
  Wind,
  ShoppingBag,
  Instagram,
  Flame,
  Sparkles,
} from "lucide-react";
import heroImg from "@/assets/hero-chai-maska.jpg";
import cafeImg from "@/assets/hero-cafe.jpg";
import rooftopImg from "@/assets/space-rooftop.jpg";
import chaiImg from "@/assets/dish-chai.jpg";
import burgerImg from "@/assets/dish-burger.jpg";
import maskaImg from "@/assets/dish-bun-maska.jpg";
import friesImg from "@/assets/dish-peri-fries.jpg";
import biscuitImg from "@/assets/dish-biscuits.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BTech Cafe — Irani Chai, Bun Maska & Rooftop in Whitefield" },
      {
        name: "description",
        content:
          "BTech Cafe Whitefield: Irani chai, bun maska, Osmania biscuits, burgers and peri peri fries. Scan the QR at your table, order in seconds and track it live. Open 1 PM to 1 AM.",
      },
      { property: "og:title", content: "BTech Cafe — Irani Chai, Bun Maska & Rooftop Vibes" },
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

/* ---------------- helpers ---------------- */

function useReveal() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(".reveal-on-scroll"));
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return ref;
}

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(window.scrollY));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return y;
}

/** Pointer-driven 3D tilt wrapper */
function Tilt({
  children,
  className = "",
  max = 10,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const el = useRef<HTMLDivElement | null>(null);

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const node = el.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    node.style.transform = `perspective(1000px) rotateY(${px * max * 2}deg) rotateX(${-py * max * 2}deg) translateZ(18px)`;
  };
  const leave = () => {
    const node = el.current;
    if (node) node.style.transform = "perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(0)";
  };

  return (
    <div
      ref={el}
      onPointerMove={move}
      onPointerLeave={leave}
      className={`preserve-3d transition-transform duration-500 ease-out ${className}`}
    >
      {children}
    </div>
  );
}

/* ---------------- data ---------------- */

const SPACES = [
  { icon: Utensils, title: "Quick Service", desc: "Fast-turnaround tables on the ground floor for a quick chai-and-go." },
  { icon: Coffee, title: "Rooftop", desc: "Open-air tables under string lights — our best seats after sunset." },
  { icon: Wind, title: "Smoke Zone", desc: "A ventilated corner away from the family seating." },
  { icon: ShoppingBag, title: "Takeaway", desc: "Token-based counter pickup. Order, get a token, collect when ready." },
];

const HIGHLIGHTS = [
  { name: "Irani Chai", price: 20, img: chaiImg, tag: "Most loved" },
  { name: "Bun Maska", price: 40, img: maskaImg, tag: "Chai's best friend" },
  { name: "Osmania Biscuits", price: 10, img: biscuitImg, tag: "Dip & repeat" },
  { name: "Chicken Burger", price: 90, img: burgerImg, tag: "Bestseller" },
  { name: "Peri Peri Fries", price: 99, img: friesImg, tag: "Spicy pick" },
];

const GALLERY = [
  { src: heroImg, alt: "Steaming glass of Irani chai on a wooden table" },
  { src: maskaImg, alt: "Bun maska with a thick slab of butter beside chai" },
  { src: friesImg, alt: "Basket of peri peri fries with dip" },
  { src: burgerImg, alt: "Loaded chicken burger with fries" },
  { src: biscuitImg, alt: "Osmania biscuits stacked beside a glass of chai" },
  { src: rooftopImg, alt: "Rooftop seating at dusk with warm string lights" },
  { src: cafeImg, alt: "Table spread of chai, bun maska and burgers at BTech Cafe" },
  { src: chaiImg, alt: "Cutting chai served hot" },
];

const TICKER = [
  "Irani Chai",
  "Bun Maska",
  "Osmania Biscuits",
  "Peri Peri Fries",
  "Chicken Burger",
  "Momos",
  "Maggi",
  "Fresh Juices",
  "Rooftop Nights",
];

/* ---------------- page ---------------- */

function Landing() {
  const pageRef = useReveal();
  const y = useScrollY();

  return (
    <div ref={pageRef} className="min-h-screen overflow-x-clip bg-background text-foreground">
      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="relative grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition group-hover:-rotate-6">
              <Coffee className="size-5" />
              <span className="absolute inset-0 rounded-2xl ring-1 ring-primary/40 animate-pulse-ring" />
            </span>
            <span className="leading-none">
              <span className="block text-sm font-black tracking-tight">BTech Cafe</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Whitefield · Bengaluru
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              { label: "Favourites", href: "#favourites" },
              { label: "Spaces", href: "#spaces" },
              { label: "Gallery", href: "#gallery" },
              { label: "Visit", href: "#visit" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="relative rounded-full px-3.5 py-2 text-xs font-bold text-muted-foreground transition hover:text-foreground"
              >
                {l.label}
                <span className="absolute inset-x-3.5 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-300 hover:scale-x-100" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link
              to="/menu"
              className="rounded-full border border-border px-3.5 py-2 text-xs font-bold transition hover:border-primary/50 hover:text-primary"
            >
              Menu
            </Link>
            <Link
              to="/order"
              search={{ qr: undefined }}
              className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:brightness-110"
            >
              <QrCode className="size-3.5" /> Order
            </Link>
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="perspective-1200 relative overflow-hidden">
        {/* parallax backdrop */}
        <div className="absolute inset-0" style={{ transform: `translate3d(0, ${y * 0.25}px, 0) scale(1.12)` }}>
          <img
            src={heroImg}
            alt="Steaming glass of Irani chai served at BTech Cafe"
            width={1600}
            height={1008}
            className="size-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/45" />
        <div className="pointer-events-none absolute -left-24 top-10 size-[26rem] rounded-full bg-primary/25 blur-[110px] animate-glow-pan" />
        <div className="pointer-events-none absolute -right-32 bottom-0 size-[22rem] rounded-full bg-primary/15 blur-[120px] animate-float-slower" />
        <div className="bg-noise pointer-events-none absolute inset-0 opacity-40" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-[1.1fr_0.9fr] md:py-28">
          <div className="preserve-3d" style={{ transform: `translate3d(0, ${-y * 0.06}px, 0)` }}>
            <span className="animate-slide-up inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary backdrop-blur">
              <Star className="size-3 fill-primary" /> Chai · Maska · Grills · Rooftop
            </span>
            <h1 className="animate-tilt-in mt-4 max-w-2xl text-[2.6rem] font-black leading-[1.02] tracking-tight md:text-6xl">
              Irani chai, hot <span className="shimmer-text">bun maska</span>, and a rooftop that never gets old.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
              Scan the QR on your table, build your order and watch it move from kitchen to table — no waiting for
              someone to take your order.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/order"
                search={{ qr: undefined }}
                className="group flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-2xl shadow-primary/40 transition duration-300 hover:-translate-y-1 hover:brightness-110"
              >
                <QrCode className="size-4" /> Order from Table
                <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </Link>
              <Link
                to="/menu"
                className="rounded-full border border-border bg-card/70 px-6 py-3.5 text-sm font-bold backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:text-primary"
              >
                Browse the Menu
              </Link>
            </div>

            <dl className="mt-9 grid max-w-md grid-cols-3 gap-3">
              {[
                { k: "1 PM – 1 AM", v: "Open daily" },
                { k: "27+", v: "Tables & rooftop" },
                { k: "₹20", v: "Irani chai" },
              ].map((s) => (
                <div key={s.v} className="rounded-2xl border border-border/70 bg-card/60 p-3 backdrop-blur">
                  <dt className="text-sm font-black tracking-tight">{s.k}</dt>
                  <dd className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {s.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* floating 3D image stack */}
          <div className="perspective-1200 relative hidden h-[26rem] md:block">
            <Tilt className="absolute right-4 top-0 w-60" max={12}>
              <div className="animate-float-slow overflow-hidden rounded-[1.75rem] border border-border/70 shadow-2xl shadow-primary/20">
                <img src={maskaImg} alt="Bun maska with butter" width={1000} height={1000} loading="lazy" className="size-full object-cover" />
              </div>
            </Tilt>
            <Tilt className="absolute left-0 top-32 w-52" max={14}>
              <div className="animate-float-slower overflow-hidden rounded-[1.5rem] border border-border/70 shadow-2xl shadow-primary/20">
                <img src={chaiImg} alt="Glass of Irani chai" width={1000} height={1000} loading="lazy" className="size-full object-cover" />
              </div>
            </Tilt>
            <Tilt className="absolute bottom-0 right-14 w-44" max={16}>
              <div className="animate-float-slow overflow-hidden rounded-[1.25rem] border border-border/70 shadow-2xl shadow-primary/20">
                <img src={friesImg} alt="Peri peri fries" width={1000} height={1000} loading="lazy" className="size-full object-cover" />
              </div>
            </Tilt>
            <span className="animate-spin-slow absolute left-10 top-4 grid size-16 place-items-center rounded-full border border-dashed border-primary/40 text-primary">
              <Sparkles className="size-5" />
            </span>
          </div>
        </div>

        {/* ticker */}
        <div className="relative border-y border-border/60 bg-card/50 py-3 backdrop-blur">
          <div className="flex w-max animate-marquee gap-8 pr-8">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="flex items-center gap-2 whitespace-nowrap text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground"
              >
                <Flame className="size-3.5 text-primary" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="perspective-1200 mx-auto max-w-6xl px-4 py-16">
        <h2 className="reveal-on-scroll text-2xl font-black tracking-tight md:text-3xl">Ordering takes 30 seconds</h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            { n: "01", t: "Scan the QR", d: "Every table has its own code — we know exactly where to bring your food." },
            { n: "02", t: "Pick your food", d: "Full menu with live availability. Add notes like 'less spicy' per item." },
            { n: "03", t: "Track it live", d: "Approved → Preparing → Ready. Pay at the counter or at your table." },
          ].map((s, i) => (
            <div
              key={s.n}
              className="reveal-on-scroll card-3d rounded-3xl border border-border bg-card p-5 shadow-sm hover:shadow-2xl hover:shadow-primary/15"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <span className="text-4xl font-black text-primary/25">{s.n}</span>
              <h3 className="mt-2 text-base font-bold">{s.t}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Highlights ---------- */}
      <section id="favourites" className="perspective-1200 border-y border-border bg-card/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-end justify-between gap-4">
            <h2 className="reveal-on-scroll text-2xl font-black tracking-tight md:text-3xl">
              What people keep ordering
            </h2>
            <Link to="/menu" className="shrink-0 text-xs font-bold text-primary hover:underline">
              Full menu →
            </Link>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HIGHLIGHTS.map((h, i) => (
              <div
                key={h.name}
                className="reveal-on-scroll"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <Tilt max={8}>
                  <article className="group overflow-hidden rounded-[1.75rem] border border-border bg-background shadow-lg transition-shadow duration-500 hover:shadow-2xl hover:shadow-primary/20">
                    <div className="relative overflow-hidden">
                      <img
                        src={h.img}
                        alt={h.name}
                        width={1000}
                        height={1000}
                        loading="lazy"
                        className="aspect-[16/11] w-full object-cover transition duration-700 group-hover:scale-110"
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary backdrop-blur">
                        {h.tag}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 p-4">
                      <h3 className="text-base font-bold">{h.name}</h3>
                      <span className="text-lg font-black">₹{h.price}</span>
                    </div>
                  </article>
                </Tilt>
              </div>
            ))}
            <Link
              to="/order"
              search={{ qr: undefined }}
              className="reveal-on-scroll group flex flex-col justify-between rounded-[1.75rem] border border-dashed border-primary/40 bg-primary/5 p-6 transition hover:-translate-y-1 hover:bg-primary/10"
            >
              <Sparkles className="size-6 text-primary" />
              <div className="mt-8">
                <p className="text-lg font-black leading-tight">Hungry already?</p>
                <p className="mt-1 text-xs text-muted-foreground">Order straight from your table in a few taps.</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                  Order now <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Spaces ---------- */}
      <section id="spaces" className="perspective-1200 mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h2 className="reveal-on-scroll text-2xl font-black tracking-tight md:text-3xl">
              Four ways to sit (or not sit)
            </h2>
            <p className="reveal-on-scroll mt-2 text-sm text-muted-foreground">
              Tables across the cafe and the rooftop, plus a takeaway counter that runs on tokens.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {SPACES.map((s, i) => (
                <div
                  key={s.title}
                  className="reveal-on-scroll card-3d rounded-2xl border border-border bg-card p-4"
                  style={{ transitionDelay: `${i * 70}ms` }}
                >
                  <s.icon className="size-5 text-primary" />
                  <h3 className="mt-2 text-sm font-bold">{s.title}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="reveal-on-scroll perspective-1200">
            <Tilt max={9}>
              <img
                src={rooftopImg}
                alt="Rooftop seating at dusk with warm string lights"
                width={1200}
                height={900}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-[2rem] border border-border object-cover shadow-2xl shadow-primary/20"
              />
            </Tilt>
          </div>
        </div>
      </section>

      {/* ---------- Gallery ---------- */}
      <section id="gallery" className="border-y border-border bg-card/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="reveal-on-scroll text-2xl font-black tracking-tight md:text-3xl">Food gallery</h2>
              <p className="reveal-on-scroll mt-1.5 text-sm text-muted-foreground">
                A quick look at what leaves our kitchen every evening.
              </p>
            </div>
          </div>
          <div className="perspective-1200 mt-7 grid auto-rows-[130px] grid-cols-2 gap-3 sm:auto-rows-[170px] sm:grid-cols-4">
            {GALLERY.map((g, i) => (
              <div
                key={g.alt}
                className={`reveal-on-scroll overflow-hidden rounded-2xl border border-border ${
                  i === 0 || i === 5 ? "col-span-2 row-span-2" : ""
                }`}
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <img
                  src={g.src}
                  alt={g.alt}
                  width={1000}
                  height={1000}
                  loading="lazy"
                  className="size-full object-cover transition duration-700 hover:scale-110"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Visit ---------- */}
      <section id="visit" className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: MapPin, t: "Find us", d: "Nallurahalli, Whitefield, Bengaluru" },
            { icon: Clock, t: "Open daily", d: "1:00 PM — 1:00 AM" },
            { icon: Phone, t: "Call us", d: "Ask any staff member" },
          ].map((c, i) => (
            <div
              key={c.t}
              className="reveal-on-scroll card-3d rounded-3xl border border-border bg-card p-5"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <c.icon className="size-5 text-primary" />
              <h3 className="mt-2 text-sm font-bold">{c.t}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="relative overflow-hidden border-t border-border bg-card/60">
        <div className="pointer-events-none absolute -left-20 -top-24 size-80 rounded-full bg-primary/15 blur-[100px] animate-glow-pan" />
        <div className="relative mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                  <Coffee className="size-5" />
                </span>
                <span className="leading-none">
                  <span className="block text-sm font-black tracking-tight">BTech Cafe</span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Whitefield · Bengaluru
                  </span>
                </span>
              </div>
              <p className="mt-4 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Irani chai, bun maska and late-night rooftop plates. Scan, order, track — we'll bring it to your table.
              </p>
              <div className="mt-5 flex gap-2">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="BTech Cafe on Instagram"
                  className="grid size-9 place-items-center rounded-full border border-border transition hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary"
                >
                  <Instagram className="size-4" />
                </a>
                <a
                  href="https://maps.google.com/?q=Nallurahalli,Whitefield,Bengaluru"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Find BTech Cafe on the map"
                  className="grid size-9 place-items-center rounded-full border border-border transition hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary"
                >
                  <MapPin className="size-4" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Explore</h3>
              <ul className="mt-3 space-y-2 text-xs font-semibold">
                <li>
                  <Link to="/menu" className="transition hover:text-primary">
                    Menu
                  </Link>
                </li>
                <li>
                  <Link to="/order" search={{ qr: undefined }} className="transition hover:text-primary">
                    Order from table
                  </Link>
                </li>
                <li>
                  <a href="#gallery" className="transition hover:text-primary">
                    Food gallery
                  </a>
                </li>
                <li>
                  <a href="#spaces" className="transition hover:text-primary">
                    Our spaces
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Hours</h3>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li className="font-semibold text-foreground">Open daily</li>
                <li>1:00 PM — 1:00 AM</li>
                <li>Kitchen closes 12:30 AM</li>
              </ul>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Visit</h3>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li>Nallurahalli</li>
                <li>Whitefield, Bengaluru</li>
                <li>
                  <Link to="/admin" className="font-semibold text-foreground transition hover:text-primary">
                    Staff login
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-[11px] text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} BTech Cafe · Nallurahalli, Whitefield, Bengaluru.</p>
            <p>Made for chai lovers who hate waiting.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
