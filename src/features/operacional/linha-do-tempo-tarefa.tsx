"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CalendarClock, Flag, History, Loader2, Plus, Tag, UserRound } from "lucide-react";
import { historicoDaTarefa } from "./historico-actions";
import { rotuloMotivo, type EventoTarefa } from "./historico-tipos";
import { formatarData, formatarDataHora, cn } from "@/lib/utils";

const dash = (v: string | null) => (v && v.trim() ? v : "—");

interface Linha {
  chave: string;
  icone: typeof History;
  cor: string;
  titulo: React.ReactNode;
  motivo?: string | null;
  detalhe?: string | null;
  autor: string | null;
  quando: string;
}

/** Texto, ícone e cor de cada tipo de alteração. */
function descrever(e: EventoTarefa): Linha {
  const base = { chave: e.id, autor: e.autor, quando: e.quando, detalhe: e.detalhe };
  switch (e.campo) {
    case "criada":
      return { ...base, icone: Plus, cor: "bg-emerald-500", titulo: "Tarefa criada" };
    case "status":
      return { ...base, icone: ArrowRight, cor: "bg-sky-500", titulo: <>Status: <b>{dash(e.de)}</b> → <b>{dash(e.para)}</b></> };
    case "prazo": {
      const adiado = !!e.de && !!e.para && e.para > e.de;
      const antecipado = !!e.de && !!e.para && e.para < e.de;
      return {
        ...base,
        icone: CalendarClock,
        cor: adiado ? "bg-amber-500" : "bg-violet-500",
        titulo: e.de ? (
          e.para ? (
            <>
              Prazo {adiado ? "adiado" : antecipado ? "antecipado" : "alterado"}: <b>{formatarData(e.de)}</b> → <b>{formatarData(e.para)}</b>
            </>
          ) : (
            <>Prazo removido (era <b>{formatarData(e.de)}</b>)</>
          )
        ) : (
          <>Prazo definido: <b>{e.para ? formatarData(e.para) : "—"}</b></>
        ),
        motivo: rotuloMotivo(e.motivo),
      };
    }
    case "responsavel":
      return { ...base, icone: UserRound, cor: "bg-indigo-500", titulo: <>Responsável: <b>{dash(e.de)}</b> → <b>{dash(e.para)}</b></> };
    case "colaborador":
      return { ...base, icone: UserRound, cor: "bg-indigo-400", titulo: <>Colaborador: <b>{dash(e.de)}</b> → <b>{dash(e.para)}</b></> };
    case "solicitante":
      return { ...base, icone: Tag, cor: "bg-teal-500", titulo: <>Solicitante: <b>{dash(e.de)}</b> → <b>{dash(e.para)}</b></> };
    case "prioridade":
      return { ...base, icone: Flag, cor: "bg-rose-500", titulo: <>Prioridade: <b>{dash(e.de)}</b> → <b>{dash(e.para)}</b></> };
    case "titulo":
      return { ...base, icone: History, cor: "bg-slate-400", titulo: <>Título alterado: <b>{dash(e.de)}</b> → <b>{dash(e.para)}</b></> };
    default:
      return { ...base, icone: History, cor: "bg-slate-400", titulo: e.campo };
  }
}

/**
 * Linha do tempo do card: o que mudou, quando, por quem e por quê (o motivo vem da lista escolhida ao mudar o prazo).
 * `versao` muda depois de cada salvamento, para recarregar.
 */
export function LinhaDoTempoTarefa({ tarefaId, criadaEm, versao }: { tarefaId: string; criadaEm: string | null; versao: number }) {
  const [eventos, setEventos] = useState<EventoTarefa[] | null>(null);
  const [semTabela, setSemTabela] = useState(false);

  useEffect(() => {
    let vivo = true;
    void historicoDaTarefa(tarefaId).then((r) => {
      if (!vivo) return;
      setEventos(r.eventos);
      setSemTabela(!!r.semTabela);
    });
    return () => {
      vivo = false;
    };
  }, [tarefaId, versao]);

  const linhas = (eventos ?? []).map(descrever);
  // Tarefas antigas não têm o registro de criação: mostra a data de criação no fim.
  const temCriada = (eventos ?? []).some((e) => e.campo === "criada");
  const mostrarCriacao = !temCriada && !!criadaEm;

  return (
    <section className="space-y-3 rounded-lg border p-4" aria-label="Linha do tempo da tarefa">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <History className="size-4 text-muted-foreground" /> Linha do tempo
      </h3>
      {eventos === null ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Carregando…
        </p>
      ) : semTabela ? (
        <p className="text-xs text-muted-foreground">O histórico das tarefas ainda não foi ativado no banco (falta rodar a migration 0087).</p>
      ) : linhas.length === 0 && !mostrarCriacao ? (
        <p className="text-xs text-muted-foreground">Nenhuma alteração registrada ainda. As mudanças de status, prazo (com o motivo), responsável e outras aparecem aqui.</p>
      ) : (
        <ol className="relative space-y-4 border-l pl-5">
          {linhas.map((l) => {
            const Icone = l.icone;
            return (
              <li key={l.chave} className="relative">
                <span className={cn("absolute -left-[1.85rem] top-0.5 grid size-5 place-items-center rounded-full text-white", l.cor)}>
                  <Icone className="size-3" aria-hidden />
                </span>
                <p className="text-sm leading-snug">{l.titulo}</p>
                {l.motivo ? (
                  <p className="mt-0.5 text-xs">
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-800 dark:text-amber-300">Motivo: {l.motivo}</span>
                  </p>
                ) : null}
                {l.detalhe ? <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">“{l.detalhe}”</p> : null}
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatarDataHora(l.quando)}
                  {l.autor ? ` · ${l.autor}` : ""}
                </p>
              </li>
            );
          })}
          {mostrarCriacao ? (
            <li className="relative">
              <span className="absolute -left-[1.85rem] top-0.5 grid size-5 place-items-center rounded-full bg-emerald-500 text-white">
                <Plus className="size-3" aria-hidden />
              </span>
              <p className="text-sm leading-snug">Tarefa criada</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{formatarDataHora(criadaEm as string)}</p>
            </li>
          ) : null}
        </ol>
      )}
    </section>
  );
}
