import type { BadgeProps } from "@/components/ui/badge";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/* ------------------------------------------------------------------ */
/* Perfis de usuário                                                   */
/* ------------------------------------------------------------------ */
export type Papel = "gerente" | "lider" | "colaborador";

export const PAPEL_LABEL: Record<Papel, string> = {
  gerente: "Gerente",
  lider: "Líder",
  colaborador: "Colaborador",
};

/* ------------------------------------------------------------------ */
/* Chamados                                                            */
/* ------------------------------------------------------------------ */
export type ChamadoStatus =
  | "aberto"
  | "em_triagem"
  | "em_andamento"
  | "aguardando"
  | "resolvido"
  | "fechado";

export type ChamadoPrioridade = "baixa" | "media" | "alta" | "urgente";

export type ChamadoTipo =
  | "criacao_peca"
  | "alteracao"
  | "correcao"
  | "material_grafico"
  | "revisao"
  | "aprovacao"
  | "suporte"
  | "outro";

export const CHAMADO_STATUS_META: Record<
  ChamadoStatus,
  { label: string; variant: BadgeVariant; ordem: number }
> = {
  aberto: { label: "Aberto", variant: "info", ordem: 0 },
  em_triagem: { label: "Em triagem", variant: "secondary", ordem: 1 },
  em_andamento: { label: "Em andamento", variant: "warning", ordem: 2 },
  aguardando: { label: "Aguardando", variant: "muted", ordem: 3 },
  resolvido: { label: "Resolvido", variant: "success", ordem: 4 },
  fechado: { label: "Fechado", variant: "outline", ordem: 5 },
};

export const CHAMADO_STATUS_FLUXO: ChamadoStatus[] = [
  "aberto",
  "em_triagem",
  "em_andamento",
  "aguardando",
  "resolvido",
  "fechado",
];

export const CHAMADO_PRIORIDADE_META: Record<
  ChamadoPrioridade,
  { label: string; variant: BadgeVariant }
> = {
  baixa: { label: "Baixa", variant: "muted" },
  media: { label: "Média", variant: "info" },
  alta: { label: "Alta", variant: "warning" },
  urgente: { label: "Urgente", variant: "danger" },
};

export const CHAMADO_TIPO_LABEL: Record<ChamadoTipo, string> = {
  criacao_peca: "Criação de peça",
  alteracao: "Alteração",
  correcao: "Correção",
  material_grafico: "Material gráfico",
  revisao: "Revisão",
  aprovacao: "Aprovação",
  suporte: "Suporte",
  outro: "Outro",
};

/* ------------------------------------------------------------------ */
/* Tarefas (kanban)                                                    */
/* ------------------------------------------------------------------ */
export type TarefaStatus = "a_fazer" | "em_andamento" | "revisao" | "concluida";

export const TAREFA_STATUS_META: Record<
  TarefaStatus,
  { label: string; variant: BadgeVariant }
> = {
  a_fazer: { label: "A fazer", variant: "muted" },
  em_andamento: { label: "Em andamento", variant: "warning" },
  revisao: { label: "Em revisão", variant: "info" },
  concluida: { label: "Concluída", variant: "success" },
};

/* ------------------------------------------------------------------ */
/* Feedbacks e Desenvolvimento                                         */
/* ------------------------------------------------------------------ */
export type FeedbackStatus = "rascunho" | "realizado";

export const FEEDBACK_STATUS_META: Record<
  FeedbackStatus,
  { label: string; variant: BadgeVariant }
> = {
  rascunho: { label: "Rascunho", variant: "muted" },
  realizado: { label: "Realizado", variant: "success" },
};

export type PlanoAcaoStatus = "aberto" | "em_andamento" | "concluido";

export const PLANO_STATUS_META: Record<
  PlanoAcaoStatus,
  { label: string; variant: BadgeVariant }
> = {
  aberto: { label: "Aberto", variant: "info" },
  em_andamento: { label: "Em andamento", variant: "warning" },
  concluido: { label: "Concluído", variant: "success" },
};
