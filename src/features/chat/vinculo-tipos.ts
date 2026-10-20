export interface ItemEstoqueChat {
  id: string;
  nome: string;
  quantidade: number;
  estoque_minimo: number;
}

/** Item citado numa mensagem/tarefa, com a quantidade pedida (opcional). */
export interface RefItem {
  id: string;
  qtd: number | null;
}

/** Item com os dados atuais do estoque, para exibir no cartão. */
export interface ItemVinculado extends ItemEstoqueChat {
  pedido: number | null;
}

export interface TarefaChat {
  id: string;
  titulo: string;
  status: "a_fazer" | "em_andamento" | "revisao" | "concluida";
  prazo: string | null;
  responsavel_id: string | null;
  estoque_item_id: string | null;
  estoque_itens?: RefItem[] | null;
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

/** Dados atuais do que a mensagem vincula (tarefa, itens do estoque e/ou projeto). */
export interface DadosVinculo {
  tarefa: TarefaChat | null;
  itens: ItemVinculado[];
  projeto: ProjetoChat | null;
  /** Só a liderança muda a situação do projeto. */
  podeMudarStatusProjeto: boolean;
  /** Pode responder (dar baixa/concluir): responsável da tarefa ou liderança. */
  podeResponder: boolean;
}

export interface NovoVinculo {
  /** Projeto citado; "registrar" grava a mensagem como atualização do projeto. */
  projeto?: { id: string; registrar: boolean; novoStatus: ProjetoChat["status"] | null } | null;
  itens: RefItem[];
  tarefa: { titulo: string; responsavelId: string; prazo: string | null } | null;
}

export const STATUS_TAREFA_ROTULO: Record<TarefaChat["status"], string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  revisao: "Em revisão",
  concluida: "Concluída",
};

/** Itens de uma mensagem/tarefa, aceitando o formato antigo (um único item). */
export function refsDe(lista: RefItem[] | null | undefined, itemUnico: string | null | undefined): RefItem[] {
  if (Array.isArray(lista) && lista.length > 0) return lista;
  return itemUnico ? [{ id: itemUnico, qtd: null }] : [];
}
