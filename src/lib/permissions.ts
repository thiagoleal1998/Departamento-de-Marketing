import type { Papel } from "@/types";

/**
 * Matriz de permissões (RBAC) usada na UI e nas rotas.
 * A segurança real dos dados é garantida no banco via RLS (Supabase);
 * isto controla a navegação e as ações visíveis.
 */
export type Permissao =
  | "ver_todos_dados"
  | "configurar_sistema"
  | "gerir_usuarios"
  | "ver_relatorios_gerais"
  | "gerir_demandas"
  | "abrir_chamado"
  | "triar_chamado"
  | "criar_tarefas"
  | "aprovar_pecas"
  | "criar_pecas"
  | "criar_feedback"
  | "conduzir_1a1";

const MATRIZ: Record<Papel, Permissao[]> = {
  gerente: [
    "ver_todos_dados",
    "configurar_sistema",
    "gerir_usuarios",
    "ver_relatorios_gerais",
    "gerir_demandas",
    "abrir_chamado",
    "triar_chamado",
    "criar_tarefas",
    "aprovar_pecas",
    "criar_pecas",
    "criar_feedback",
    "conduzir_1a1",
  ],
  lider: [
    "ver_relatorios_gerais",
    "gerir_demandas",
    "abrir_chamado",
    "triar_chamado",
    "criar_tarefas",
    "aprovar_pecas",
    "criar_pecas",
    "criar_feedback",
    "conduzir_1a1",
  ],
  colaborador: ["abrir_chamado", "criar_pecas"],
};

export function pode(papel: Papel | undefined | null, permissao: Permissao): boolean {
  if (!papel) return false;
  return MATRIZ[papel]?.includes(permissao) ?? false;
}

/** Papéis com poder de gestão de pessoas (feedback, 1:1, triagem). */
export function ehLideranca(papel: Papel | undefined | null): boolean {
  return papel === "gerente" || papel === "lider";
}
