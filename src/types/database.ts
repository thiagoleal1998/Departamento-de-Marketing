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
  /** Acessa a visão geral da diretoria (/executivo) e aprova as tarefas dela. */
  visao_executiva?: boolean;
  /** Letra da unidade de rede de cada raiz de pasta (ex.: { corporativo: "X" }). */
  pasta_unidades?: Record<string, string> | null;
  /** Como a pessoa quer ser chamada no chat (migration 0084); vazio = nome completo. */
  nome_exibicao?: string | null;
  /** Até quando a pessoa já viu as alterações do Comercial (migration 0074). */
  comercial_visto_em?: string | null;
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
  /** Campos vindos da importação do Notion (podem não existir ainda). */
  link?: string | null;
  responsaveis_notion?: string | null;
  prioridade?: number | null;
  status_notion?: string | null;
  tag?: string | null;
  conteudo?: string | null;
  /** Pasta de rede: raiz (corporativo, publico, hd) e caminho sem a letra da unidade. */
  pasta_raiz?: string | null;
  pasta_caminho?: string | null;
  /** Segunda pessoa no card: enxerga e edita como o responsável. */
  colaborador_id?: string | null;
  /** URL do nosso site (o `link` é a URL de referência). */
  link_site?: string | null;
  /** Código TAFMKT - numero/ano (migration 0072). */
  numero?: number | null;
  ano?: number | null;
  /** Projeto (famtour, evento…) a que o card pertence (migration 0078). */
  projeto_id?: string | null;
  /** Dias antes do prazo em que o sistema avisa (migration 0073). */
  lembretes?: number[] | null;
}

export interface Projeto {
  id: string;
  nome: string;
  descricao: string | null;
  responsavel_id: string | null;
  status: import("@/types").ProjetoStatus;
  categoria: import("@/features/projetos/categorias").CategoriaProjeto;
  data_inicio: string | null;
  data_fim: string | null;
  criado_por: string | null;
  created_at: string;
  /** Foto de capa e logo do parceiro (migration 0079). */
  capa_url?: string | null;
  logo_parceiro_url?: string | null;
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
  titulo?: string | null;
  objetivos?: unknown[];
  checklist?: unknown[];
  anexos?: unknown[];
  proficiencia?: unknown[];
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

/* ------------------------------------------------------------------ */
/* Estoque                                                             */
/* ------------------------------------------------------------------ */

export type EstoqueCategoria = "brinde" | "flyer" | "banner" | "outro";

export interface EstoqueItem {
  id: string;
  nome: string;
  categoria: EstoqueCategoria;
  local: string | null;
  quantidade: number;
  estoque_minimo: number;
  foto_url: string | null;
  descricao: string | null;
  cor: string | null;
  danificados: number;
  observacoes: string | null;
  /** Produto pontual: não gera alerta de estoque baixo. */
  ignorar_alerta?: boolean;
  ativo: boolean;
  criado_por: string | null;
  created_at: string;
}

export interface EstoqueMovimento {
  id: string;
  item_id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  saldo_apos: number;
  motivo: string | null;
  chamado_id: string | null;
  projeto_id: string | null;
  usuario_id: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Sugestões e ideias                                                  */
/* ------------------------------------------------------------------ */

export type SugestaoTipo = "ideia" | "problema" | "elogio";
export type SugestaoStatus =
  | "nova"
  | "em_analise"
  | "planejada"
  | "concluida"
  | "descartada";

export interface Sugestao {
  id: string;
  tipo: SugestaoTipo;
  titulo: string;
  descricao: string;
  status: SugestaoStatus;
  resposta: string | null;
  respondido_por: string | null;
  autor_id: string;
  anexos: import("@/features/sugestoes/anexos").AnexoSugestao[];
  created_at: string;
  updated_at: string;
}
