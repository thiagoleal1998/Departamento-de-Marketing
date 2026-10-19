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
