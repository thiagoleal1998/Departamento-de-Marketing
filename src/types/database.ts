import type {
  Papel,
  ChamadoStatus,
  ChamadoPrioridade,
  ChamadoTipo,
  AprovacaoStatus,
  TarefaStatus,
  FeedbackStatus,
  PlanoAcaoStatus,
} from "@/types";

export interface Area {
  id: string;
  nome: string;
  lider_id: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  nome: string;
  email: string;
  role: Papel;
  area_id: string | null;
  lider_id: string | null;
  cargo: string | null;
  avatar_url: string | null;
  ativo: boolean;
  created_at: string;
}

export interface Chamado {
  id: string;
  numero: number;
  titulo: string;
  descricao: string | null;
  tipo: ChamadoTipo;
  categoria: string | null;
  prioridade: ChamadoPrioridade;
  status: ChamadoStatus;
  aprovacao: AprovacaoStatus;
  aprovacao_justificativa: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  aceito_por: string | null;
  aceite_justificativa: string | null;
  aceito_em: string | null;
  departamento: string | null;
  segmento: string | null;
  formato: string | null;
  subtipo: string | null;
  material_grafico: string | null;
  prazo_entrega: string | null;
  referencia_url: string | null;
  referencia_nome: string | null;
  solicitante_id: string | null;
  solicitante_nome: string | null;
  solicitante_email: string | null;
  origem: "interno" | "portal";
  responsavel_id: string | null;
  area_id: string | null;
  prazo_sla: string | null;
  tarefa_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChamadoComentario {
  id: string;
  chamado_id: string;
  autor_id: string;
  texto: string;
  created_at: string;
}

export interface ChamadoHistorico {
  id: string;
  chamado_id: string;
  autor_id: string | null;
  campo: string;
  de: string | null;
  para: string | null;
  created_at: string;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  status: TarefaStatus;
  responsavel_id: string | null;
  chamado_id: string | null;
  etapa_id: string | null;
  prazo: string | null;
  ordem: number;
  created_at: string;
}

export interface Projeto {
  id: string;
  nome: string;
  descricao: string | null;
  responsavel_id: string | null;
  status: import("@/types").ProjetoStatus;
  data_inicio: string | null;
  data_fim: string | null;
  criado_por: string | null;
  created_at: string;
}

export interface ProjetoEtapa {
  id: string;
  projeto_id: string;
  titulo: string;
  descricao: string | null;
  status: import("@/types").EtapaStatus;
  responsavel_id: string | null;
  prazo: string | null;
  ordem: number;
  created_at: string;
}

export interface ProjetoDocumento {
  id: string;
  projeto_id: string;
  nome: string;
  url: string;
  created_at: string;
}

export interface ProjetoComparativo {
  id: string;
  projeto_id: string;
  item: string;
  fornecedor: string;
  valor: number | null;
  observacao: string | null;
  created_at: string;
}

export interface Notificacao {
  id: string;
  destinatario_id: string;
  tipo: string;
  titulo: string;
  link: string | null;
  lida: boolean;
  created_at: string;
}

export interface Feedback {
  id: string;
  colaborador_id: string;
  autor_id: string;
  data: string;
  status: FeedbackStatus;
  roteiro: RoteiroFeedback;
  resumo: string | null;
  created_at: string;
}

export interface UmAUm {
  id: string;
  colaborador_id: string;
  lider_id: string;
  data: string;
  tema: string | null;
  anotacoes: AnotacoesUmAUm;
  created_at: string;
}

export interface PlanoAcao {
  id: string;
  origem_tipo: "feedback" | "um_a_um";
  origem_id: string | null;
  colaborador_id: string;
  autor_id: string;
  descricao: string;
  resultado_esperado: string | null;
  prazo: string | null;
  status: PlanoAcaoStatus;
  proxima_conversa: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Estruturas JSONB dos roteiros                                       */
/* ------------------------------------------------------------------ */

/** Quando o roteiro está sendo preenchido em relação à conversa. */
export type MomentoFeedback = "antes" | "durante";

/** Roteiro guiado de feedback (uma chave por etapa). */
export interface RoteiroFeedback {
  /** Preparação antes da conversa ou registro durante a conversa. */
  momento: MomentoFeedback;
  abertura: string;
  pontos_positivos: string;
  melhorias_tecnicas: string;
  melhorias_comportamentais: string;
  fatos_observados: string;
  exemplos: string;
  escuta_espaco_fala: string;
  pessoa_tranquila: boolean;
  nota_emocional: string;
  clareza_expectativa: string;
  impacto_ampliado: string;
  beneficio_pessoal: string;
  checagem_entendimento: string;
  solucao_conjunta: string;
  plano_proposto: string;
  confianca_fechamento: string;
  data_acao: string;
  resultado_esperado: string;
  proxima_conversa: string;
}

/** Anotações guiadas da conversa 1:1. */
export interface AnotacoesUmAUm {
  jornada: string;
  sonhos_motivacoes: string;
  onde_sonha_estar: string;
  pontos_fortes: string;
  pontos_desenvolvimento: string;
  visao_area_positivo: string;
  visao_area_diferente: string;
  observacoes: string;
}
