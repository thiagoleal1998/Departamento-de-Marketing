export type TipoFeriado = "nacional" | "facultativo" | "extra";

export interface Feriado {
  /** yyyy-mm-dd */
  data: string;
  nome: string;
  tipo: TipoFeriado;
  /** id do feriado extra (só para os cadastrados à mão). */
  extraId?: string;
}

const DIA = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const utc = (a: number, m: number, d: number) => Date.UTC(a, m - 1, d);

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function pascoa(ano: number): number {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(ano, mes, dia);
}

/** Feriados nacionais e pontos facultativos federais do ano (os estaduais e municipais entram como "extras"). */
export function feriadosDoAno(ano: number): Feriado[] {
  const p = pascoa(ano);
  const lista: Feriado[] = [
    { data: iso(utc(ano, 1, 1)), nome: "Confraternização Universal (Ano Novo)", tipo: "nacional" },
    { data: iso(p - 48 * DIA), nome: "Carnaval (segunda-feira)", tipo: "facultativo" },
    { data: iso(p - 47 * DIA), nome: "Carnaval (terça-feira)", tipo: "facultativo" },
    { data: iso(p - 46 * DIA), nome: "Quarta-feira de Cinzas (até as 14h)", tipo: "facultativo" },
    { data: iso(p - 2 * DIA), nome: "Sexta-feira Santa", tipo: "nacional" },
    { data: iso(utc(ano, 4, 21)), nome: "Tiradentes", tipo: "nacional" },
    { data: iso(utc(ano, 5, 1)), nome: "Dia do Trabalho", tipo: "nacional" },
    { data: iso(p + 60 * DIA), nome: "Corpus Christi", tipo: "facultativo" },
    { data: iso(utc(ano, 9, 7)), nome: "Independência do Brasil", tipo: "nacional" },
    { data: iso(utc(ano, 10, 12)), nome: "Nossa Senhora Aparecida", tipo: "nacional" },
    { data: iso(utc(ano, 10, 28)), nome: "Dia do Servidor Público", tipo: "facultativo" },
    { data: iso(utc(ano, 11, 2)), nome: "Finados", tipo: "nacional" },
    { data: iso(utc(ano, 11, 15)), nome: "Proclamação da República", tipo: "nacional" },
    { data: iso(utc(ano, 11, 20)), nome: "Dia da Consciência Negra", tipo: "nacional" },
    { data: iso(utc(ano, 12, 24)), nome: "Véspera de Natal", tipo: "facultativo" },
    { data: iso(utc(ano, 12, 25)), nome: "Natal", tipo: "nacional" },
    { data: iso(utc(ano, 12, 31)), nome: "Véspera de Ano Novo", tipo: "facultativo" },
  ];
  return lista.sort((a, b) => a.data.localeCompare(b.data));
}

const SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
export const diaDaSemana = (d: string) => SEMANA[new Date(d + "T12:00:00Z").getUTCDay()];
export const caiNoFimDeSemana = (d: string) => {
  const w = new Date(d + "T12:00:00Z").getUTCDay();
  return w === 0 || w === 6;
};
export const dataBr = (d: string) => d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(0, 4);
