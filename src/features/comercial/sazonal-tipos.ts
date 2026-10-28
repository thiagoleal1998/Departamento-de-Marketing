/** Períodos sazonais do Comercial: cada um tem a sua planilha (um hotel por linha). */
export interface PeriodoSazonal {
  id: string;
  nome: string;
  planilhaId: string;
}

export const PERIODOS_SAZONAIS: PeriodoSazonal[] = [
  { id: "black-november-2026", nome: "Black November 2026", planilhaId: "1cFGQSufRdRSFaMMLrD0iflmG8wGI7y1yl6_-aZqRwjI" },
];

export const planilhaSazonalUrl = (p: PeriodoSazonal) => `https://docs.google.com/spreadsheets/d/${p.planilhaId}/edit`;

/** Uma linha da planilha do período (um hotel). */
export interface HotelSazonal {
  periodo: string;
  chave: string;
  hotel: string;
  ordem: number;
  status: string;
  condicao: string;
  vendas: string;
  hospedagens: string;
  observacao: string;
  anterior: Partial<Record<CampoSazonal, string>> | null;
  /** Quando mudou pela última vez (ISO), se mudou. */
  alterado_em: string | null;
}

export type CampoSazonal = "status" | "condicao" | "vendas" | "hospedagens" | "observacao";

export const ROTULO_CAMPO_SAZONAL: Record<CampoSazonal, string> = {
  status: "Status",
  condicao: "Condição",
  vendas: "Vendas",
  hospedagens: "Hospedagens",
  observacao: "Observação",
};

/** Em que pé está cada hotel na campanha, lido do texto da coluna Status. */
export type SituacaoSazonal = "confirmado" | "farao" | "parcial" | "aguardando" | "nao" | "outro";

const semAcento = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function situacaoSazonal(status: string): SituacaoSazonal {
  const n = semAcento(status);
  if (!n) return "outro";
  if (/^(confirmado|entrara em vigor|ativo)/.test(n)) return "confirmado";
  if (/nao participara|nao farao|nao tera tarifa|nao trabalh/.test(n)) return "nao";
  if (/farao exclusiva/.test(n)) return "parcial";
  if (/farao para operadoras/.test(n)) return "farao";
  if (/e-?mail enviado|aguardando retorno/.test(n)) return "aguardando";
  return "outro";
}

export const SITUACAO_SAZONAL: Record<SituacaoSazonal, { rotulo: string; classe: string }> = {
  confirmado: { rotulo: "Confirmado", classe: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/40 dark:text-emerald-300" },
  farao: { rotulo: "Fará · aguardando detalhes", classe: "bg-sky-500/15 text-sky-700 ring-sky-500/40 dark:text-sky-300" },
  parcial: { rotulo: "Condição parcial", classe: "bg-amber-500/15 text-amber-700 ring-amber-500/40 dark:text-amber-300" },
  aguardando: { rotulo: "Aguardando retorno", classe: "bg-slate-500/15 text-slate-700 ring-slate-500/40 dark:text-slate-300" },
  nao: { rotulo: "Sem tarifa para operadoras", classe: "bg-red-500/15 text-red-700 ring-red-500/40 dark:text-red-300" },
  outro: { rotulo: "Sem status", classe: "bg-muted text-muted-foreground ring-border" },
};

export const ORDEM_SITUACAO: SituacaoSazonal[] = ["confirmado", "farao", "parcial", "aguardando", "nao", "outro"];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const chaveHotel = norm;

/** Nome na planilha do período → nome do produto no Comercial, quando não dá para deduzir pelo texto. */
const APELIDOS: Record<string, string[]> = {
  [norm("Rede Tauá")]: ["Tauá João Pessoa"],
};

const SOLTAS = new Set(["de", "do", "da", "dos", "das", "e", "a", "o", "the"]);
const palavras = (s: string) => norm(s).split(" ").filter((t) => t && !SOLTAS.has(t));

/** O hotel da planilha do período é este produto? (nome igual, ou um contido no outro, ou apelido) */
export function hotelCombina(nomeHotel: string, nomeProduto: string): boolean {
  const h = norm(nomeHotel);
  const p = norm(nomeProduto);
  if (!h || !p) return false;
  if (h === p) return true;
  if ((APELIDOS[h] ?? []).some((a) => norm(a) === p)) return true;
  const th = palavras(nomeHotel);
  const tp = palavras(nomeProduto);
  const [menor, maior] = th.length <= tp.length ? [th, tp] : [tp, th];
  if (menor.length === 0) return false;
  // Uma palavra só vale se for um nome próprio razoável (ex.: "Tivoli", "Portobello").
  if (menor.length === 1 && menor[0].length < 5) return false;
  return menor.every((t) => maior.includes(t));
}

/** O que um card normal de produto mostra de um período sazonal (já com a data formatada). */
export interface SazonalNoCard {
  periodoId: string;
  periodoNome: string;
  /** Nome do hotel como está na planilha do período. */
  hotel: string;
  status: string;
  condicao: string;
  vendas: string;
  hospedagens: string;
  observacao: string;
  /** "28/10" quando mudou nos últimos dias; null caso contrário. */
  atualizadoEm: string | null;
  anterior: HotelSazonal["anterior"];
}

/** Período com seus hotéis, como a tela da aba precisa. */
export interface PeriodoView {
  id: string;
  nome: string;
  url: string;
  hoteis: (HotelSazonal & { atualizadoEm: string | null })[];
  /** Data e hora da última leitura, já formatada. */
  sincronizadoEm: string | null;
  erro: string | null;
}
