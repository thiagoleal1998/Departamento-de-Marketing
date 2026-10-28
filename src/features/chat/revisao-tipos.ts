/** Um apontamento marcado na peça: retângulo em % da imagem + o comentário. */
export interface MarcacaoRevisao {
  n: number;
  x: number;
  y: number;
  w: number;
  h: number;
  texto: string;
}

/** "aguardando" é o estado do pedido de revisão, antes de alguém revisar. */
export type VereditoRevisao = "ajustes" | "aprovada" | "aguardando";

/** O que o revisor pode escolher ao enviar a revisão. */
export const VEREDITOS_REVISOR: ("ajustes" | "aprovada")[] = ["ajustes", "aprovada"];

/** Peça enviada para revisão no chat (gravada em chat_mensagens.revisao). */
export interface RevisaoPeca {
  imagem: string;
  nome: string;
  veredito: VereditoRevisao;
  marcacoes: MarcacaoRevisao[];
  /** "pedido": quem criou a peça pede revisão (só envia a imagem). "revisao" (padrão): o revisor marca e comenta. */
  tipo?: "pedido" | "revisao";
  /** na revisão, o id da mensagem do pedido que ela responde */
  pedido?: string | null;
}

export const VEREDITOS: Record<VereditoRevisao, { rotulo: string; classe: string }> = {
  ajustes: { rotulo: "Precisa de ajustes", classe: "bg-amber-500 text-white" },
  aprovada: { rotulo: "Aprovada", classe: "bg-emerald-600 text-white" },
  aguardando: { rotulo: "Aguardando revisão", classe: "bg-sky-600 text-white" },
};

export const MAX_MARCACOES = 30;
