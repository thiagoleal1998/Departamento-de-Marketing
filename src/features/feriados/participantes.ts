/**
 * Quem entra na escala de feriados e nas estatísticas dela: o time operacional. Diretoria e gerência (cargos com
 * "Diretor" ou "Gerente") ficam de fora. A regra é pelo cargo do perfil, então acompanha se o cargo for alterado.
 */
export const participaDaEscala = (cargo: string | null | undefined): boolean => !/diretor|gerente/i.test((cargo ?? "").normalize("NFD").replace(/[̀-ͯ]/g, ""));
