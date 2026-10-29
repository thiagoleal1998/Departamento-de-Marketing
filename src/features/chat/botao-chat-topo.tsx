"use client";

import Link from "@/components/shared/link";
import { MessagesSquare } from "lucide-react";
import { useChatContagem } from "./contagem-chat";

/** Ícone do chat no topo, com as não lidas ao vivo. */
export function BotaoChatTopo({ naoLidas }: { naoLidas: number }) {
  const vivo = useChatContagem();
  const n = vivo.carregado ? vivo.total : naoLidas;
  return (
    <Link
      href="/chat"
      title="Chat do time"
      aria-label={n > 0 ? "Chat do time, " + n + " mensagens não lidas" : "Chat do time"}
      className="relative inline-flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent"
    >
      <MessagesSquare className="size-4" />
      {n > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
          {n > 99 ? "99+" : n}
        </span>
      ) : null}
    </Link>
  );
}
