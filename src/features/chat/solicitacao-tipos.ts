export const BUCKET_SOLICITACOES = "chat-solicitacoes";
export const MAX_BYTES_PROVA = 10 * 1024 * 1024;
export const TIPOS_PROVA = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];

export type TipoSolicitacao =
  | "landing_page"
  | "pagina"
  | "banner"
  | "lamina"
  | "video"
  | "email"
  | "arte_redes"
  | "outro";

export interface MetaTipo {
  id: TipoSolicitacao;
  rotulo: string;
  /** Rótulo do campo principal. */
  rotuloProduto: string;
  /** Link de referência obrigatório. */
  exigeReferencia: boolean;
  /** Print de prova da solicitação obrigatório. */
  exigeProva: boolean;
}

export const TIPOS_SOLICITACAO: MetaTipo[] = [
  { id: "landing_page", rotulo: "Landing page", rotuloProduto: "Nome do produto", exigeReferencia: true, exigeProva: true },
  { id: "pagina", rotulo: "Página do site", rotuloProduto: "Nome da página / produto", exigeReferencia: true, exigeProva: true },
  { id: "banner", rotulo: "Banner", rotuloProduto: "Assunto / produto", exigeReferencia: false, exigeProva: false },
  { id: "lamina", rotulo: "Lâmina", rotuloProduto: "Assunto / produto", exigeReferencia: false, exigeProva: false },
  { id: "video", rotulo: "Vídeo", rotuloProduto: "Assunto / produto", exigeReferencia: false, exigeProva: false },
  { id: "email", rotulo: "E-mail marketing", rotuloProduto: "Assunto / produto", exigeReferencia: false, exigeProva: false },
  { id: "arte_redes", rotulo: "Arte para redes sociais", rotuloProduto: "Assunto / produto", exigeReferencia: false, exigeProva: false },
  { id: "outro", rotulo: "Outro", rotuloProduto: "Assunto", exigeReferencia: false, exigeProva: false },
];

export const metaDoTipo = (id: string): MetaTipo => TIPOS_SOLICITACAO.find((t) => t.id === id) ?? TIPOS_SOLICITACAO[TIPOS_SOLICITACAO.length - 1];

export type StatusSolicitacao = "solicitada" | "em_andamento" | "concluida" | "cancelada";

export const STATUS_SOLICITACAO_ROTULO: Record<StatusSolicitacao, string> = {
  solicitada: "Solicitada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export interface NovaSolicitacao {
  tipo: TipoSolicitacao;
  produto: string;
  linkReferencia: string;
  solicitante: string;
  prazo: string | null;
  detalhes: string;
  prova: { caminho: string; nome: string } | null;
  /** Quem vai executar: recebe uma tarefa no quadro (nenhum = não cria tarefa). */
  executorId?: string | null;
}

export interface SolicitacaoView {
  id: string;
  tipo: string;
  produto: string;
  linkReferencia: string | null;
  solicitante: string;
  prazo: string | null;
  detalhes: string | null;
  provaNome: string | null;
  provaCaminho: string | null;
  provaUrl: string | null;
  provaEhImagem: boolean;
  status: StatusSolicitacao;
  criadoPorNome: string | null;
  criadoEm: string;
  /** Marca "Editado" (data da última edição). */
  editadoEm: string | null;
  /** Só quem criou a solicitação edita. */
  podeEditar: boolean;
  tarefaId: string | null;
}
