/** Um apontamento marcado na peça: retângulo em % da imagem + o comentário. */
export interface MarcacaoRevisao {
  n: number;
  x: number;
  y: number;
  w: number;
  h: number;
  texto: string;
}

export type VereditoRevisao = "ajustes" | "aprovada";

/** Peça enviada para revisão no chat (gravada em chat_mensagens.revisao). */
export interface RevisaoPeca {
  imagem: string;
  nome: string;
  veredito: VereditoRevisao;
  marcacoes: MarcacaoRevisao[];
}

export const VEREDITOS: Record<VereditoRevisao, { rotulo: string; classe: string }> = {
  ajustes: { rotulo: "Precisa de ajustes", classe: "bg-amber-500 text-white" },
  aprovada: { rotulo: "Aprovada", classe: "bg-emerald-600 text-white" },
};

export const MAX_MARCACOES = 30;
