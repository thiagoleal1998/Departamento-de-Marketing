export type TipoOferta = "nacional" | "internacional";

export interface Oferta {
  id: string;
  data: string; // yyyy-mm-dd
  tipo: TipoOferta;
  canal: string | null;
  produto: string | null;
  temporada: string | null;
  vantagem: string | null;
  aereo: string | null;
  periodo_viagem: string | null;
  oferta_dia: string | null;
  conc_lv: number | null;
  conc_concorrente: number | null;
  conc_diferenca: number | null;
  observacao: string | null;
  aba_origem: string | null;
}

export interface DadosOferta {
  data: string;
  tipo: TipoOferta;
  canal: string;
  produto: string;
  temporada: string;
  vantagem: string;
  aereo: string;
  periodo_viagem: string;
  oferta_dia: string;
  conc_lv: string;
  conc_concorrente: string;
  conc_diferenca: string;
  observacao: string;
}

export const COLUNAS_OFERTA =
  "id, data, tipo, canal, produto, temporada, vantagem, aereo, periodo_viagem, oferta_dia, conc_lv, conc_concorrente, conc_diferenca, observacao, aba_origem";

const SEPARADOR = /\n\s*-{3,}\s*\n/;

/**
 * No nacional, um dia pode trazer vários produtos no mesmo campo, separados por "---".
 * Devolve um bloco por produto, alinhando produto, temporada, vantagem, aéreo e período pela posição.
 */
export function blocosNacional(o: Oferta) {
  const parte = (v: string | null) => (v ?? "").split(SEPARADOR).map((x) => x.trim());
  const produtos = parte(o.produto);
  const temps = parte(o.temporada);
  const vants = parte(o.vantagem);
  const aereos = parte(o.aereo);
  const periodos = parte(o.periodo_viagem);
  // Um produto pode ter várias opções (ex.: Natal e Carnaval): o número de blocos é o maior entre os campos.
  const n = Math.max(1, produtos.length, temps.length, vants.length, aereos.length, periodos.length);
  return Array.from({ length: n }, (_, i) => ({
    produto: produtos[i] || (produtos.length === 1 ? produtos[0] || null : null),
    temporada: temps[i] || (temps.length === 1 ? temps[0] || null : null),
    vantagem: vants[i] || (vants.length === 1 ? vants[0] || null : null),
    aereo: aereos[i] || (aereos.length === 1 ? aereos[0] || null : null),
    periodo: periodos[i] || (periodos.length === 1 ? periodos[0] || null : null),
  }));
}

export const moeda = (n: number | null | undefined) =>
  n === null || n === undefined ? null : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const diaSemana = (iso: string) => DIAS[new Date(iso + "T12:00:00Z").getUTCDay()];
export const dataCurta = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
export const dataBr = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4);

/** Segunda-feira da semana de uma data (yyyy-mm-dd). */
export function inicioDaSemana(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // segunda = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}
export function somarDias(iso: string, dias: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
export function hojeSP(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
