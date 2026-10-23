import { CalendarDays } from "lucide-react";
import { agendaHojeEAmanha, type AgendaDoDia } from "./buscar";
import { FONTES_AGENDA, type FonteAgenda } from "./fontes";
import { diaSemana, dataCurta } from "@/features/divulgacao/tipos";

const agenda = new Map(FONTES_AGENDA.map((f) => [f.id, f]));

/** Uma barra de letreiro: o dia (fixo, à esquerda) e os compromissos passando ao lado. */
function Letreiro({ rotulo, dia, aviso }: { rotulo: string; dia: AgendaDoDia; aviso?: string }) {
  const conteudo = (
    <>
      {dia.eventos.map((e, k) => (
        <span key={k} className="inline-flex items-center gap-1.5 pr-1">
          <span className="tabular-nums text-muted-foreground">{e.hora ?? "dia todo"}</span>
          <span className="font-medium">{e.titulo}</span>
          {e.agendas.map((a) => (
            <span key={a} className={`inline-block size-1.5 rounded-full ${agenda.get(a)?.cor ?? "bg-muted"}`} title={agenda.get(a)?.rotulo} />
          ))}
          <span className="px-2 text-muted-foreground/50">•</span>
        </span>
      ))}
      {aviso ? <span className="pr-10 text-xs text-amber-700">{aviso}</span> : null}
    </>
  );

  // Velocidade proporcional ao tamanho do texto (leitura confortável).
  const tamanho = dia.eventos.reduce((t, e) => t + e.titulo.length + 8, 0) + (aviso?.length ?? 0);
  const duracao = Math.max(22, Math.round(tamanho * 0.32));

  return (
    <div className="flex h-10 w-full items-center gap-3 overflow-hidden rounded-full border bg-card pl-3 text-sm shadow-sm">
      <span className="flex shrink-0 items-center gap-1.5 border-r pr-3">
        <CalendarDays className="size-4 text-primary" />
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
          {rotulo} · <span className="normal-case">{diaSemana(dia.dia)} {dataCurta(dia.dia)}</span>
        </span>
      </span>
      {dia.eventos.length === 0 && !aviso ? (
        <span className="text-muted-foreground">Sem compromissos</span>
      ) : (
        <div className="agenda-janela relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_4%,black_96%,transparent)]">
          {/* Duas cópias lado a lado: ao terminar a primeira, a segunda já ocupa o lugar (laço contínuo). */}
          <div className="agenda-letreiro flex w-max whitespace-nowrap" style={{ animationDuration: `${duracao}s` }}>
            <div className="flex shrink-0 items-center">{conteudo}</div>
            <div className="flex shrink-0 items-center" aria-hidden>
              {conteudo}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Dois letreiros compactos: compromissos de hoje e de amanhã (Reuniões LV, Thiago e Jonas). */
export async function AgendaHoje() {
  const { dias, indisponiveis } = await agendaHojeEAmanha();
  const aviso = indisponiveis.length
    ? `⚠ Agenda de ${indisponiveis.map((x: FonteAgenda) => x.rotulo).join(", ")} indisponível (precisa estar pública no Google Agenda)`
    : undefined;

  return (
    <section aria-label="Agenda de hoje e de amanhã" className="w-full space-y-2">
      <Letreiro rotulo="Hoje" dia={dias[0]} aviso={aviso} />
      <Letreiro rotulo="Amanhã" dia={dias[1]} />
    </section>
  );
}
