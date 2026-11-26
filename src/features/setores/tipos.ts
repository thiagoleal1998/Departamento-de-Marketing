export interface MembroSetor {
  profile_id: string;
  funcao: string;
}

export interface Setor {
  id: string;
  nome: string;
  descricao: string;
  membros: MembroSetor[];
  ordem: number;
}

/** Garante o formato de `membros` vindo do banco ou do formulário. */
export function lerMembros(valor: unknown): MembroSetor[] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((m) => {
    const x = m as Partial<MembroSetor> | null;
    return x && typeof x.profile_id === "string" ? [{ profile_id: x.profile_id, funcao: typeof x.funcao === "string" ? x.funcao : "" }] : [];
  });
}
