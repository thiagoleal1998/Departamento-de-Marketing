import type { ReactNode } from "react";
import { AvisoDemora } from "./aviso-demora";

/**
 * Bloco da tela com tempo máximo. Se a parte lenta (IA, notícias, planilhas) passar do limite, mostra um aviso no
 * lugar dela e a página termina de carregar. Sem isso, um bloco travado estourava os 60 s da função e o navegador
 * recebia "Connection closed" na tela inteira.
 */
export async function ComLimite({
  de,
  ms = 35_000,
  titulo,
}: {
  /** Componente (servidor, sem propriedades) que monta o bloco. */
  de: () => Promise<ReactNode> | ReactNode;
  ms?: number;
  /** Nome do bloco, para o aviso (ex.: "Notícias"). */
  titulo: string;
}) {
  let esgotou = false;
  const trabalho = Promise.resolve().then(de);
  trabalho.catch(() => {}); // se perder a corrida e falhar depois, não vira erro solto
  const espera = new Promise<"tempo">((resolve) => setTimeout(() => resolve("tempo"), ms));
  try {
    const r = await Promise.race([trabalho, espera]);
    if (r === "tempo") esgotou = true;
    else return <>{r}</>;
  } catch {
    esgotou = true;
  }
  return esgotou ? <AvisoDemora titulo={titulo} /> : null;
}
