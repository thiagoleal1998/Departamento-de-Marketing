"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN = 1;
const MAX = 8;

/**
 * Área com zoom e arrastar (para imagens/peças grandes): roda do mouse ou botões +/− para aproximar, arrastar para mover,
 * duplo clique alterna entre ajustar e ampliar, e dois dedos fazem pinça no celular/tablet.
 */
export function ZoomPan({
  children,
  className,
  bloquearArrasto = false,
  extra,
}: {
  children: React.ReactNode;
  className?: string;
  /** Quando o conteúdo tem a própria ação de arrastar (ex.: desenhar): só o botão do meio move; o zoom continua. */
  bloquearArrasto?: boolean;
  /** Controles extras no canto superior esquerdo. */
  extra?: React.ReactNode;
}) {
  const [escala, setEscala] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const area = useRef<HTMLDivElement>(null);
  const ponteiros = useRef(new Map<number, { x: number; y: number }>());
  const pinca = useRef<{ dist: number; escala: number } | null>(null);
  const arrasto = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const moveu = useRef(false);

  const limitar = (e: number) => Math.min(MAX, Math.max(MIN, e));

  /** Muda a escala mantendo parado o ponto (cx, cy) em relação ao centro da área. */
  const zoomEm = useCallback((nova: number, cx = 0, cy = 0) => {
    setEscala((atual) => {
      const alvo = limitar(nova);
      const k = alvo / atual;
      setPos((p) => (alvo === 1 ? { x: 0, y: 0 } : { x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k }));
      return alvo;
    });
  }, []);

  const centro = (clientX: number, clientY: number) => {
    const r = area.current!.getBoundingClientRect();
    return { cx: clientX - (r.left + r.width / 2), cy: clientY - (r.top + r.height / 2) };
  };

  // A roda do mouse precisa de um ouvinte nativo (o do React é passivo e não deixa rolar a página junto).
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const roda = (e: WheelEvent) => {
      e.preventDefault();
      const { cx, cy } = centro(e.clientX, e.clientY);
      setEscala((atual) => {
        const alvo = limitar(atual * Math.exp(-e.deltaY * 0.0018));
        const k = alvo / atual;
        setPos((p) => (alvo === 1 ? { x: 0, y: 0 } : { x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k }));
        return alvo;
      });
    };
    el.addEventListener("wheel", roda, { passive: false });
    return () => el.removeEventListener("wheel", roda);
  }, []);

  function descer(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moveu.current = false;
    if (ponteiros.current.size === 2) {
      const [a, b] = [...ponteiros.current.values()];
      pinca.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), escala };
      arrasto.current = null;
    } else if (!bloquearArrasto || e.button === 1) {
      arrasto.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    }
  }
  function mover(e: React.PointerEvent) {
    if (!ponteiros.current.has(e.pointerId)) return;
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ponteiros.current.size === 2 && pinca.current) {
      const [a, b] = [...ponteiros.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const { cx, cy } = centro((a.x + b.x) / 2, (a.y + b.y) / 2);
      zoomEm(pinca.current.escala * (d / pinca.current.dist), cx, cy);
      moveu.current = true;
    } else if (arrasto.current && escala > 1) {
      const dx = e.clientX - arrasto.current.x;
      const dy = e.clientY - arrasto.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moveu.current = true;
      setPos({ x: arrasto.current.px + dx, y: arrasto.current.py + dy });
    }
  }
  function subir(e: React.PointerEvent) {
    ponteiros.current.delete(e.pointerId);
    pinca.current = null;
    arrasto.current = null;
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        ref={area}
        onPointerDown={descer}
        onPointerMove={mover}
        onPointerUp={subir}
        onPointerCancel={subir}
        onDoubleClick={(e) => {
          if (bloquearArrasto) return;
          const { cx, cy } = centro(e.clientX, e.clientY);
          zoomEm(escala > 1.05 ? 1 : 2.5, cx, cy);
        }}
        onClickCapture={(e) => {
          // Arrastar não deve contar como clique no que está embaixo (marcações, links).
          if (moveu.current) {
            e.stopPropagation();
            e.preventDefault();
            moveu.current = false;
          }
        }}
        className={cn("flex h-full w-full touch-none items-center justify-center", !bloquearArrasto && (escala > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"))}
      >
        <div style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${escala})`, transformOrigin: "center", transition: arrasto.current || pinca.current ? "none" : "transform 120ms ease-out" }}>
          {children}
        </div>
      </div>

      {extra ? <div className="absolute left-3 top-3 z-10">{extra}</div> : null}

      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 p-1 text-white shadow-lg backdrop-blur">
        <button type="button" onClick={() => zoomEm(escala / 1.4)} disabled={escala <= MIN} aria-label="Diminuir" className="grid size-8 place-items-center rounded-full hover:bg-white/15 disabled:opacity-40">
          <Minus className="size-4" />
        </button>
        <span className="w-11 text-center text-xs font-medium tabular-nums">{Math.round(escala * 100)}%</span>
        <button type="button" onClick={() => zoomEm(escala * 1.4)} disabled={escala >= MAX} aria-label="Aumentar" className="grid size-8 place-items-center rounded-full hover:bg-white/15 disabled:opacity-40">
          <Plus className="size-4" />
        </button>
        <button type="button" onClick={() => zoomEm(1)} disabled={escala === 1} aria-label="Ajustar à tela" title="Ajustar à tela" className="grid size-8 place-items-center rounded-full hover:bg-white/15 disabled:opacity-40">
          <Maximize className="size-4" />
        </button>
      </div>
    </div>
  );
}
