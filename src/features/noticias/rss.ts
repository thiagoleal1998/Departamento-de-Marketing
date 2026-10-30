/** Leitor simples de feeds RSS de notícias (usado nos quadros de notícias do painel). */

export interface NoticiaFeed {
  titulo: string;
  link: string;
  /** ISO. */
  data: string;
  resumo: string;
  imagem: string | null;
  fonte: string;
  categoria: string | null;
}

const ENTIDADES: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };

export const decodificar = (s: string) =>
  s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n.toLowerCase()] ?? m);

const semTags = (s: string) => decodificar(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Fotos editoriais do HTML do feed; ignora banners que alguns portais inserem entre os parágrafos. */
function imagemDoConteudo(html: string, base: string): string | null {
  const conteudo = decodificar(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<div\b[^>]*class=["'][^"']*\bal-banner\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "");
  for (const m of conteudo.matchAll(/<img\b[^>]*>/gi)) {
    if (/\b(?:al-banner|banner|advertisement|tracking|pixel)\b/i.test(m[0])) continue;
    const src = /\s(?:data-src|src)\s*=\s*["']([^"']+)["']/i.exec(m[0])?.[1];
    if (!src) continue;
    try {
      const url = new URL(src, base);
      if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    } catch {
      // Uma imagem inválida não impede a leitura das demais.
    }
  }
  return null;
}

function resumir(desc: string): string {
  let t = semTags(desc);
  const i = t.search(/\bO post\b/); // texto padrão do WordPress: "O post X apareceu primeiro em Y"
  if (i > 0) t = t.slice(0, i);
  t = t.replace(/\[…\]|\[\.\.\.\]/g, "").trim();
  return t.length > 150 ? t.slice(0, 147).trimEnd() + "…" : t;
}

/** Alguns jornais (ex.: Folha) entregam o feed em ISO-8859-1: lê o texto com a codificação declarada. */
async function lerTexto(r: Response): Promise<string> {
  const bytes = new Uint8Array(await r.arrayBuffer());
  const cabeca = new TextDecoder("latin1").decode(bytes.slice(0, 200));
  const enc = (/encoding=["']([\w-]+)["']/i.exec(cabeca)?.[1] ?? /charset=([\w-]+)/i.exec(r.headers.get("content-type") ?? "")?.[1] ?? "utf-8").toLowerCase();
  try {
    return new TextDecoder(enc).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/** Lê um feed e devolve as notícias mais novas (no máximo `lote`). Falha em silêncio: devolve lista vazia. */
export async function lerFeed(url: string, fonte: string, lote: number): Promise<NoticiaFeed[]> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (PainelMarketing)" }, signal: AbortSignal.timeout(12_000), cache: "no-store" });
    if (!r.ok) return [];
    const xml = await lerTexto(r);
    const itens: NoticiaFeed[] = [];
    for (const m of xml.matchAll(/<item[ >]([\s\S]*?)<\/item>/g)) {
      const bloco = m[1];
      const pega = (tag: string) => new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(bloco)?.[1] ?? "";
      const titulo = semTags(pega("title"));
      const link = decodificar(pega("link")).trim();
      const data = new Date(pega("pubDate").trim());
      if (!titulo || !/^https?:\/\//.test(link) || Number.isNaN(data.getTime())) continue;
      const descricao = pega("description");
      const imagem =
        decodificar(
          /<enclosure[^>]*url="([^"]+)"/.exec(bloco)?.[1] ??
            /<media:(?:content|thumbnail)[^>]*url="([^"]+)"/.exec(bloco)?.[1] ??
            imagemDoConteudo(descricao, link) ??
            imagemDoConteudo(pega("content:encoded"), link) ??
            ""
        ) || null;
      const categoria = /<category[^>]*>([\s\S]*?)<\/category>/.exec(bloco)?.[1];
      itens.push({
        titulo,
        link,
        data: data.toISOString(),
        resumo: resumir(descricao),
        imagem: imagem && /^https?:\/\//.test(imagem) ? imagem : null,
        fonte,
        categoria: categoria ? semTags(categoria) : null,
      });
      if (itens.length >= lote) break;
    }
    return itens;
  } catch {
    return [];
  }
}

/** Junta as listas das fontes: até `porFonte` de cada uma, sem títulos repetidos, mais novas primeiro. */
export function juntar(listas: NoticiaFeed[][], porFonte: number | number[], total: number): NoticiaFeed[] {
  const vistos = new Set<string>();
  return listas
    .flatMap((l, i) => l.slice().sort((a, b) => b.data.localeCompare(a.data)).slice(0, Array.isArray(porFonte) ? porFonte[i] : porFonte))
    .filter((n) => {
      const k = n.titulo.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    })
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, total);
}
