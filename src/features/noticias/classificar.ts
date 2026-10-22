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

// ---- Relevância para quem viaja ------------------------------------------------------------

/** Palavras que ligam uma notícia de segurança ao turista (local turístico, aeroporto, hotel…). */
const CONTEXTO_TURISTA = [
  "turista",
  "turismo",
  "turistic",
  "viajante",
  "viagem",
  "praia",
  "orla",
  "hotel",
  "resort",
  "pousada",
  "aeroporto",
  "voo",
  "voos",
  "cruzeiro",
  "consulado",
  "embaixada",
  "brasileiro",
  "brasileiros",
  "ponto turistico",
  "centro historico",
  "parque",
];

/** Crimes do dia a dia: só interessam ao turista se a notícia tiver contexto de turismo. */
const CRIME_COMUM = ["assalto", "arrastao", "homicidio", "assassinato", "latrocinio", "tiroteio", "violencia", "roubo", "furto", "baleado"];

/**
 * A manchete interessa a quem vende/viaja? Clima, natureza, saúde, transporte e eventos graves
 * (atentado, guerra, estado de emergência…) sempre; crime comum só com contexto de turista.
 */
export function pertinenteAoTurista(titulo: string, categorias: Categoria[]): boolean {
  const t = semAcento(titulo);
  const contexto = CONTEXTO_TURISTA.some((p) => t.includes(p));
  if (categorias.some((c) => c === "natureza" || c === "clima" || c === "saude" || c === "transporte")) return true;
  if (categorias.includes("violencia")) {
    const graves = ["atentado", "guerra", "conflito", "estado de emergencia", "toque de recolher", "sequestro", "bomba", "explosao", "confronto", "protesto", "manifestacao", "ataque"];
    if (graves.some((p) => t.includes(p))) return true;
    if (CRIME_COMUM.some((p) => t.includes(p))) return contexto;
    return contexto;
  }
  return false;
}

/** Veículos aceitos: G1, O Globo, UOL e CNN Brasil (pelo nome ou pelo endereço da fonte). */
export function fonteAceita(nomeFonte: string, urlFonte: string): boolean {
  const n = semAcento(nomeFonte).trim();
  const u = semAcento(urlFonte);
  return (
    n === "g1" ||
    n.startsWith("g1 ") ||
    n === "o globo" ||
    n.startsWith("uol") ||
    n.startsWith("cnn") ||
    u.includes("g1.globo.com") ||
    u.includes("oglobo.globo.com") ||
    u.includes("uol.com.br") ||
    u.includes("cnnbrasil.com.br")
  );
}

/** Restringe a busca aos veículos aceitos. */
export const BUSCA_FONTES = "(site:g1.globo.com OR site:oglobo.globo.com OR site:uol.com.br OR site:cnnbrasil.com.br)";
