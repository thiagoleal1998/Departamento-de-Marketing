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

export interface ProjetoChat {
  id: string;
  nome: string;
  status: "planejamento" | "em_andamento" | "concluido" | "cancelado";
  responsavel_id: string | null;
  /** Última atualização registrada (se houver). */
  ultima: { texto: string; quando: string; autor_id: string | null } | null;
}

export const STATUS_PROJETO_ROTULO: Record<ProjetoChat["status"], string> = {
  planejamento: "Planejamento",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

/** Dados atuais do que a mensagem vincula (tarefa, item do estoque e/ou projeto). */
export interface DadosVinculo {
  tarefa: TarefaChat | null;
  item: ItemEstoqueChat | null;
  projeto: ProjetoChat | null;
  /** Só a liderança muda a situação do projeto. */
  podeMudarStatusProjeto: boolean;
  /** Pode responder (dar baixa/concluir): responsável da tarefa ou liderança. */
  podeResponder: boolean;
}

export interface NovoVinculo {
  /** Projeto citado; "registrar" grava a mensagem como atualização do projeto. */
  projeto?: { id: string; registrar: boolean; novoStatus: ProjetoChat["status"] | null } | null;
  itemId: string | null;
  tarefa: { titulo: string; responsavelId: string; prazo: string | null } | null;
}

export const STATUS_TAREFA_ROTULO: Record<TarefaChat["status"], string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  revisao: "Em revisão",
  concluida: "Concluída",
};
