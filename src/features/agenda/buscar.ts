import { unstable_cache } from "next/cache";
import ical from "node-ical";
import { FONTES_AGENDA, urlIcs, type FonteAgenda } from "./fontes";

export interface EventoAgenda {
  titulo: string;
  /** yyyy-mm-dd do dia em que aparece. */
  dia: string;
  /** HH:MM (horário de Brasília) ou null para o dia todo. */
  hora: string | null;
  horaFim: string | null;
  ordem: number;
  agendas: string[]; // ids das agendas em que o evento aparece
}

export interface AgendaDoDia {
  dia: string;
  eventos: EventoAgenda[];
}

export interface ResultadoAgenda {
  dias: AgendaDoDia[];
  /** Agendas que não puderam ser lidas (privadas, fora do ar…). */
  indisponiveis: FonteAgenda[];
}

const SP = "America/Sao_Paulo";
const MS_DIA = 86_400_000;

const dataSP = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: SP }).format(d);
const horaSP = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: SP, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
const inicioDoDia = (dia: string) => new Date(`${dia}T00:00:00-03:00`); // Brasília sem horário de verão
const somar = (dia: string, n: number) => dataSP(new Date(inicioDoDia(dia).getTime() + n * MS_DIA + MS_DIA / 2));
const chaveLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Bruto = {
  titulo: string;
  dia: string;
  hora: string | null;
  horaFim: string | null;
  ordem: number;
};

async function lerAgenda(fonte: FonteAgenda, dias: string[]): Promise<{ eventos: Bruto[]; ok: boolean }> {
  try {
    const r = await fetch(urlIcs(fonte), { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!r.ok) return { eventos: [], ok: false };
    const texto = await r.text();
    if (!texto.includes("BEGIN:VCALENDAR")) return { eventos: [], ok: false };
    const dados = ical.sync.parseICS(texto);
    const eventos: Bruto[] = [];

    const adicionar = (titulo: string, ini: Date, fim: Date | undefined, diaInteiro: boolean) => {
      for (const dia of dias) {
        if (diaInteiro) {
          // Evento de dia inteiro: início e fim (exclusivo) são datas, sem horário.
          const s = chaveLocal(ini);
          const e = fim ? chaveLocal(fim) : somar(s, 1);
          if (s <= dia && dia < e) eventos.push({ titulo, dia, hora: null, horaFim: null, ordem: -1 });
        } else {
          const ini0 = inicioDoDia(dia).getTime();
          const fim0 = ini0 + MS_DIA;
          const f = (fim ?? ini).getTime();
          // Começa antes do fim do dia e termina depois do começo dele (evento sem fim conta o instante inicial).
          if (ini.getTime() < fim0 && Math.max(f, ini.getTime() + 1) > ini0) {
            eventos.push({
              titulo,
              dia,
              hora: horaSP(ini),
              horaFim: fim ? horaSP(fim) : null,
              ordem: ini.getTime(),
            });
          }
        }
      }
    };

    for (const e of Object.values(dados)) {
      if (!e || e.type !== "VEVENT") continue;
      if (String(e.status ?? "").toUpperCase() === "CANCELLED") continue;
      const titulo = String(typeof e.summary === "object" && e.summary && "val" in e.summary ? (e.summary as { val: string }).val : e.summary ?? "").trim() || "(sem título)";
      if (!e.start) continue;
      const diaInteiro = e.datetype === "date";
      const dur = e.end && e.start ? e.end.getTime() - e.start.getTime() : 0;

      if (e.rrule) {
        const de = new Date(inicioDoDia(dias[0]).getTime() - dur - MS_DIA);
        const ate = new Date(inicioDoDia(dias[dias.length - 1]).getTime() + 2 * MS_DIA);
        for (const d of e.rrule.between(de, ate, true)) {
          if (e.exdate && Object.values(e.exdate).some((x) => x && new Date(x as Date).getTime() === d.getTime())) continue;
          const sobreposto = e.recurrences
            ? Object.values(e.recurrences).find((rc) => rc.recurrenceid && new Date(rc.recurrenceid as Date).getTime() === d.getTime())
            : undefined;
          if (sobreposto) {
            if (String(sobreposto.status ?? "").toUpperCase() === "CANCELLED") continue;
            const t = String((sobreposto.summary as string | undefined) ?? titulo);
            adicionar(t, sobreposto.start as Date, sobreposto.end as Date | undefined, diaInteiro);
          } else {
            adicionar(titulo, d, e.end ? new Date(d.getTime() + dur) : undefined, diaInteiro);
          }
        }
      } else {
        adicionar(titulo, e.start as Date, e.end as Date | undefined, diaInteiro);
      }
    }
    return { eventos, ok: true };
  } catch {
    return { eventos: [], ok: false };
  }
}

const lerAgendaCache = unstable_cache(
  async (id: string, dia1: string, dia2: string) => {
    const fonte = FONTES_AGENDA.find((f) => f.id === id)!;
    return lerAgenda(fonte, [dia1, dia2]);
  },
  ["agenda-ics"],
  { revalidate: 1800 }
);

/** Eventos de hoje e de amanhã nas agendas configuradas (reuniões, Thiago, Jonas). */
export async function agendaHojeEAmanha(): Promise<ResultadoAgenda> {
  const hoje = dataSP(new Date());
  const amanha = somar(hoje, 1);
  const lidas = await Promise.all(FONTES_AGENDA.map(async (f) => ({ f, r: await lerAgendaCache(f.id, hoje, amanha) })));

  const indisponiveis = lidas.filter((x) => !x.r.ok).map((x) => x.f);
  const agora = horaSP(new Date());
  // Em "hoje", o que já passou da hora sai: some quando termina (sem horário de fim, quando começa).
  const jaPassou = (e: Bruto) => {
    if (e.dia !== hoje || !e.hora) return false;
    if (!e.horaFim) return e.hora < agora;
    if (e.horaFim < e.hora) return false; // termina só no dia seguinte
    return e.horaFim <= agora;
  };
  const dias: AgendaDoDia[] = [hoje, amanha].map((dia) => {
    const mapa = new Map<string, EventoAgenda>();
    for (const { f, r } of lidas) {
      for (const e of r.eventos.filter((x) => x.dia === dia && !jaPassou(x))) {
        // O mesmo compromisso costuma estar em mais de uma agenda: junta num só.
        const chave = `${e.titulo.toLowerCase()}|${e.hora ?? "dia"}`;
        const existente = mapa.get(chave);
        if (existente) {
          if (!existente.agendas.includes(f.id)) existente.agendas.push(f.id);
        } else {
          mapa.set(chave, { ...e, agendas: [f.id] });
        }
      }
    }
    return { dia, eventos: Array.from(mapa.values()).sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, "pt-BR")) };
  });
  return { dias, indisponiveis };
}
