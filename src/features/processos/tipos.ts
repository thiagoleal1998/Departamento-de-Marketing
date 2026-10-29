/**
 * Fluxos e processos do Marketing (Gestão).
 * Hierarquia: Departamento → Macroprocessos → Processos → Fluxos → Etapas. Procedimentos (fase 2) se ligam às etapas.
 * O fluxo guarda as etapas e as ligações em JSON; as visões (fluxograma, lista, por responsável) leem os mesmos dados.
 */

export type TipoBloco = "inicio" | "atividade" | "decisao" | "aprovacao" | "documento" | "processo" | "fim";

export const ORDEM_BLOCOS: TipoBloco[] = ["inicio", "atividade", "decisao", "aprovacao", "documento", "processo", "fim"];

/** Cada tipo tem forma, ícone e cor próprios: a cor indica a natureza da etapa (não é só estética). */
export const BLOCOS: Record<TipoBloco, { rotulo: string; descricao: string; classe: string; faixa: string }> = {
  inicio: {
    rotulo: "Início",
    descricao: "Onde o processo começa (gatilho).",
    classe: "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-100",
    faixa: "bg-emerald-500",
  },
  atividade: {
    rotulo: "Atividade",
    descricao: "Trabalho executado por alguém.",
    classe: "border-sky-500 bg-sky-50 text-sky-950 dark:bg-sky-950/50 dark:text-sky-100",
    faixa: "bg-sky-500",
  },
  decisao: {
    rotulo: "Decisão",
    descricao: "Pergunta com caminhos (Sim / Não).",
    classe: "border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100",
    faixa: "bg-amber-500",
  },
  aprovacao: {
    rotulo: "Aprovação",
    descricao: "Alguém valida com um critério claro.",
    classe: "border-violet-500 bg-violet-50 text-violet-950 dark:bg-violet-950/50 dark:text-violet-100",
    faixa: "bg-violet-500",
  },
  documento: {
    rotulo: "Documento",
    descricao: "Material ou registro usado ou gerado.",
    classe: "border-slate-400 bg-slate-50 text-slate-900 dark:bg-slate-900/60 dark:text-slate-100",
    faixa: "bg-slate-400",
  },
  processo: {
    rotulo: "Processo vinculado",
    descricao: "Segue em outro processo.",
    classe: "border-teal-500 border-dashed bg-teal-50 text-teal-950 dark:bg-teal-950/50 dark:text-teal-100",
    faixa: "bg-teal-500",
  },
  fim: {
    rotulo: "Fim",
    descricao: "Onde o processo termina (entrega).",
    classe: "border-rose-500 bg-rose-50 text-rose-950 dark:bg-rose-950/50 dark:text-rose-100",
    faixa: "bg-rose-500",
  },
};

/** Dados de uma etapa (cadastro das etapas). Responsável: função/cargo, não só nomes de pessoas. */
export type DadosEtapa = {
  tipo: TipoBloco;
  nome: string;
  descricao?: string;
  /** Quem executa (de preferência uma função: "Design", "Supervisão"). */
  responsavel?: string;
  /** Outras funções que participam. */
  funcoes?: string;
  entrada?: string;
  instrucoes?: string;
  ferramentas?: string;
  /** Critério de conclusão; em Aprovação, o que está sendo validado. */
  criterio?: string;
  prazo?: string;
  /** Procedimentos ligados (texto livre na fase 1; biblioteca na fase 2). */
  procedimentos?: string;
  checklist?: string[];
  anexos?: string;
  observacoes?: string;
};

export interface NoFluxo {
  id: string;
  type: "bloco";
  position: { x: number; y: number };
  data: DadosEtapa;
}

export interface LigacaoFluxo {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  /** "Sim", "Não" ou outro texto do caminho. */
  label?: string;
}

export interface DadosFluxo {
  nodes: NoFluxo[];
  edges: LigacaoFluxo[];
}

export const FLUXO_VAZIO: DadosFluxo = { nodes: [], edges: [] };

export type TipoFluxo = "atual" | "proposto";
export const ROTULO_FLUXO: Record<TipoFluxo, string> = { atual: "Fluxo atual", proposto: "Fluxo proposto" };

export type StatusProcesso = "rascunho" | "revisao" | "publicado";
export const STATUS_PROCESSO: Record<StatusProcesso, { rotulo: string; classe: string }> = {
  rascunho: { rotulo: "Rascunho", classe: "bg-slate-500/15 text-slate-700 ring-slate-500/40 dark:text-slate-300" },
  revisao: { rotulo: "Em revisão", classe: "bg-amber-500/15 text-amber-700 ring-amber-500/40 dark:text-amber-300" },
  publicado: { rotulo: "Publicado", classe: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/40 dark:text-emerald-300" },
};

export interface Macroprocesso {
  id: string;
  nome: string;
  sigla: string;
  descricao: string | null;
  ordem: number;
}

export interface Processo {
  id: string;
  codigo: string;
  nome: string;
  macroprocesso_id: string | null;
  descricao: string | null;
  objetivo: string | null;
  gatilho: string | null;
  entradas: string | null;
  saidas: string | null;
  responsavel_id: string | null;
  areas: string[];
  ferramentas: string[];
  prazo_referencia: string | null;
  indicadores: string | null;
  documentos: string | null;
  status: StatusProcesso;
  versao: number;
  publicado_em: string | null;
  ultima_revisao: string | null;
  proxima_revisao: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pendencia {
  nivel: "erro" | "aviso";
  texto: string;
  /** Etapa a que se refere (para destacar no fluxo). */
  noId?: string;
}

/** Meses até a próxima revisão periódica de um processo publicado. */
export const MESES_ATE_REVISAO = 6;
