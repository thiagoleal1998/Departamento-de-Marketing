export type Categoria = "clima" | "natureza" | "violencia" | "saude" | "transporte";

export const CATEGORIA_META: Record<Categoria, { rotulo: string; classe: string; prioridade: number }> = {
  natureza: { rotulo: "Natureza", classe: "bg-amber-100 text-amber-900", prioridade: 0 },
  clima: { rotulo: "Clima", classe: "bg-sky-100 text-sky-900", prioridade: 1 },
  violencia: { rotulo: "Segurança", classe: "bg-red-100 text-red-900", prioridade: 2 },
  saude: { rotulo: "Saúde", classe: "bg-fuchsia-100 text-fuchsia-900", prioridade: 3 },
  transporte: { rotulo: "Transporte", classe: "bg-violet-100 text-violet-900", prioridade: 4 },
};

const PALAVRAS: Record<Categoria, string[]> = {
  natureza: ["terremoto", "sismo", "tremor de terra", "vulcao", "erupcao", "tsunami", "maremoto", "incendio florestal", "queimada", "deslizamento", "avalanche"],
  clima: [
    "tempestade",
    "temporal",
    "ciclone",
    "furacao",
    "tufao",
    "tornado",
    "chuva forte",
    "chuvas fortes",
    "enchente",
    "inundacao",
    "alagamento",
    "ressaca",
    "ventania",
    "onda de calor",
    "frente fria",
    "geada",
    "nevasca",
    "tormenta",
    "alerta meteorologico",
    "alerta de chuva",
    "alerta de tempestade",
    "defesa civil",
    "ola de calor",
    "granizo",
  ],
  violencia: [
    "tiroteio",
    "assalto",
    "arrastao",
    "homicidio",
    "assassinato",
    "violencia",
    "atentado",
    "sequestro",
    "latrocinio",
    "explosao",
    "bomba",
    "conflito",
    "guerra",
    "ataque",
    "protesto",
    "manifestacao",
    "confronto",
    "toque de recolher",
    "estado de emergencia",
  ],
  saude: ["surto", "epidemia", "pandemia", "dengue", "febre amarela", "sarampo", "colera", "alerta sanitario"],
  transporte: ["greve", "cancelamento de voos", "voos cancelados", "aeroporto fechado", "bloqueio", "interdicao", "rodovia interditada", "paralisacao"],
};

/** Texto sem acento e em minúsculas, para comparar. */
export const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Categorias de risco encontradas no título (vazio = sem relevância para o alerta). */
export function classificar(titulo: string): Categoria[] {
  const t = semAcento(titulo);
  const achadas: Categoria[] = [];
  for (const cat of Object.keys(PALAVRAS) as Categoria[]) {
    if (PALAVRAS[cat].some((p) => t.includes(p))) achadas.push(cat);
  }
  return achadas.sort((a, b) => CATEGORIA_META[a].prioridade - CATEGORIA_META[b].prioridade);
}

/** Termos usados na busca (o Google Notícias entende OR). */
export const BUSCA_RISCO =
  "(alerta OR tempestade OR temporal OR ciclone OR furacão OR enchente OR chuva forte OR terremoto OR vulcão OR incêndio OR tiroteio OR violência OR assalto OR atentado OR protesto OR greve OR surto)";
