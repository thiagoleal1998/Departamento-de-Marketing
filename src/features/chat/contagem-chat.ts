"use client";

import { useSyncExternalStore } from "react";
import { contagensChat } from "./actions";
import type { Contagens } from "@/lib/contagens";

/**
 * Não lidas do chat, ao vivo: o servidor entrega o número ao abrir a página, e este "quadro" é atualizado quando
 * chega mensagem (ouvinte-chat) ou quando a conversa é lida. Menu, topo e lista do chat leem daqui.
 */
interface Estado {
  carregado: boolean;
  total: number;
  porConversa: Record<string, number>;
}

let estado: Estado = { carregado: false, total: 0, porConversa: {} };
const ouvintes = new Set<() => void>();

const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
};

export function useChatContagem(): Estado {
  return useSyncExternalStore(assinar, () => estado, () => estado);
}

/** Mesmas contagens do menu, com o número do chat trocado pelo atual. */
export function useContagensVivas(contagens: Contagens): Contagens {
  const c = useChatContagem();
  return c.carregado ? { ...contagens, "/chat": c.total } : contagens;
}

let emAndamento = false;
let repetir = false;

/** Busca os números atuais no servidor e atualiza tudo o que os mostra. */
export async function sincronizarChatContagem() {
  if (emAndamento) {
    repetir = true;
    return;
  }
  emAndamento = true;
  try {
    do {
      repetir = false;
      const r = await contagensChat();
      estado = { carregado: true, total: r.total, porConversa: r.porConversa };
      ouvintes.forEach((f) => f());
    } while (repetir);
  } finally {
    emAndamento = false;
  }
}
