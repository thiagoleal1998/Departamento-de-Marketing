/** Campos obrigatórios na criação manual de um card, inclusive por duplicação. */
export function validarCriacaoTarefa(dados: {
  responsavel_id?: string | null;
  solicitante?: string | null;
  prazo?: string | null;
  prioridade?: number | null;
}): string | null {
  if (!dados.responsavel_id?.trim()) return "Selecione o responsável pela tarefa.";
  if (!dados.solicitante?.trim()) return "Informe o solicitante da tarefa.";
  if (!dados.prazo?.trim()) return "Informe o prazo da tarefa.";
  const dia = dados.prazo.trim();
  const data = new Date(`${dia}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== dia) {
    return "Informe um prazo válido para a tarefa.";
  }
  if (dados.prioridade === null || dados.prioridade === undefined) return "Selecione a prioridade da tarefa.";
  if (!Number.isInteger(dados.prioridade) || dados.prioridade < 1 || dados.prioridade > 5) return "Prioridade deve ser um número inteiro de 1 a 5.";
  return null;
}
