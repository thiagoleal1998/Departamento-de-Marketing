"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { presencaAgora, type PessoaOnline } from "./batimento-actions";
import { rotuloTela } from "./rotulo-tela";
import { cn } from "@/lib/utils";

/** Quem está online agora (gerente e líder): contagem, nomes e se está mexendo ou ausente. Atualiza sozinho. */
export function PresencaOnlineCliente({ inicial, euId }: { inicial: PessoaOnline[]; euId: string }) {
  const [pessoas, setPessoas] = useState(inicial);

  useEffect(() => {
    let vivo = true;
    const atualizar = () => {
      if (document.hidden) return;
      void presencaAgora().then((l) => vivo && setPessoas(l));
    };
    const t = setInterval(atualizar, 45_000);
    document.addEventListener("visibilitychange", atualizar);
    return () => {
      vivo = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, []);

  const ativos = pessoas.filter((p) => p.ativo).length;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-3 py-2 text-sm shadow-sm" aria-live="polite">
      <span className="flex items-center gap-2 font-medium">
        <span className="relative flex size-2.5">
          <span className={cn("absolute inline-flex size-full rounded-full opacity-60", pessoas.length > 0 && "animate-ping bg-emerald-500")} />
          <span className={cn("relative inline-flex size-2.5 rounded-full", pessoas.length > 0 ? "bg-emerald-500" : "bg-muted-foreground/40")} />
        </span>
        <Users className="size-4 text-muted-foreground" />
        {pessoas.length === 0 ? "Ninguém online agora" : `${pessoas.length} online agora`}
        {pessoas.length > 0 && ativos < pessoas.length ? <span className="text-xs font-normal text-muted-foreground">({ativos} ativo{ativos === 1 ? "" : "s"})</span> : null}
      </span>
      <ul className="flex flex-wrap items-center gap-2">
        {pessoas.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-1.5 rounded-full bg-muted/60 py-0.5 pl-0.5 pr-2.5"
            title={`${p.nome} · ${p.ativo ? "ativo" : "ausente (sem mexer há alguns minutos)"}${p.caminho ? " · em " + rotuloTela(p.caminho) : ""}`}
          >
            <span className="relative">
              <Avatar nome={p.nome} src={p.avatar_url} className="size-6" />
              <span className={cn("absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card", p.ativo ? "bg-emerald-500" : "bg-amber-400")} />
            </span>
            <span className="text-xs font-medium">
              {p.id === euId ? "Você" : p.nome.split(" ")[0]}
              {!p.ativo ? <span className="font-normal text-muted-foreground"> · ausente</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
