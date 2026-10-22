import { BUSCA_RISCO, classificar, semAcento, type Categoria } from "./classificar";
import type { DestinoMonitorado } from "./destinos";

export interface Noticia {
  titulo: string;
  fonte: string;
  link: string;
  quando: string; // ISO
  categorias: Categoria[];
}

export interface AlertaDestino {
  destino: DestinoMonitorado;
  noticias: Noticia[];
  buscaUrl: string;
}

const ASPAS = String.fromCharCode(39);

const decodificar = (t: string) =>
  t
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, ASPAS);

const tag = (bloco: string, nome: string) => {
  const m = bloco.match(new RegExp(`<${nome}[^>]*>([\\s\\S]*?)</${nome}>`, "i"));
  return m ? decodificar(m[1]).trim() : "";
};

const HORAS = 72;

async function buscarDestino(d: DestinoMonitorado): Promise<AlertaDestino> {
  const consulta = `"${d.busca}" ${BUSCA_RISCO} when:3d`;
  const q = encodeURIComponent(consulta);
  const base = `https://news.google.com/rss/search?q=${q}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const buscaUrl = `https://news.google.com/search?q=${q}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  try {
    const r = await fetch(base, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(6000), headers: { "User-Agent": "Mozilla/5.0 (PainelMarketing)" } });
    if (!r.ok) return { destino: d, noticias: [], buscaUrl };
    const xml = await r.text();
    const termo = semAcento(d.termo);
    const limite = Date.now() - HORAS * 3600_000;
    const vistos = new Set<string>();
    const noticias: Noticia[] = [];
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const bloco = m[1];
      let titulo = tag(bloco, "title");
      const fonte = tag(bloco, "source") || (titulo.includes(" - ") ? titulo.split(" - ").pop()! : "");
      if (fonte && titulo.endsWith(` - ${fonte}`)) titulo = titulo.slice(0, -(fonte.length + 3));
      const quando = new Date(tag(bloco, "pubDate")).getTime();
      if (!titulo || !Number.isFinite(quando) || quando < limite) continue;
      // O título precisa citar o destino e tratar de algum risco (clima, natureza, segurança…).
      if (!semAcento(titulo).includes(termo)) continue;
      const categorias = classificar(titulo);
      if (categorias.length === 0) continue;
      const chave = semAcento(titulo).slice(0, 60);
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      noticias.push({ titulo, fonte, link: tag(bloco, "link"), quando: new Date(quando).toISOString(), categorias });
    }
    noticias.sort((a, b) => b.quando.localeCompare(a.quando));
    return { destino: d, noticias: noticias.slice(0, 3), buscaUrl };
  } catch {
    return { destino: d, noticias: [], buscaUrl };
  }
}

/** Busca, em paralelo, notícias de risco recentes para cada destino. Falhas viram "sem alerta". */
export async function alertasDosDestinos(destinos: DestinoMonitorado[], max = 8): Promise<AlertaDestino[]> {
  return Promise.all(destinos.slice(0, max).map(buscarDestino));
}
