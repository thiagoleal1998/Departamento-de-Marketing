import { semAcento } from "@/features/noticias/classificar";

export interface LinhaRelatorio {
  data: string;
  tipo: "nacional" | "internacional";
  canal: string | null;
  produto: string | null;
  temporada: string | null;
  vantagem?: string | null;
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

// ---- Período (feriado, férias, baixa temporada) e regime (all inclusive…) ------------------------

export type GrupoPeriodo = "Feriado" | "Férias" | "Baixa temporada" | "Data comemorativa" | "Last minute" | "Sem período informado";

const FERIADOS = [
  "natal",
  "reveillon",
  "ano novo",
  "carnaval",
  "semana santa",
  "pascoa",
  "corpus christi",
  "consciencia negra",
  "tiradentes",
  "independencia",
  "proclamacao",
  "finados",
  "aparecida",
  "feriado",
  "sao joao",
  "dia do trabalho",
];

const COMEMORATIVAS = ["dia das criancas", "dia das maes", "dia dos pais", "dia dos namorados", "black friday", "dia da mulher", "dia do amigo"];

/** "Natal (10x)" → { grupo: "Feriado", nome: "Natal" }. */
export function classificarPeriodo(temporada: string | null | undefined): { grupo: GrupoPeriodo; nome: string } {
  const primeira = (temporada ?? "")
    .split("\n")
    .map((x) => x.trim())
    .find((x) => x && !/^-+$/.test(x));
  if (!primeira) return { grupo: "Sem período informado", nome: "Sem período informado" };
  const nome = primeira.replace(/\(\s*\d+\s*x\s*\)/i, "").replace(/\s+/g, " ").trim();
  const t = semAcento(nome);
  if (t.includes("baixa")) return { grupo: "Baixa temporada", nome };
  if (t.includes("last minute")) return { grupo: "Last minute", nome };
  if (COMEMORATIVAS.some((f) => t.includes(f))) return { grupo: "Data comemorativa", nome };
  if (t.includes("ferias")) return { grupo: "Férias", nome };
  if (FERIADOS.some((f) => t.includes(f))) return { grupo: "Feriado", nome };
  return { grupo: "Sem período informado", nome };
}

export type Regime = "All Inclusive" | "Pensão completa" | "Meia pensão" | "Café da manhã" | "Sem alimentação" | "Não informado";

/** Regime de alimentação a partir do texto da vantagem/descritivo. */
export function classificarRegime(texto: string | null | undefined): Regime {
  const t = semAcento(texto ?? "").slice(0, 600);
  if (!t) return "Não informado";
  if (t.includes("all inclusive") || t.includes("all-inclusive") || t.includes("tudo incluido")) return "All Inclusive";
  if (t.includes("pensao completa")) return "Pensão completa";
  if (t.includes("meia pensao")) return "Meia pensão";
  if (t.includes("cafe da manha") || t.includes("com cafe")) return "Café da manhã";
  if (t.includes("sem alimentacao") || t.includes("sem refeicao") || t.includes("somente hospedagem") || t.includes("so hospedagem")) return "Sem alimentação";
  return "Não informado";
}

export interface ItemRelatorio {
  data: string;
  tipo: "nacional" | "internacional";
  produto: string;
  tipoDivulgacao: string;
  grupoPeriodo: GrupoPeriodo;
  temporada: string;
  regime: Regime;
}

const chave = (t: string) => semAcento(t).replace(/[^a-z0-9]/g, "");

/** Um item por produto divulgado, já com tipo de divulgação, período e regime. */
export function itensDaLinha(l: LinhaRelatorio): ItemRelatorio[] {
  const tipoDiv = tipoDeDivulgacao(l);
  if (l.tipo === "nacional") {
    const parte = (v: string | null | undefined) => (v ?? "").split(SEPARADOR).map((x) => x.trim());
    const produtos = parte(l.produto);
    const temps = parte(l.temporada);
    const vants = parte(l.vantagem);
    const n = Math.max(produtos.length, temps.length, vants.length, 1);
    const saida: ItemRelatorio[] = [];
    const vistos = new Set<string>();
    for (let i = 0; i < n; i++) {
      const nome = limparNome(produtos[i] || (produtos.length === 1 ? produtos[0] : ""));
      if (!nome || nome === "---") continue;
      const per = classificarPeriodo(temps[i] || (temps.length === 1 ? temps[0] : ""));
      const regime = classificarRegime(vants[i] || (vants.length === 1 ? vants[0] : ""));
      const k = chave(nome) + "|" + per.nome + "|" + regime;
      if (vistos.has(k)) continue;
      vistos.add(k);
      saida.push({ data: l.data, tipo: l.tipo, produto: nome, tipoDivulgacao: tipoDiv, grupoPeriodo: per.grupo, temporada: per.nome, regime });
    }
    return saida;
  }
  const nome = produtosDaLinha(l)[0];
  if (!nome) return [];
  const regimeTexto = /regime:\s*([^\n]+)/i.exec(l.vantagem ?? "")?.[1] ?? l.vantagem;
  return [
    {
      data: l.data,
      tipo: l.tipo,
      produto: nome,
      tipoDivulgacao: tipoDiv,
      grupoPeriodo: "Sem período informado",
      temporada: "Sem período informado",
      regime: classificarRegime(regimeTexto),
    },
  ];
}

export interface LinhaRotulo {
  rotulo: string;
  qtd: number;
}

function contar(itens: ItemRelatorio[], f: (i: ItemRelatorio) => string): LinhaRotulo[] {
  const m = new Map<string, number>();
  for (const i of itens) m.set(f(i), (m.get(f(i)) ?? 0) + 1);
  return Array.from(m.entries())
    .map(([rotulo, qtd]) => ({ rotulo, qtd }))
    .sort((a, b) => b.qtd - a.qtd);
}

/** Mantém só as linhas que têm ao menos um produto no período/regime pedidos. */
export function filtrarPorItens(linhas: LinhaRelatorio[], periodo: string, regime: string): LinhaRelatorio[] {
  if (!periodo && !regime) return linhas;
  return linhas.filter((l) => itensDaLinha(l).some((i) => (!periodo || i.grupoPeriodo === periodo) && (!regime || i.regime === regime)));
}

/** Contagens por período, temporada e regime (sobre os produtos que casam com o filtro). */
export function agregarItens(linhas: LinhaRelatorio[], periodo = "", regime = "") {
  const itens = linhas.flatMap(itensDaLinha).filter((i) => (!periodo || i.grupoPeriodo === periodo) && (!regime || i.regime === regime));
  return {
    itens,
    porPeriodo: contar(itens, (i) => i.grupoPeriodo),
    porTemporada: contar(
      itens.filter((i) => i.temporada !== "Sem período informado"),
      (i) => i.temporada
    ),
    porRegime: contar(itens, (i) => i.regime),
  };
}

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
