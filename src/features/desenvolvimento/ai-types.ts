/** Tipos compartilhados entre o assistente de IA (server) e a UI (client). */

/** Dados do roteiro coletados do formulário (momento + campos de texto). */
export type DadosRoteiro = Record<string, string>;

export interface AcaoPlano {
  acao: string;
  prazo_sugestao: string;
}

export interface ResultadoPlano {
  resumo: string;
  resultado_esperado: string;
  plano_acao: AcaoPlano[];
  pontos_acompanhamento: string[];
  proxima_conversa_sugestao: string;
}

export type RespostaAnalise =
  | { ok: true; texto: string }
  | { ok: false; erro: string };

export type RespostaPlano =
  | { ok: true; plano: ResultadoPlano }
  | { ok: false; erro: string };
