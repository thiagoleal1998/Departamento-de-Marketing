"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { batimento } from "./batimento-actions";

const SINAL_MS = 60_000; // um sinal por minuto
const INATIVO_MS = 5 * 60_000; // sem mexer por 5 min = inativo

/**
 * Manda ao servidor, a cada minuto, que a pessoa está com o painel aberto e se ela está mexendo nele
 * (mouse, teclado, rolagem ou toque). Também avisa a cada tela aberta. Não aparece nada na tela.
 */
export function RastreadorAtividade() {
  const caminho = usePathname();
  const caminhoRef = useRef(caminho);
  const ultimaInteracao = useRef(Date.now());
  const pendentes = useRef<string[]>([]);
  const enviando = useRef(false);

  caminhoRef.current = caminho;

  const enviar = useRef(async () => {
    if (enviando.current) return;
    enviando.current = true;
    const visitas = pendentes.current.splice(0);
    const ativo = !document.hidden && Date.now() - ultimaInteracao.current < INATIVO_MS;
    try {
      await batimento({ ativo, caminho: caminhoRef.current ?? "", visitas });
    } catch {
      pendentes.current.unshift(...visitas); // tenta de novo no próximo sinal
    } finally {
      enviando.current = false;
    }
  });

  // Cada tela aberta entra no registro e já gera um sinal.
  useEffect(() => {
    if (!caminho) return;
    pendentes.current.push(caminho);
    ultimaInteracao.current = Date.now();
    void enviar.current();
  }, [caminho]);

  useEffect(() => {
    const marcar = () => {
      ultimaInteracao.current = Date.now();
    };
    const eventos = ["pointerdown", "keydown", "scroll", "touchstart", "wheel"] as const;
    for (const e of eventos) window.addEventListener(e, marcar, { passive: true, capture: true });
    // O mouse se move o tempo todo: só conta de vez em quando.
    let ultimoMove = 0;
    const mover = () => {
      const t = Date.now();
      if (t - ultimoMove > 5000) {
        ultimoMove = t;
        marcar();
      }
    };
    window.addEventListener("mousemove", mover, { passive: true });

    const timer = setInterval(() => void enviar.current(), SINAL_MS);
    const aoVoltar = () => {
      if (!document.hidden) void enviar.current();
    };
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      for (const e of eventos) window.removeEventListener(e, marcar, { capture: true });
      window.removeEventListener("mousemove", mover);
      document.removeEventListener("visibilitychange", aoVoltar);
      clearInterval(timer);
    };
  }, []);

  return null;
}
