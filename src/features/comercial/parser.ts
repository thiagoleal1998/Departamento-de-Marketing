import "server-only";
import * as XLSX from "xlsx";
import type { CampoProduto, LinhaCampo, ProdutoComercial } from "./tipos";

interface Cel {
  t: string;
  bg?: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const limpa = (s: string) => s.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();

type Arquivos = Record<string, { content: unknown }> | undefined;

function lerTexto(files: Arquivos, nome: string): string | null {
  const f = files?.[nome];
  if (!f) return null;
  const c = f.content;
  if (typeof c === "string") return c;
  return Buffer.from(c as Uint8Array).toString("utf8");
}

/** Estilos de borda por índice de estilo (para achar a linha grossa que separa os produtos). */
function lerBordas(styles: string | null): { forte: boolean[] } {
  if (!styles) return { forte: [] };
  const bordersXml = styles.match(/<borders[\s\S]*?<\/borders>/)?.[0] ?? "";
  const borders = [...bordersXml.matchAll(/<border(?:\s[^>]*)?>[\s\S]*?<\/border>|<border\/>/g)].map(
    (m) => {
      const g = (t: string) => m[0].match(new RegExp(`<${t}[^>]*style="([^"]+)"`))?.[1] ?? "";
      const forte = (x: string) => x === "medium" || x === "thick";
      return { top: forte(g("top")), bottom: forte(g("bottom")) };
    }
  );
  const cellXfs = styles.match(/<cellXfs[\s\S]*?<\/cellXfs>/)?.[0] ?? "";
  const xfs = [...cellXfs.matchAll(/<xf\s[^>]*>/g)].map((m) =>
    Number(m[0].match(/borderId="(\d+)"/)?.[1] ?? 0)
  );
  // Para cada estilo: tem borda inferior forte? (índice "b") ou superior forte? (índice "t")
  const forte: boolean[] = [];
  xfs.forEach((bid, i) => {
    const b = borders[bid];
    forte[i * 2] = !!b?.bottom;
    forte[i * 2 + 1] = !!b?.top;
  });
  return { forte };
}

/** Linhas (0-based) onde termina um produto: muitas células com borda forte embaixo. */
function achaSeparadores(sheetXml: string | null, forte: boolean[]): Set<number> {
  const contagem = new Map<number, number>();
  if (sheetXml) {
    for (const m of sheetXml.matchAll(/<c r="[A-Z]+(\d+)"(?: s="(\d+)")?/g)) {
      const linha = Number(m[1]) - 1;
      const s = Number(m[2] ?? 0);
      if (forte[s * 2]) contagem.set(linha, (contagem.get(linha) ?? 0) + 1);
      if (forte[s * 2 + 1] && linha > 0) contagem.set(linha - 1, (contagem.get(linha - 1) ?? 0) + 1);
    }
  }
  return new Set([...contagem.entries()].filter(([, n]) => n >= 4).map(([l]) => l));
}

function lerAba(
  ws: XLSX.WorkSheet,
  nomeAba: string,
  sheetXml: string | null,
  forte: boolean[]
): ProdutoComercial[] {
  // ---- células ----
  const cel = new Map<string, Cel>();
  let maxR = 0;
  for (const chave of Object.keys(ws)) {
    if (chave[0] === "!") continue;
    const c = ws[chave] as XLSX.CellObject & {
      w?: string;
      s?: { patternType?: string; fgColor?: { rgb?: string } };
    };
    const { r, c: col } = XLSX.utils.decode_cell(chave);
    const t = limpa(c.w ?? (c.v === undefined || c.v === null ? "" : String(c.v)));
    const rgb = c.s?.patternType === "solid" ? c.s.fgColor?.rgb?.toUpperCase() : undefined;
    const bg = rgb && rgb !== "FFFFFF" && /^[0-9A-F]{6}$/.test(rgb) ? `#${rgb}` : undefined;
    if (!t && !bg) continue;
    cel.set(`${r}:${col}`, { t, bg });
    if (t) maxR = Math.max(maxR, r);
  }
  const at = (r: number, c: number) => cel.get(`${r}:${c}`);
  const texto = (r: number, c: number) => at(r, c)?.t ?? "";

  // ---- cabeçalho ("Hotéis") ----
  let hr = -1;
  let nomeCol = -1;
  for (const [k, v] of cel) {
    if (/^hot[eé]is$/i.test(v.t)) {
      const [r, c] = k.split(":").map(Number);
      if (hr < 0 || r < hr) {
        hr = r;
        nomeCol = c;
      }
    }
  }
  if (hr < 0) return [];

  const rotulos = new Map<number, string>();
  for (const [k, v] of cel) {
    const [r, c] = k.split(":").map(Number);
    if (r === hr && v.t && c !== nomeCol) rotulos.set(c, v.t.replace(/\s+/g, " ").trim());
  }
  const colunas = [...rotulos.keys()].sort((a, b) => a - b);

  // ---- legenda (células acima do cabeçalho com texto e cor) ----
  const legenda = new Map<string, string>();
  for (const [k, v] of cel) {
    const [r] = k.split(":").map(Number);
    if (r < hr && v.t && v.bg && !legenda.has(v.bg)) legenda.set(v.bg, v.t);
  }

  // ---- regiões entre os separadores ----
  const seps = achaSeparadores(sheetXml, forte);
  const regioes: [number, number][] = [];
  let ini = hr + 1;
  for (let r = hr + 1; r <= maxR; r++) {
    if (seps.has(r)) {
      regioes.push([ini, r]);
      ini = r + 1;
    }
  }
  if (ini <= maxR) regioes.push([ini, maxR]);

  const ancoras = colunas.filter((c) => /link|status|pens/i.test(rotulos.get(c) ?? ""));
  const colsAncora = ancoras.length > 0 ? ancoras : colunas;

  const produtos: ProdutoComercial[] = [];

  function montar(r0: number, r1: number, linhasNome: number[]) {
    // nome: textos da coluna do nome (colados se forem linhas seguidas)
    let nome = "";
    let tagCor: string | undefined;
    linhasNome.forEach((r, i) => {
      const t = texto(r, nomeCol);
      if (!tagCor) tagCor = at(r, nomeCol)?.bg;
      if (i === 0) nome = t;
      else nome += (r - linhasNome[i - 1] === 1 ? " " : " · ") + t;
    });
    nome = nome.replace(/s+/g, " ").trim();

    const campos: CampoProduto[] = [];
    for (const c of colunas) {
      const linhas: LinhaCampo[] = [];
      for (let r = r0; r <= r1; r++) {
        const v = at(r, c);
        if (!v?.t) continue;
        for (const parte of v.t.split("\n")) {
          const t = parte.trim();
          if (t) linhas.push({ t, bg: v.bg });
        }
      }
      if (linhas.length > 0) campos.push({ rotulo: rotulos.get(c)!, linhas });
    }
    if (!nome && campos.length === 0) return;
    produtos.push({
      chave: "",
      secao: nomeAba,
      nome: nome || "(sem nome)",
      ordem: produtos.length,
      tag: tagCor ? legenda.get(tagCor) ?? null : null,
      tagCor: tagCor ?? null,
      campos,
    });
  }

  for (const [a, b] of regioes) {
    const nomes: number[] = [];
    for (let r = a; r <= b; r++) if (texto(r, nomeCol)) nomes.push(r);

    // Tabela "uma linha por hotel": os nomes têm link/status/pensão na mesma linha.
    const comDados = nomes.filter((r) => colsAncora.some((c) => texto(r, c))).length;
    if (nomes.length >= 2 && comDados / nomes.length >= 0.6) {
      nomes.forEach((r, i) => {
        const fim = i + 1 < nomes.length ? nomes[i + 1] - 1 : b;
        montar(i === 0 ? a : r, fim, [r]);
      });
    } else {
      montar(a, b, nomes);
    }
  }

  // Chaves únicas (nomes repetidos na mesma aba ganham sufixo).
  const vistos = new Map<string, number>();
  for (const p of produtos) {
    const base = `${norm(nomeAba)}|${norm(p.nome)}`;
    const n = (vistos.get(base) ?? 0) + 1;
    vistos.set(base, n);
    p.chave = n === 1 ? base : `${base}#${n}`;
  }
  return produtos;
}

/** Lê o .xlsx exportado do Google Sheets e devolve os produtos (um por hotel). */
export function lerProdutos(buffer: Buffer): ProdutoComercial[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellStyles: true, bookFiles: true });
  const files = (wb as unknown as { files?: Arquivos }).files;
  const { forte } = lerBordas(lerTexto(files, "xl/styles.xml"));

  const todos: ProdutoComercial[] = [];
  wb.SheetNames.forEach((nome, i) => {
    const xml = lerTexto(files, `xl/worksheets/sheet${i + 1}.xml`);
    for (const p of lerAba(wb.Sheets[nome], nome, xml, forte)) {
      p.ordem = todos.length;
      todos.push(p);
    }
  });
  return todos;
}
