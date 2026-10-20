export const BUCKET_PLANOS = "planos-acao";
export const MAX_BYTES_PLANO = 25 * 1024 * 1024;
export const MAX_ANEXOS_PLANO = 20;

export const TIPOS_PLANO = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export type Horizonte = "curto" | "medio" | "longo";

export const HORIZONTES: { id: Horizonte; rotulo: string; dica: string }[] = [
  { id: "curto", rotulo: "Curto prazo", dica: "até 30 dias" },
  { id: "medio", rotulo: "Médio prazo", dica: "de 1 a 6 meses" },
  { id: "longo", rotulo: "Longo prazo", dica: "mais de 6 meses" },
];

export interface ObjetivoPlano {
  id: string;
  horizonte: Horizonte;
  texto: string;
  prazo: string | null;
  feito: boolean;
  /** Nota da liderança para esta etapa (0 a 10) e o porquê dela. */
  nota: number | null;
  justificativa: string;
}

export interface ItemChecklist {
  id: string;
  texto: string;
  feito: boolean;
  nota: number | null;
  justificativa: string;
}

export interface AnexoPlano {
  caminho: string;
  nome: string;
  tipo: string;
  tamanho: number;
}

export interface AnexoPlanoVisivel extends AnexoPlano {
  url: string;
}

/** Avaliação de proficiência: uma competência com nota de 0 a 10. */
export interface Proficiencia {
  id: string;
  competencia: string;
  nota: number;
  data: string;
  observacao: string;
}

export interface DadosPlano {
  titulo: string;
  descricao: string;
  resultado_esperado: string;
  prazo: string | null;
  proxima_conversa: string | null;
  status: "aberto" | "em_andamento" | "concluido";
  objetivos: ObjetivoPlano[];
  checklist: ItemChecklist[];
  anexos: AnexoPlano[];
  proficiencia: Proficiencia[];
}
