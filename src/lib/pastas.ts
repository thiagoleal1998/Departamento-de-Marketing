/** Pastas de rede: a tarefa guarda a raiz + o caminho sem a letra; cada pessoa tem a própria letra por raiz. */

export type RaizPasta = "corporativo" | "publico" | "hd";
export type Unidades = Record<RaizPasta, string>;

export const RAIZES: { chave: RaizPasta; label: string }[] = [
  { chave: "corporativo", label: "Corporativo" },
  { chave: "publico", label: "Público" },
  { chave: "hd", label: "HD" },
];

export const UNIDADES_PADRAO: Unidades = { corporativo: "X", publico: "Y", hd: "Z" };

export const ehRaiz = (v: unknown): v is RaizPasta => v === "corporativo" || v === "publico" || v === "hd";

/** Letras definidas no perfil, completando com o padrão o que faltar. */
export function unidadesDe(valor: unknown): Unidades {
  const v = (valor && typeof valor === "object" ? valor : {}) as Record<string, unknown>;
  const letra = (k: RaizPasta) => {
    const x = typeof v[k] === "string" ? (v[k] as string).trim().toUpperCase() : "";
    return /^[A-Z]$/.test(x) ? x : UNIDADES_PADRAO[k];
  };
  return { corporativo: letra("corporativo"), publico: letra("publico"), hd: letra("hd") };
}

/**
 * Aceita o que a pessoa colar. Se vier com a letra da unidade ("X:\00 mkt\..."), descobre a raiz pela letra
 * que ela usa e devolve só o restante do caminho.
 */
export function separarCaminho(texto: string, raizAtual: RaizPasta, unidades: Unidades): { raiz: RaizPasta; caminho: string } {
  let t = texto.replace(/^\s*["']|["']\s*$/g, "").replace(/\//g, "\\");
  let raiz = raizAtual;
  const m = /^\s*([A-Za-z]):\\*/.exec(t);
  if (m) {
    const achada = RAIZES.find((r) => unidades[r.chave] === m[1].toUpperCase());
    if (achada) raiz = achada.chave;
    t = t.slice(m[0].length);
  }
  return { raiz, caminho: t.replace(/^\\+/, "") };
}

export const caminhoCompleto = (raiz: RaizPasta, caminho: string, unidades: Unidades) => `${unidades[raiz]}:\\${caminho}`;

/**
 * Link que abre a pasta no Explorador de Arquivos. O navegador não abre pastas por conta própria, então o
 * Windows precisa conhecer o protocolo "lvpasta:" (ativado uma vez no perfil, com public/ativar-abrir-pasta.reg).
 */
export function linkPasta(raiz: RaizPasta, caminho: string, unidades: Unidades): string {
  return "lvpasta:" + encodeURIComponent(caminhoCompleto(raiz, caminho, unidades)).replace(/'/g, "%27");
}
