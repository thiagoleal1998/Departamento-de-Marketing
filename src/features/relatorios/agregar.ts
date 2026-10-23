import { semAcento } from "@/features/noticias/classificar";

export interface LinhaRelatorio {
  data: string;
  tipo: "nacional" | "internacional";
  canal: string | null;
  produto: string | null;
  temporada: string | null;
}

const SEPARADOR = /\n\s*-{3,}\s*\n/;

const limparNome = (t: string) =>
  t
    .split("\n")
    .map((x) => x.trim())
    .find(Boolean)
    ?.replace(/\*.*$/, "")
    .replace(/Locais de refer[êe]ncia.*$/i, "")
    .replace(/^Nome do Destino\s*/i, "")
    .trim() ?? "";

/** Produtos/destinos citados numa linha: nacional pode ter vários separados por "---". */
export function produtosDaLinha(l: LinhaRelatorio): string[] {
  if (!l.produto) return [];
  const partes = l.tipo === "nacional" ? l.produto.split(SEPARADOR) : [l.produto];
  return Array.from(new Set(partes.map(limparNome).filter((p) => p.length >= 2 && p !== "---")));
}

/** Tipo de divulgação padronizado (Lâmina, Pop-up, E-mail…). A planilha nacional não traz o tipo. */
export function tipoDeDivulgacao(l: LinhaRelatorio): string {
  if (l.tipo === "nacional") return "Oferta nacional";
  const c = semAcento(l.canal ?? "");
  if (!c) return "Sem tipo";
  if (c.includes("pop")) return "Pop-up";
  if (c.includes("lamina")) return "Lâmina";
  if (c.includes("mail")) return "E-mail";
  if (c.includes("stor")) return "Stories";
  if (c.includes("whats")) return "WhatsApp";
  return (l.canal ?? "").trim() || "Outro";
}

const chave = (t: string) => semAcento(t).replace(/[^a-z0-9]/g, "");

export interface LinhaProduto {
  nome: string;
  tipo: "nacional" | "internacional";
  qtd: number;
  primeira: string;
  ultima: string;
  tipos: string[];
}
export interface LinhaTipo {
  tipo: string;
  qtd: number;
  produtos: number;
}
export interface LinhaMes {
  mes: string;
  nacional: number;
  internacional: number;
}

export interface Relatorio {
  total: number;
  nacional: number;
  internacional: number;
  produtosDistintos: number;
  diasComDivulgacao: number;
  porTipo: LinhaTipo[];
  porProduto: LinhaProduto[];
  porMes: LinhaMes[];
}

export function agregar(linhas: LinhaRelatorio[]): Relatorio {
  const produtos = new Map<string, LinhaProduto & { tiposSet: Set<string> }>();
  const tipos = new Map<string, { qtd: number; produtos: Set<string> }>();
  const meses = new Map<string, LinhaMes>();
  const dias = new Set<string>();
  let nacional = 0;
  let internacional = 0;

  for (const l of linhas) {
    dias.add(l.data);
    if (l.tipo === "nacional") nacional++;
    else internacional++;

    const mes = l.data.slice(0, 7);
    const m = meses.get(mes) ?? { mes, nacional: 0, internacional: 0 };
    m[l.tipo]++;
    meses.set(mes, m);

    const tipoDiv = tipoDeDivulgacao(l);
    const t = tipos.get(tipoDiv) ?? { qtd: 0, produtos: new Set<string>() };
    t.qtd++;

    for (const nome of produtosDaLinha(l)) {
      const k = chave(nome);
      if (!k) continue;
      t.produtos.add(k);
      const p = produtos.get(k) ?? { nome, tipo: l.tipo, qtd: 0, primeira: l.data, ultima: l.data, tipos: [], tiposSet: new Set<string>() };
      p.qtd++;
      if (l.data < p.primeira) p.primeira = l.data;
      if (l.data > p.ultima) p.ultima = l.data;
      p.tiposSet.add(tipoDiv);
      produtos.set(k, p);
    }
    tipos.set(tipoDiv, t);
  }

  return {
    total: linhas.length,
    nacional,
    internacional,
    produtosDistintos: produtos.size,
    diasComDivulgacao: dias.size,
    porTipo: Array.from(tipos.entries())
      .map(([tipo, v]) => ({ tipo, qtd: v.qtd, produtos: v.produtos.size }))
      .sort((a, b) => b.qtd - a.qtd),
    porProduto: Array.from(produtos.values())
      .map(({ tiposSet, ...p }) => ({ ...p, tipos: Array.from(tiposSet).sort() }))
      .sort((a, b) => b.qtd - a.qtd || a.nome.localeCompare(b.nome, "pt-BR")),
    porMes: Array.from(meses.values()).sort((a, b) => a.mes.localeCompare(b.mes)),
  };
}
