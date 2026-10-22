import { CalendarDays } from "lucide-react";
import { agendaHojeEAmanha } from "./buscar";
import { FONTES_AGENDA } from "./fontes";
import { diaSemana, dataCurta } from "@/features/divulgacao/tipos";

/** Compromissos de hoje e de amanhã (Reuniões LV, Thiago e Jonas), para o topo do dashboard. */
export async function AgendaHoje() {
  const { dias, indisponiveis } = await agendaHojeEAmanha();
  const nomeAgenda = new Map(FONTES_AGENDA.map((f) => [f.id, f]));

  return (
    <section aria-label="Agenda de hoje e de amanhã" className="w-full rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <CalendarDays className="size-4 text-primary" /> Agenda
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {dias.map((d, i) => (
          <div key={d.dia} className="min-w-0 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {i === 0 ? "Hoje" : "Amanhã"} · <span className="normal-case">{diaSemana(d.dia)} {dataCurta(d.dia)}</span>
            </p>
            {d.eventos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem compromissos.</p>
            ) : (
              <ul className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {d.eventos.map((e, k) => (
                  <li key={k} className="flex gap-2 text-sm leading-snug">
                    <span className="w-[4.2rem] shrink-0 tabular-nums text-muted-foreground">{e.hora ?? "Dia todo"}</span>
                    <span className="min-w-0">
                      <span className="font-medium">{e.titulo}</span>
                      <span className="ml-1.5 inline-flex gap-1 align-middle">
                        {e.agendas.map((a) => (
                          <span key={a} className={`inline-block size-2 rounded-full ${nomeAgenda.get(a)?.cor ?? "bg-muted"}`} title={nomeAgenda.get(a)?.rotulo} />
                        ))}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground">
        {FONTES_AGENDA.map((f) => (
          <span key={f.id} className="inline-flex items-center gap-1">
            <span className={`inline-block size-2 rounded-full ${f.cor}`} /> {f.rotulo}
            {indisponiveis.some((x) => x.id === f.id) ? <span className="text-amber-700">(indisponível)</span> : null}
          </span>
        ))}
      </div>
      {indisponiveis.length > 0 ? (
        <p className="mt-1 text-[11px] text-amber-700">
          Para mostrar {indisponiveis.map((x) => x.rotulo).join(", ")}, a agenda precisa estar pública no Google Agenda (ou informe o endereço secreto em formato iCal).
        </p>
      ) : null}
    </section>
  );
}
