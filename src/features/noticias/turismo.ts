import { unstable_cache } from "next/cache";

export interface NoticiaTurismo {
  titulo: string;
  link: string;
  /** ISO. */
  data: string;
  resumo: string;
  imagem: string | null;
  fonte: string;
  categoria: string | null;
}

interface Fonte {
  id: string;
  rotulo: string;
  url: string;
  /** Quantas notícias de cada fonte entram (a Panrotas é a principal). */
  max: number;
}

const FONTES: Fonte[] = [
  { id: "panrotas", rotulo: "Panrotas", url: "https://www.panrotas.com.br/feed", max: 8 },
  { id: "mercadoeeventos", rotulo: "Mercado & Eventos", url: "https://www.mercadoeeventos.com.br/feed/", max: 3 },
  { id: "revistahoteis", rotulo: "Revista Hotéis", url: "https://revistahoteis.com.br/feed/", max: 3 },
];

const ENTIDADES: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
const decodificar = (s: string) =>
  s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n.toLowerCase()] ?? m);
const semTags = (s: string) => decodificar(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function resumir(desc: string): string {
  let t = semTags(desc);
  const i = t.search(/\bO post\b/); // texto padrão do WordPress: "O post X apareceu primeiro em Y"
  if (i > 0) t = t.slice(0, i);
  t = t.replace(/\[…\]|\[\.\.\.\]/g, "").trim();
  return t.length > 150 ? t.slice(0, 147).trimEnd() + "…" : t;
}

async function ler(f: Fonte): Promise<NoticiaTurismo[]> {
  try {
    const r = await fetch(f.url, { headers: { "User-Agent": "Mozilla/5.0 (PainelMarketing)" }, signal: AbortSignal.timeout(12_000), cache: "no-store" });
    if (!r.ok) return [];
    const xml = await r.text();
    const itens: NoticiaTurismo[] = [];
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const bloco = m[1];
      const pega = (tag: string) => new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(bloco)?.[1] ?? "";
      const titulo = semTags(pega("title"));
      const link = decodificar(pega("link")).trim();
      const data = new Date(pega("pubDate").trim());
      if (!titulo || !/^https?:\/\//.test(link) || Number.isNaN(data.getTime())) continue;
      const imagem = decodificar(/<enclosure[^>]*url="([^"]+)"/.exec(bloco)?.[1] ?? /<media:(?:content|thumbnail)[^>]*url="([^"]+)"/.exec(bloco)?.[1] ?? /<img[^>]*src="([^"]+)"/.exec(bloco)?.[1] ?? "") || null;
      const categoria = /<category[^>]*>([\s\S]*?)<\/category>/.exec(bloco)?.[1];
      itens.push({ titulo, link, data: data.toISOString(), resumo: resumir(pega("description")), imagem: imagem && /^https?:\/\//.test(imagem) ? imagem : null, fonte: f.rotulo, categoria: categoria ? semTags(categoria) : null });
      if (itens.length >= f.max * 3) break; // o feed da Panrotas traz centenas: só o começo interessa
    }
    return itens;
  } catch {
    return [];
  }
}

/** As principais notícias do turismo (Panrotas à frente, com Mercado & Eventos e Revista Hotéis), mais novas primeiro. */
export const noticiasDoTurismo = unstable_cache(
  async (): Promise<NoticiaTurismo[]> => {
    const listas = await Promise.all(FONTES.map(ler));
    const vistos = new Set<string>();
    const escolhidas = listas.flatMap((l, i) => l.sort((a, b) => b.data.localeCompare(a.data)).slice(0, FONTES[i].max));
    return escolhidas
      .filter((n) => {
        const k = n.titulo.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        if (vistos.has(k)) return false;
        vistos.add(k);
        return true;
      })
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 12);
  },
  ["noticias-turismo-v1"],
  { revalidate: 900 }
);
