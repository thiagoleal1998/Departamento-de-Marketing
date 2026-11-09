/** Como a pessoa trabalha no dia em que está escalada num feriado. */
export type Modalidade = "presencial" | "home_office";

export const MODALIDADES: Modalidade[] = ["presencial", "home_office"];

export const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  presencial: "Presencial",
  home_office: "Home office",
};

export const ehModalidade = (v: unknown): v is Modalidade => v === "presencial" || v === "home_office";

/** Quem já estava escalado antes de existir a modalidade (ou veio sem ela) é presencial. */
export const modalidadeOuPadrao = (v: unknown): Modalidade => (ehModalidade(v) ? v : "presencial");

/** Um escalado a gravar: a pessoa e a modalidade dela naquele feriado. */
export interface ItemEscala {
  id: string;
  modalidade: Modalidade;
}
