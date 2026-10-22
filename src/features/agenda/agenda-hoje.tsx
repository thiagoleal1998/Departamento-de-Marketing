import { CalendarDays } from "lucide-react";
import { agendaHojeEAmanha } from "./buscar";
import { FONTES_AGENDA } from "./fontes";
import { diaSemana, dataCurta } from "@/features/divulgacao/tipos";

/** Letreiro compacto com os compromissos de hoje e de amanhã (Reuniões LV, Thiago e Jonas). */
export async function AgendaHoje() {
  const { dias, indisponiveis } = await agendaHojeEAmanha();
  const agenda = new Map(FONTES_AGENDA.map((f) => [f.id, f]));

  const segmentos = dias.map((d, i) => ({
    rotulo: `${i === 0 ? "Hoje" : "Amanhã"} · ${diaSemana(d.dia)} ${dataCurta(d.dia)}`,
    eventos: d.eventos,
  }));

  const conteudo = (
    <>
      {segmentos.map((s) => (
        <span key={s.rotulo} className="inline-flex items-center gap-3 pr-10">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">{s.rotulo}</span>
          {s.eventos.length === 0 ? (
            <span className="text-muted-foreground">sem compromissos</span>
          ) : (
            s.eventos.map((e, k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className="tabular-nums text-muted-foreground">{e.hora ?? "dia todo"}</span>
                <span className="font-medium">{e.titulo}</span>
                {e.agendas.map((a) => (
                  <span key={a} className={`inline-block size-1.5 rounded-full ${agenda.get(a)?.cor ?? "bg-muted"}`} title={agenda.get(a)?.rotulo} />
                ))}
                <span className="px-1 text-muted-foreground/50">•</span>
              </span>
            ))
          )}
        </span>
      ))}
      {indisponiveis.length > 0 ? (
        <span className="pr-10 text-xs text-amber-700">⚠ Agenda de {indisponiveis.map((x) => x.rotulo).join(", ")} indisponível (precisa estar pública no Google Agenda)</span>
      ) : null}
    </>
  );

  // Velocidade proporcional ao tamanho do texto (leitura confortável).
  const tamanho = segmentos.reduce((t, s) => t + s.rotulo.length + s.eventos.reduce((u, e) => u + e.titulo.length + 8, 0), 0);
  const duracao = Math.max(24, Math.round(tamanho * 0.32));

  return (
    <section aria-label="Agenda de hoje e de amanhã" className="flex h-11 w-full items-center gap-3 overflow-hidden rounded-full border bg-card pl-4 text-sm shadow-sm">
      <span className="flex shrink-0 items-center gap-1.5 border-r pr-3 text-xs font-semibold">
        <CalendarDays className="size-4 text-primary" /> Agenda
      </span>
      <div className="agenda-janela relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_4%,black_96%,transparent)]">
        {/* Duas cópias lado a lado: ao terminar a primeira, a segunda já ocupa o lugar (laço contínuo). */}
        <div className="agenda-letreiro flex w-max whitespace-nowrap" style={{ animationDuration: `${duracao}s` }}>
          <div className="flex shrink-0 items-center">{conteudo}</div>
          <div className="flex shrink-0 items-center" aria-hidden>
            {conteudo}
          </div>
        </div>
      </div>
    </section>
  );
}
