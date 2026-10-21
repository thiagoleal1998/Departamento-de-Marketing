import { CADASTROS } from "./cadastros";

export type AcaoHistoricoLp = "criada" | "alterada" | "excluida";

export interface AlteracaoLp {
  campo: string;
  rotulo: string;
  de: string | null;
  para: string | null;
}

export interface EntradaHistoricoLp {
  id: string;
  landingPageId: string | null;
  nome: string;
  acao: AcaoHistoricoLp;
  alteracoes: AlteracaoLp[];
  autorNome: string | null;
  criadoEm: string;
}

export const ROTULO_ACAO_LP: Record<AcaoHistoricoLp, string> = {
  criada: "Criada",
  alterada: "Alterada",
  excluida: "Excluída",
};

/** Valor como a pessoa lê na tela (rótulo da opção, nome do responsável, data em dd/mm/aaaa). */
function valorLegivel(campo: string, valor: string | null, pessoas: Map<string, string>): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const def = CADASTROS.landing_pages.campos.find((c) => c.name === campo);
  if (def?.tipo === "select") return def.opcoes?.find((o) => o.value === valor)?.label ?? valor;
  if (def?.tipo === "pessoa") return pessoas.get(valor) ?? valor;
  if (def?.tipo === "data") return valor.slice(8, 10) + "/" + valor.slice(5, 7) + "/" + valor.slice(0, 4);
  return valor;
}

/** Compara o registro antigo com os valores novos e devolve só o que mudou. */
export function compararLp(
  antes: Record<string, string | null> | null,
  depois: Record<string, string | null>,
  pessoas: Map<string, string>
): AlteracaoLp[] {
  const mudou: AlteracaoLp[] = [];
  for (const c of CADASTROS.landing_pages.campos) {
    const a = (antes?.[c.name] ?? "") || null;
    const d = (depois[c.name] ?? "") || null;
    if (a === d) continue;
    mudou.push({
      campo: c.name,
      rotulo: c.label,
      de: valorLegivel(c.name, a, pessoas),
      para: valorLegivel(c.name, d, pessoas),
    });
  }
  return mudou;
}
