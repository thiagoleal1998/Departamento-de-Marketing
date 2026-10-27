import { unstable_cache } from "next/cache";
import { juntar, lerFeed, type NoticiaFeed } from "./rss";

export interface NoticiasGerais {
  politica: NoticiaFeed[];
  economia: NoticiaFeed[];
}

const POLITICA = [
  { rotulo: "G1", url: "https://g1.globo.com/rss/g1/politica/" },
  { rotulo: "Folha", url: "https://feeds.folha.uol.com.br/poder/rss091.xml" },
  { rotulo: "Estadão", url: "https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/politica/?outputType=xml" },
  { rotulo: "Agência Brasil", url: "https://agenciabrasil.ebc.com.br/rss/politica/feed.xml" },
];

const ECONOMIA = [
  { rotulo: "G1", url: "https://g1.globo.com/rss/g1/economia/" },
  { rotulo: "Folha", url: "https://feeds.folha.uol.com.br/mercado/rss091.xml" },
  { rotulo: "Estadão", url: "https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/economia/?outputType=xml" },
  { rotulo: "Agência Brasil", url: "https://agenciabrasil.ebc.com.br/rss/economia/feed.xml" },
];

const secao = async (fontes: { rotulo: string; url: string }[]) =>
  juntar(await Promise.all(fontes.map((f) => lerFeed(f.url, f.rotulo, 10))), 3, 8);

/** Principais notícias de política e economia dos grandes jornais (G1, Folha, Estadão e Agência Brasil). */
export const noticiasGerais = unstable_cache(
  async (): Promise<NoticiasGerais> => {
    const [politica, economia] = await Promise.all([secao(POLITICA), secao(ECONOMIA)]);
    return { politica, economia };
  },
  ["noticias-gerais-v1"],
  { revalidate: 900 }
);
