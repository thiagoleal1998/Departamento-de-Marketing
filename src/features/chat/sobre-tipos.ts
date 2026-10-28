/** Assunto de uma mensagem do chat: uma tarefa do quadro e/ou um tópico da ata. */
export interface AlvoChat {
  /** Chave estável para a lista (tarefa:<id> ou ata:<id>). */
  chave: string;
  tipo: "tarefa" | "ata";
  titulo: string;
  /** Tarefa do quadro ligada (a mensagem passa a mostrar o cartão dela). */
  tarefaId: string | null;
  /** Texto de apoio na lista: responsável e prazo. */
  detalhe: string;
}

/** O que a mensagem comenta, já escolhido: vai junto no envio. */
export interface SobreEscolhido {
  tipo: "tarefa" | "ata";
  titulo: string;
  tarefaId: string | null;
}
