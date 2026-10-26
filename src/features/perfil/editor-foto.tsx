"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const VISOR = 280; // tamanho da área de ajuste na tela
const SAIDA = 256; // tamanho da foto gravada

/** Ajuste da foto: arraste para enquadrar e use o zoom; a foto final é um quadrado de 256 px. */
export function EditorFoto({ src, onAplicar, onCancelar }: { src: string; onAplicar: (dataUrl: string) => void; onCancelar: () => void }) {
  const tela = useRef<HTMLCanvasElement>(null);
  const imagem = useRef<HTMLImageElement | null>(null);
  const arrasto = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [pronto, setPronto] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // deslocamento da imagem a partir do centro

  /** Retângulo da imagem no visor, sem deixar sobrar borda vazia. */
  const retangulo = useCallback((z: number, p: { x: number; y: number }) => {
    const img = imagem.current;
    if (!img) return null;
    const base = Math.max(VISOR / img.naturalWidth, VISOR / img.naturalHeight);
    const w = img.naturalWidth * base * z;
    const h = img.naturalHeight * base * z;
    const x = Math.min(0, Math.max(VISOR - w, VISOR / 2 - w / 2 + p.x));
    const y = Math.min(0, Math.max(VISOR - h, VISOR / 2 - h / 2 + p.y));
    return { x, y, w, h };
  }, []);

  const limitar = useCallback(
    (z: number, p: { x: number; y: number }) => {
      const r = retangulo(z, p);
      return r ? { x: r.x - (VISOR / 2 - r.w / 2), y: r.y - (VISOR / 2 - r.h / 2) } : p;
    },
    [retangulo]
  );

  useEffect(() => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => {
      imagem.current = img;
      setPronto(true);
    };
    img.onerror = () => setFalhou(true);
    img.src = src;
  }, [src]);

  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => e.key === "Escape" && onCancelar();
    document.addEventListener("keydown", aoTecla);
    return () => document.removeEventListener("keydown", aoTecla);
  }, [onCancelar]);

  useEffect(() => {
    const c = tela.current;
    const r = retangulo(zoom, pos);
    if (!pronto || !c || !r || !imagem.current) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, VISOR, VISOR);
    ctx.drawImage(imagem.current, r.x, r.y, r.w, r.h);
  }, [pronto, zoom, pos, retangulo]);

  function mudarZoom(z: number) {
    const novo = Math.min(4, Math.max(1, z));
    setZoom(novo);
    setPos((p) => limitar(novo, p));
  }

  function aplicar() {
    const r = retangulo(zoom, pos);
    if (!r || !imagem.current) return;
    const saida = document.createElement("canvas");
    saida.width = SAIDA;
    saida.height = SAIDA;
    const ctx = saida.getContext("2d");
    if (!ctx) return;
    const k = SAIDA / VISOR;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, SAIDA, SAIDA);
    ctx.drawImage(imagem.current, r.x * k, r.y * k, r.w * k, r.h * k);
    try {
      onAplicar(saida.toDataURL("image/jpeg", 0.85));
    } catch {
      setFalhou(true);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onCancelar()}>
      <div role="dialog" aria-modal="true" aria-label="Ajustar foto" className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Ajustar foto</h2>
            <p className="text-sm text-muted-foreground">Arraste para enquadrar e use o zoom.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={onCancelar}>
            <X className="size-5" />
          </Button>
        </div>

        {falhou ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">Não foi possível abrir esta imagem. Tente outra.</p>
        ) : (
          <div className="relative mx-auto size-[280px] touch-none select-none overflow-hidden rounded-lg bg-muted">
            <canvas
              ref={tela}
              width={VISOR}
              height={VISOR}
              className="size-full cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                arrasto.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
              }}
              onPointerMove={(e) => {
                const a = arrasto.current;
                if (a) setPos(limitar(zoom, { x: a.px + e.clientX - a.x, y: a.py + e.clientY - a.y }));
              }}
              onPointerUp={() => (arrasto.current = null)}
              onPointerCancel={() => (arrasto.current = null)}
              onWheel={(e) => mudarZoom(zoom - e.deltaY / 500)}
            />
            {/* Máscara circular: o que fica fora do círculo não aparece na foto de perfil */}
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(0,0,0,0.5)] ring-2 ring-white/80" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" aria-label="Diminuir zoom" onClick={() => mudarZoom(zoom - 0.2)} disabled={falhou}>
            <Minus className="size-4" />
          </Button>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => mudarZoom(Number(e.target.value))}
            aria-label="Zoom"
            disabled={falhou}
            className="h-2 flex-1 accent-primary"
          />
          <Button type="button" variant="ghost" size="icon" aria-label="Aumentar zoom" onClick={() => mudarZoom(zoom + 0.2)} disabled={falhou}>
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="button" onClick={aplicar} disabled={!pronto || falhou}>
            <Check className="size-4" /> Aplicar
          </Button>
        </div>
      </div>
    </div>
  );
}
