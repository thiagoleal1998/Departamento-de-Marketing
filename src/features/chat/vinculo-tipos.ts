export interface ItemEstoqueChat {
  id: string;
  nome: string;
  quantidade: number;
  estoque_minimo: number;
}

export interface TarefaChat {
  id: string;
  titulo: string;
  status: "a_fazer" | "em_andamento" | "revisao" | "concluida";
  prazo: string | null;
  responsavel_id: string | null;
  estoque_item_id: string | null;
}

/** Dados atuais do que a mensagem vincula (tarefa e/ou item do estoque). */
export interface DadosVinculo {
  tarefa: TarefaChat | null;
  item: ItemEstoqueChat | null;
  /** Pode responder (dar baixa/concluir): responsável da tarefa ou liderança. */
  podeResponder: boolean;
}

export interface NovoVinculo {
  itemId: string | null;
  tarefa: { titulo: string; responsavelId: string; prazo: string | null } | null;
}

export const STATUS_TAREFA_ROTULO: Record<TarefaChat["status"], string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  revisao: "Em revisão",
  concluida: "Concluída",
};
