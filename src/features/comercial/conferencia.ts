import type { CampoProduto } from "./tipos";

/** Landing page cadastrada no sistema (Operacional > Landing Pages). */
export interface LpSistema {
  id: string;
  nome: string;
  grupo: string | null;
  status_patrocinio: string | null;
  url: string | null;
}

/** LP com os dados de cadastro que o card do Comercial mostra quando não há produto na planilha. */
export interface LpCompleta extends LpSistema {
  destino: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  dominio: string | null;
  observacoes: string | null;
}

export type SituacaoLp = "ativa" | "inativa" | "sem_status" | "sem_lp";

export interface ConferenciaProduto {
  situacao: SituacaoLp;
  /** LPs do sistema que correspondem ao produto. */
  lps: { id: string; nome: string; grupo: string | null; status: string | null }[];
  /** Correspondência encontrada só por semelhança de nome (não por link). */
  aproximado: boolean;
  /** Divergência entre a planilha e o cadastro de LPs. */
  divergencia: "planilha_ativa_lp_inativa" | "planilha_inativa_lp_ativa" | "sem_lp" | null;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const normUrl = (u: string) =>
  u
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");

export const urlDoProduto = (campos: CampoProduto[]): string | null =>
  campos.find((c) => /link/i.test(c.rotulo))?.linhas.find((l) => /^https?:\/\//i.test(l.t))?.t ?? null;

export const statusDaPlanilha = (campos: CampoProduto[]): string | null =>
  campos.find((c) => /status/i.test(c.rotulo))?.linhas[0]?.t ?? null;

/** A planilha trata o produto como ativo? (aba "ATIVAS"/exclusivos ou status "Ativa"). */
export function ativoNaPlanilha(secao: string, campos: CampoProduto[]): boolean {
  // Produto numa aba de inativos é inativo, mesmo que a coluna de status diga "Ativa".
  if (/inativ/i.test(secao)) return false;
  const st = statusDaPlanilha(campos);
  if (st) return /^ativ/i.test(st);
  return !/inativ/i.test(secao);
}

/** Nomes de LP que também pertencem ao produto (mesmo hotel cadastrado com outro nome). */
const APELIDOS_LP: Record<string, string[]> = {
  [norm("Vila Galé Eco Resort de Angra")]: ["Vila Galé Angra"],
  [norm("Vila Galé do Cabo")]: ["Vila Galé Eco Resort do Cabo"],
};

/**
 * Localiza as LPs do sistema que correspondem ao produto: junta as que casam pelo link,
 * pelo nome (exato; na falta, parecido) e pelos apelidos. Se alguma estiver ativa, o produto está ativo.
 */
export function acharLps(
  nome: string,
  campos: CampoProduto[],
  lps: LpSistema[]
): { achadas: LpSistema[]; aproximado: boolean } {
  const achadas = new Map<string, LpSistema>();
  let aproximado = false;

  const url = urlDoProduto(campos);
  if (url) {
    const u = normUrl(url);
    for (const l of lps) if (l.url && normUrl(l.url) === u) achadas.set(l.id, l);
  }

  const n = norm(nome);
  const exato = lps.filter((l) => norm(l.nome) === n);
  if (exato.length > 0) {
    for (const l of exato) achadas.set(l.id, l);
  } else {
    const parecido = lps.filter((l) => {
      const x = norm(l.nome);
      return x.length > 5 && n.length > 5 && (n.includes(x) || x.includes(n));
    });
    for (const l of parecido) achadas.set(l.id, l);
    if (parecido.length > 0 && achadas.size === parecido.length) aproximado = true;
  }

  for (const apelido of APELIDOS_LP[n] ?? []) {
    const a = norm(apelido);
    for (const l of lps) if (norm(l.nome) === a) achadas.set(l.id, l);
  }
  return { achadas: [...achadas.values()], aproximado };
}

/**
 * Produtos que a liderança pediu para tirar da lista de divergências da conferência
 * (a situação da LP continua valendo; só deixam de aparecer como alerta).
 */
const SEM_ALERTA = new Set(
  [
    "Iberostar Selection Cancún",
    "Iberostar Selection Paraíso Maya Suites",
    "Iberostar Waves Dominicana",
    "Iberostar Waves Punta Cana",
    "Grand Palladium Costa Mujeres Resort & Spa",
    "Grand Palladium Colonial Resort & Spa",
    "Grand Palladium Punta Cana Resort & Spa",
    "Ipioca Beach Resort",
    "Mavsa Resort",
    "Salinas Maragogi",
  ].map(norm)
);

export function conferir(
  secao: string,
  nome: string,
  campos: CampoProduto[],
  lps: LpSistema[]
): ConferenciaProduto {
  const { achadas, aproximado } = acharLps(nome, campos, lps);
  const naPlanilha = ativoNaPlanilha(secao, campos);
  const lista = achadas.map((l) => ({ id: l.id, nome: l.nome, grupo: l.grupo, status: l.status_patrocinio }));

  if (achadas.length === 0) {
    return {
      situacao: "sem_lp",
      lps: [],
      aproximado: false,
      divergencia: naPlanilha ? "sem_lp" : null,
    };
  }
  const algumaAtiva = achadas.some((l) => l.status_patrocinio === "ativo");
  const todasSemStatus = achadas.every((l) => !l.status_patrocinio);
  const situacao: SituacaoLp = algumaAtiva ? "ativa" : todasSemStatus ? "sem_status" : "inativa";

  let divergencia: ConferenciaProduto["divergencia"] = null;
  if (naPlanilha && situacao === "inativa") divergencia = "planilha_ativa_lp_inativa";
  else if (!naPlanilha && situacao === "ativa") divergencia = "planilha_inativa_lp_ativa";
  if (SEM_ALERTA.has(norm(nome))) divergencia = null;
  return { situacao, lps: lista, aproximado, divergencia };
}

export const ROTULO_SITUACAO: Record<SituacaoLp, string> = {
  ativa: "LP ativa",
  inativa: "LP inativa",
  sem_status: "LP sem status",
  sem_lp: "Sem LP no sistema",
};

export const ROTULO_DIVERGENCIA: Record<NonNullable<ConferenciaProduto["divergencia"]>, string> = {
  planilha_ativa_lp_inativa: "Planilha diz ativo, mas a LP está inativa",
  planilha_inativa_lp_ativa: "Planilha diz inativo, mas a LP está ativa",
  sem_lp: "Produto ativo na planilha sem LP no sistema",
};
