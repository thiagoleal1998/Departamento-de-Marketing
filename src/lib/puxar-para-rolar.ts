"use client";

import { useEffect, type RefObject } from "react";

/**
 * Deixa "puxar" uma área larga para o lado com o mouse (clicar no fundo e arrastar), sem precisar
 * da barra de rolagem lá embaixo. Em telas de toque o próprio dedo já rola a área.
 * `ignorar`: seletor dos elementos que NÃO iniciam o arraste (botões, campos, cartões arrastáveis…).
 */
export function usePuxarParaRolar(
  ref: RefObject<HTMLElement | null>,
  ignorar = "a, button, input, select, textarea, label, [draggable=true]",
  ativo = true
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !ativo) return;
    let puxando = false;
    let moveu = false;
    let x0 = 0;
    let rolagem0 = 0;

    const aoPressionar = (e: PointerEvent) => {
      if (e.button !== 0 || e.pointerType === "touch") return;
      if ((e.target as HTMLElement).closest(ignorar)) return;
      puxando = true;
      moveu = false;
      x0 = e.clientX;
      rolagem0 = el.scrollLeft;
    };
    const aoMover = (e: PointerEvent) => {
      if (!puxando) return;
      const dx = e.clientX - x0;
      if (!moveu && Math.abs(dx) < 4) return;
      moveu = true;
      el.scrollLeft = rolagem0 - dx;
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";
    };
    const aoSoltar = () => {
      if (!puxando) return;
      puxando = false;
      el.style.cursor = "";
      el.style.userSelect = "";
    };
    // Depois de arrastar, o clique que "sobra" não deve abrir nada.
    const aoClicar = (e: MouseEvent) => {
      if (moveu) {
        e.preventDefault();
        e.stopPropagation();
        moveu = false;
      }
    };

    el.addEventListener("pointerdown", aoPressionar);
    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
    window.addEventListener("pointercancel", aoSoltar);
    el.addEventListener("click", aoClicar, true);
    return () => {
      el.removeEventListener("pointerdown", aoPressionar);
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
      window.removeEventListener("pointercancel", aoSoltar);
      el.removeEventListener("click", aoClicar, true);
    };
  }, [ref, ignorar, ativo]);
}
