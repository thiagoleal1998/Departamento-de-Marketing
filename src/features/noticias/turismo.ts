import { unstable_cache } from "next/cache";
import { juntar, lerFeed, type NoticiaFeed } from "./rss";

export type NoticiaTurismo = NoticiaFeed;

interface Fonte {
  rotulo: string;
  url: string;
  /** Quantas notícias de cada fonte entram (a Panrotas é a principal). */
  max: number;
}

const FONTES: Fonte[] = [
  { rotulo: "Panrotas", url: "https://www.panrotas.com.br/feed", max: 8 },
  { rotulo: "Mercado & Eventos", url: "https://www.mercadoeeventos.com.br/feed/", max: 3 },
  { rotulo: "Revista Hotéis", url: "https://revistahoteis.com.br/feed/", max: 3 },
];

/** As principais notícias do turismo (Panrotas à frente, com Mercado & Eventos e Revista Hotéis), mais novas primeiro. */
export const noticiasDoTurismo = unstable_cache(
  async (): Promise<NoticiaTurismo[]> => {
    const listas = await Promise.all(FONTES.map((f) => lerFeed(f.url, f.rotulo, f.max * 3))); // o feed da Panrotas traz centenas: só o começo interessa
    return juntar(listas, FONTES.map((f) => f.max), 12);
  },
  ["noticias-turismo-v3"],
  { revalidate: 900 }
);
