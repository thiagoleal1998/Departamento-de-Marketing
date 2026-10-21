"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Barra no topo (e cursor de espera) enquanto uma página ou aba está carregando após um clique em link. */
export function BarraProgresso() {
  const pathname = usePathname();
  const params = useSearchParams();
  const chave = pathname + "?" + params.toString();
  const [carregando, setCarregando] = useState(false);

  // A navegação terminou: a URL mudou.
  useEffect(() => {
    setCarregando(false);
  }, [chave]);

  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(a.href, location.href);
      } catch {
        return;
      }
      if (url.origin !== location.origin) return;
      if (url.pathname + url.search === location.pathname + location.search) return;
      setCarregando(true);
    }
    // Fase de captura: roda antes do <Link> do Next, que cancela o clique padrão.
    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, []);

  useEffect(() => {
    if (!carregando) return;
    document.body.style.cursor = "progress";
    const limite = setTimeout(() => setCarregando(false), 20000); // nunca fica preso
    return () => {
      document.body.style.cursor = "";
      clearTimeout(limite);
    };
  }, [carregando]);

  if (!carregando) return null;
  return (
    <div role="progressbar" aria-label="Carregando" className="pointer-events-none fixed inset-x-0 top-0 z-[300] h-1 bg-primary/15">
      <div className="h-full bg-primary" style={{ animation: "barra-carregando 8s cubic-bezier(0.1, 0.6, 0.3, 1) forwards" }} />
    </div>
  );
}
