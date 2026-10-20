import type { Profile } from "@/types/database";

/** Quem abre a visão geral: a liderança e os usuários marcados com a "visão da diretoria". */
export function temVisaoExecutiva(p: Pick<Profile, "role" | "visao_executiva"> | null | undefined): boolean {
  if (!p) return false;
  return p.role === "gerente" || p.role === "lider" || p.visao_executiva === true;
}

/** Quem decide as aprovações: gerente ou usuário com a visão da diretoria. */
export function podeAprovarComoDiretoria(p: Pick<Profile, "role" | "visao_executiva"> | null | undefined): boolean {
  if (!p) return false;
  return p.role === "gerente" || p.visao_executiva === true;
}
