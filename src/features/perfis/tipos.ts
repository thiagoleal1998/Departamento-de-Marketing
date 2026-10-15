export type FatorDisc = "D" | "I" | "S" | "C";

export interface DadosPerfil {
  pontuacoes: Record<FatorDisc, number>;
  subtracos: { nome: string; valor: number }[];
  compatibilidade: { nome: string; pct: number }[];
  competencias: { nome: string; pct: number; texto: string }[];
  insights: { titulo: string; texto: string }[];
  motivadores: string[];
  desenvolvimento: string[];
  pontos_fortes: string[];
  desafios: string[];
  recomendacoes: string[];
}

export interface PerfilComportamental {
  id: string;
  profile_id: string | null;
  nome: string;
  email: string;
  papel: "gerente" | "lider" | "colaborador";
  pesquisa: string | null;
  concluido_em: string | null;
  perfil_primario: FatorDisc;
  perfil_secundario: FatorDisc | null;
  dados: DadosPerfil;
}

export const FATOR_META: Record<
  FatorDisc,
  { nome: string; cor: string; texto: string; descricao: string }
> = {
  D: {
    nome: "Dominância",
    cor: "bg-red-600",
    texto: "text-red-600",
    descricao:
      "Foco em resultados, ação rápida, desafio e controle. Pode ser impaciente ou autoritário em ambientes colaborativos.",
  },
  I: {
    nome: "Influência",
    cor: "bg-amber-500",
    texto: "text-amber-600",
    descricao:
      "Foco em pessoas, comunicação, entusiasmo e persuasão. Pode dispersar-se ou evitar detalhes e regras.",
  },
  S: {
    nome: "Estabilidade",
    cor: "bg-emerald-600",
    texto: "text-emerald-600",
    descricao:
      "Foco em suporte, consistência, empatia e lealdade. Pode resistir a mudanças e priorizar harmonia.",
  },
  C: {
    nome: "Conformidade",
    cor: "bg-blue-600",
    texto: "text-blue-600",
    descricao:
      "Foco em regras, qualidade, precisão e lógica. Pode ser excessivamente crítico ou rígido com erros e normas.",
  },
};

/** Nível do subtraço conforme a legenda do relatório. */
export function nivelSubtraco(valor: number): {
  rotulo: string;
  classe: string;
} {
  if (valor >= 76) return { rotulo: "Natural", classe: "text-emerald-600" };
  if (valor >= 51) return { rotulo: "Potencial", classe: "text-blue-600" };
  if (valor >= 26) return { rotulo: "Adaptado", classe: "text-amber-600" };
  return { rotulo: "Limitado", classe: "text-red-600" };
}
