"use client";

import Link from "@/components/shared/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const semMovimento = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Cartão-link com um holofote de luz que acompanha o mouse. */
export function CartaoHolofote({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);
  return (
    <Link
      ref={ref}
      href={href}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--x", `${e.clientX - r.left}px`);
        el.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
      className={cn(
        "group relative isolate flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/25",
        className
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(420px circle at var(--x, 50%) var(--y, 50%), rgba(52,211,153,0.18), transparent 60%)" }}
      />
      {children}
    </Link>
  );
}

/** Número que sobe até o valor quando aparece na tela. */
export function Contador({ valor }: { valor: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (semMovimento()) {
      setN(valor);
      return;
    }
    let raf = 0;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        const ini = performance.now();
        const passo = (t: number) => {
          const p = Math.min(1, (t - ini) / 1600);
          setN(Math.round(valor * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(passo);
        };
        raf = requestAnimationFrame(passo);
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [valor]);

  return (
    <span ref={ref} className="tabular-nums">
      {n.toLocaleString("pt-BR")}
    </span>
  );
}

/** Palavra que troca sozinha, com um deslize suave. */
export function TextoRotativo({ palavras }: { palavras: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (semMovimento()) return;
    const t = setInterval(() => setI((x) => (x + 1) % palavras.length), 2400);
    return () => clearInterval(t);
  }, [palavras.length]);
  return (
    <span className="relative inline-block align-bottom">
      <span key={i} className="home-palavra -mb-[0.22em] inline-block bg-gradient-to-r from-emerald-300 via-teal-300 to-amber-300 bg-clip-text pb-[0.22em] text-transparent">
        {palavras[i]}
      </span>
    </span>
  );
}
