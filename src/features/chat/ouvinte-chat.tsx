"use client";

import { useEffect } from "react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { sincronizarChatContagem } from "./contagem-chat";

/**
 * Fica ligado em todas as telas: ao chegar mensagem de outra pessoa (ou ao mudar o número que o servidor entregou),
 * atualiza as não lidas do menu, do topo e da lista do chat sem precisar recarregar a página.
 */
export function OuvinteChat({ usuarioId, naoLidas }: { usuarioId: string; naoLidas: number }) {
  // Ao abrir (e quando o servidor entrega outro número): pega os números atuais.
  useEffect(() => {
    void sincronizarChatContagem();
  }, [naoLidas]);

  useEffect(() => {
    const supabase = criarClienteBrowser();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const canal = supabase
      .channel("chat-contagem-" + usuarioId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_mensagens" }, (p) => {
        const m = p.new as { autor_id: string };
        if (m.autor_id === usuarioId) return;
        // Duas conferências: logo depois e mais tarde (se a conversa aberta marcar como lida, o número baixa sozinho).
        for (const ms of [400, 1800]) timers.push(setTimeout(() => void sincronizarChatContagem(), ms));
      })
      .subscribe();
    return () => {
      timers.forEach(clearTimeout);
      void supabase.removeChannel(canal);
    };
  }, [usuarioId]);

  return null;
}
