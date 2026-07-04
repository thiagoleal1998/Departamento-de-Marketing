import { Badge } from "@/components/ui/badge";
import {
  CHAMADO_STATUS_META,
  CHAMADO_PRIORIDADE_META,
  APROVACAO_META,
  TAREFA_STATUS_META,
  FEEDBACK_STATUS_META,
  PLANO_STATUS_META,
  type ChamadoStatus,
  type ChamadoPrioridade,
  type AprovacaoStatus,
  type TarefaStatus,
  type FeedbackStatus,
  type PlanoAcaoStatus,
} from "@/types";

export function ChamadoStatusBadge({ status }: { status: ChamadoStatus }) {
  const meta = CHAMADO_STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function ChamadoPrioridadeBadge({
  prioridade,
}: {
  prioridade: ChamadoPrioridade;
}) {
  const meta = CHAMADO_PRIORIDADE_META[prioridade];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function AprovacaoBadge({ status }: { status: AprovacaoStatus }) {
  const meta = APROVACAO_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function TarefaStatusBadge({ status }: { status: TarefaStatus }) {
  const meta = TAREFA_STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function FeedbackStatusBadge({ status }: { status: FeedbackStatus }) {
  const meta = FEEDBACK_STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function PlanoStatusBadge({ status }: { status: PlanoAcaoStatus }) {
  const meta = PLANO_STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
