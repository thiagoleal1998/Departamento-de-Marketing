"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { marcarTodasLidas } from "./actions";
import { formatarDataHora } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Notificacao } from "@/types/database";

export function NotificacoesBell({
  itens,
  naoLidas,
}: {
  itens: Notificacao[];
  naoLidas: number;
}) {
  const [open, setOpen] = useState(false);
  const [pendente, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function abrir() {
    const abrindo = !open;
    setOpen(abrindo);
    if (abrindo && naoLidas > 0 && !pendente) {
      startTransition(async () => {
        await marcarTodasLidas();
      });
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={abrir}
        aria-label="Notificações"
        className="relative flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Bell className="size-5" />
        {naoLidas > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 origin-top-right overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150">
          <div className="border-b px-4 py-3 text-sm font-semibold">
            Notificações
          </div>
          {itens.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação por aqui.
            </p>
          ) : (
            <ul className="max-h-96 divide-y overflow-auto">
              {itens.map((n) => {
                const conteudo = (
                  <div
                    className={cn(
                      "px-4 py-3 transition-colors hover:bg-accent/40",
                      !n.lida && "bg-primary/5"
                    )}
                  >
                    <p className="text-sm font-medium leading-snug">
                      {n.titulo}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatarDataHora(n.created_at)}
                    </p>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link href={n.link} onClick={() => setOpen(false)}>
                        {conteudo}
                      </Link>
                    ) : (
                      conteudo
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
