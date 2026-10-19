export type StatusItem =
  | "nao_iniciado"
  | "em_andamento"
  | "concluido"
  | "cancelado";

export interface Reuniao {
  id: string;
  data: string;
  estado: "realizada" | "em_andamento";
  presencas: { nome: string; presenca: string; obs: string }[];
}

export interface ItemAta {
  id: string;
  reuniao_id: string;
  secao: "ata" | "pauta";
  ordem: number;
  titulo: string;
  serie: string;
  detalhamento: string | null;
  plano_acao: string | null;
  prioridade: number | null;
  responsavel_id: string | null;
  responsaveis_texto: string | null;
  link: string | null;
  prazo: string | null;
  status: StatusItem | null;
  categoria: CategoriaDemanda | null;
  motivo: MotivoAlteracao | null;
}

export type CategoriaDemanda =
  | "lamina_arte"
  | "email"
  | "lp_site"
  | "video"
  | "campanha"
  | "evento"
  | "brindes"
  | "processo"
  | "outro";

export type MotivoAlteracao =
  | "aguardando_aprovacao"
  | "aguardando_terceiros"
  | "falta_material"
  | "mudanca_prioridade"
  | "demanda_urgente"
  | "falta_tempo"
  | "ausencia"
  | "replanejamento"
  | "dependencia_ti"
  | "sem_necessidade"
  | "outro";

/** Campos pré-definidos: tipo de demanda. */
export const CATEGORIA_LABEL: Record<CategoriaDemanda, string> = {
  lamina_arte: "Lâmina / Arte",
  email: "E-mail",
  lp_site: "LP / Site / Automação",
  video: "Vídeo / Podcast",
  campanha: "Campanha / Promoção",
  evento: "Evento / Famtour / Treinamento",
  brindes: "Brindes / Materiais",
  processo: "Processo / Gestão interna",
  outro: "Outro",
};

/** Campos pré-definidos: motivo de alteração (prazo ou andamento). */
export const MOTIVO_LABEL: Record<MotivoAlteracao, string> = {
  aguardando_aprovacao: "Aguardando aprovação",
  aguardando_terceiros: "Aguardando retorno de outra área ou parceiro",
  falta_material: "Falta de conteúdo ou material",
  mudanca_prioridade: "Mudança de prioridade",
  demanda_urgente: "Nova demanda urgente",
  falta_tempo: "Falta de tempo / capacidade",
  ausencia: "Férias ou ausência",
  replanejamento: "Replanejamento (nova data)",
  dependencia_ti: "Dependência de TI ou ferramenta",
  sem_necessidade: "Não é mais necessário",
  outro: "Outro motivo",
};

/** Sugere o tipo de demanda pelo título (usado quando ainda não foi preenchido). */
export function inferirCategoria(titulo: string): CategoriaDemanda {
  const t = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const tem = (...ps: string[]) => ps.some((p) => t.includes(p));
  if (tem("evento", "famtour", "fam tour", "treinamento", "abav", "feira")) return "evento";
  if (tem("brinde", "mala", "garrafa", "bola", "kit", "placa")) return "brindes";
  if (tem("e-mail", "email", "news")) return "email";
  if (tem("video", "podcast", "reels", "vt ")) return "video";
  if (tem("lamina", "kv", "banner", "arte", "pop up", "icone", "story")) return "lamina_arte";
  if (tem("campanha", "promo", "corrida", "semana do cliente", "hot sales", "pix")) return "campanha";
  if (tem("lp", "site", "bot", "pagina", "geo", "trilha", "automacao", "asksuite", "infotera")) return "lp_site";
  if (tem("fluxo", "organograma", "ferias", "escala", "revisao", "processo", "apresentacao", "curso", "universidade")) return "processo";
  return "outro";
}

export const STATUS_ITEM_LABEL: Record<StatusItem | "sem", string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Finalizado",
  cancelado: "Cancelado",
  sem: "Sem status",
};

/** Item ainda aberto (cobrável). */
export const itemAberto = (s: StatusItem | null) =>
  s !== "concluido" && s !== "cancelado";
