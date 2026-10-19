import type { CampoProduto } from "./tipos";
import type { ProdutoView } from "./cards";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Nome da planilha → nome correto do produto (as chaves da planilha não mudam). */
const NOMES_EXIBICAO: Record<string, string> = {
  [norm("Grand Oca")]: "Grand Oca Maragogi",
  [norm("Samoa")]: "Samoa Beach Resort",
  [norm("Vila Galé Ouro Preto")]: "Vila Galé Collection Ouro Preto",
  [norm("Vilarejo Praia Resort")]: "Vilarejo Praia Hotel",
};

export const nomeCorreto = (nome: string): string => NOMES_EXIBICAO[norm(nome)] ?? nome;

/** Complexos: vários hotéis da planilha mostrados juntos, mas separados, num único card. */
const COMPLEXOS: { nome: string; secao: string; partes: { planilha: string; nome: string }[] }[] = [
  {
    nome: "Complexo Iberostar Praia do Forte",
    secao: "NACIONAL ATIVAS",
    partes: [
      { planilha: "Iberostar Bahia", nome: "Iberostar Waves Bahia" },
      { planilha: "Iberostar Praia do Forte", nome: "Iberostar Selection Praia do Forte" },
    ],
  },
];

export interface BaseComplexo {
  nome: string;
  /** produtos da planilha que formam o complexo, com o nome de cada parte */
  partes: { chave: string; nome: string }[];
}

/** Descobre, entre os produtos lidos, quais formam cada complexo (por chave de cada parte). */
export function achaComplexos(linhas: { chave: string; secao: string; nome: string }[]): Map<string, BaseComplexo> {
  const porChave = new Map<string, BaseComplexo>();
  for (const c of COMPLEXOS) {
    const partes = c.partes
      .map((p) => {
        const l = linhas.find((x) => norm(x.secao) === norm(c.secao) && norm(x.nome) === norm(p.planilha));
        return l ? { chave: l.chave, nome: p.nome } : null;
      })
      .filter((x): x is { chave: string; nome: string } => !!x);
    if (partes.length === 0) continue;
    const base: BaseComplexo = { nome: c.nome, partes };
    for (const p of partes) porChave.set(p.chave, base);
  }
  return porChave;
}

/** Junta os campos de vários produtos (mesmo rótulo → linhas somadas, sem repetir). */
function unirCampos(listas: CampoProduto[][]): CampoProduto[] {
  const mapa = new Map<string, CampoProduto>();
  for (const campos of listas) {
    for (const c of campos) {
      const atual = mapa.get(c.rotulo);
      if (!atual) {
        mapa.set(c.rotulo, { rotulo: c.rotulo, linhas: [...c.linhas] });
      } else {
        for (const l of c.linhas) if (!atual.linhas.some((x) => x.t === l.t)) atual.linhas.push(l);
      }
    }
  }
  return [...mapa.values()];
}

/**
 * "Produtos ativos": o mesmo hotel pode estar em mais de uma aba (ou repetido na mesma);
 * mostra um único card por produto, somando as informações.
 */
export function mesclarDuplicados(produtos: ProdutoView[]): ProdutoView[] {
  const grupos = new Map<string, ProdutoView[]>();
  for (const p of produtos) {
    const k = norm(p.nome);
    grupos.set(k, [...(grupos.get(k) ?? []), p]);
  }
  return [...grupos.values()].map((g) => {
    if (g.length === 1) return g[0];
    const [base] = g;
    const secoes = Array.from(new Set(g.map((p) => p.secao)));
    return {
      ...base,
      secao: secoes.join(" · "),
      campos: unirCampos(g.map((p) => p.campos)),
      alteracao: g.find((p) => p.alteracao)?.alteracao,
    };
  });
}
