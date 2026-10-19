"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Feedback imediato ao navegar: barra de progresso no topo e um aviso
 * "Carregando…" enquanto a próxima tela é buscada (inclui a troca de abas,
 * que só muda os parâmetros da URL e não aciona o loading.tsx).
 */
export function ProgressoNavegacao() {
  const caminho = usePathname();
  const parametros = useSearchParams();
  const chave = `${caminho}?${parametros.toString()}`;

  const [ativo, setAtivo] = useState(false);
  const [largura, setLargura] = useState(0);
  const chaveAtual = useRef(chave);
  const limite = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A navegação terminou: completa a barra e esconde.
  useEffect(() => {
    if (chaveAtual.current === chave) return;
    chaveAtual.current = chave;
    if (limite.current) clearTimeout(limite.current);
    setLargura(100);
    const t = setTimeout(() => {
      setAtivo(false);
      setLargura(0);
    }, 250);
    return () => clearTimeout(t);
  }, [chave]);

  // Início: clique em link interno que leva para outra URL.
  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname + url.search === window.location.pathname + window.location.search) return;

      setAtivo(true);
      setLargura(15);
      // Avança devagar até ~85% enquanto espera.
      requestAnimationFrame(() => setLargura(85));
      // Segurança: some depois de 20 s mesmo que algo falhe.
      if (limite.current) clearTimeout(limite.current);
      limite.current = setTimeout(() => {
        setAtivo(false);
        setLargura(0);
      }, 20000);
    }
    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, []);

  if (!ativo) return null;

  return (
    <>
      <div
        role="progressbar"
        aria-label="Carregando"
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 bg-transparent"
      >
        <div
          className="h-full bg-primary"
          style={{
            width: `${largura}%`,
            transition: largura === 100 ? "width 200ms ease-out" : "width 12s cubic-bezier(0.1, 0.6, 0.2, 1)",
          }}
        />
      </div>
      <div
        role="status"
        className="pointer-events-none fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full border bg-background/95 px-4 py-2 text-sm shadow-lg backdrop-blur"
      >
        <Loader2 className="size-4 animate-spin text-primary" />
        Carregando…
      </div>
    </>
  );
}
