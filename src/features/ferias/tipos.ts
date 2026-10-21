export interface Ferias {
  id: string;
  profile_id: string;
  inicio: string; // yyyy-mm-dd
  fim: string; // yyyy-mm-dd
  observacao: string | null;
}

export interface PessoaFerias {
  id: string;
  nome: string;
}

const DIA = 86_400_000;
const utc = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
};

/** Dias corridos de férias (inclui o primeiro e o último dia). */
export const diasDeFerias = (f: { inicio: string; fim: string }) => Math.round((utc(f.fim) - utc(f.inicio)) / DIA) + 1;

export const dataBr = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4);

/** Há sobreposição entre dois períodos? */
export const sobrepoe = (a: { inicio: string; fim: string }, b: { inicio: string; fim: string }) =>
  a.inicio <= b.fim && b.inicio <= a.fim;

/** Posição (0–100) de uma data dentro do ano, para a linha do tempo. */
export function posicaoNoAno(iso: string, ano: number, fimDoDia = false): number {
  const ini = Date.UTC(ano, 0, 1);
  const total = (Date.UTC(ano + 1, 0, 1) - ini) / DIA;
  const dia = (utc(iso) - ini) / DIA + (fimDoDia ? 1 : 0);
  return Math.max(0, Math.min(100, (dia / total) * 100));
}

export const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
