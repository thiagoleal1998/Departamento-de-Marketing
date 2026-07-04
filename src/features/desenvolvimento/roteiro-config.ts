import type { RoteiroFeedback, AnotacoesUmAUm } from "@/types/database";

export const FRASE_GUIA = "O foco não é convencer. É gerar consciência.";

/** Opções do momento em que o roteiro está sendo preenchido. */
export const MOMENTO_OPCOES = [
  {
    valor: "antes" as const,
    titulo: "Antes da conversa",
    descricao: "Estou preparando o roteiro para conduzir a conversa depois.",
  },
  {
    valor: "durante" as const,
    titulo: "Durante a conversa",
    descricao: "Estou registrando enquanto a conversa acontece.",
  },
];

export type TipoCampo = "textarea" | "text" | "checkbox" | "date";

export interface CampoRoteiro {
  chave: keyof RoteiroFeedback;
  label: string;
  ajuda?: string;
  placeholder?: string;
  tipo?: TipoCampo;
}

export interface EtapaFeedback {
  id: string;
  titulo: string;
  subtitulo: string;
  campos: CampoRoteiro[];
}

/**
 * Estrutura guiada da conversa de feedback — orientada ao desenvolvimento,
 * não ao julgamento. Cada etapa traz textos de apoio para conduzir a conversa.
 */
export const ETAPAS_FEEDBACK: EtapaFeedback[] = [
  {
    id: "abertura",
    titulo: "Abertura",
    subtitulo:
      "Deixe claro que esta é uma conversa sobre desenvolvimento — não sobre julgamento.",
    campos: [
      {
        chave: "abertura",
        label: "Como você vai abrir a conversa?",
        ajuda:
          "Mostre que é sobre trabalho, comportamento, evolução e próximos passos.",
        placeholder:
          "Ex.: Quero conversar sobre seu desenvolvimento e construir os próximos passos junto com você...",
      },
    ],
  },
  {
    id: "positivos",
    titulo: "Pontos positivos",
    subtitulo: "Comece pelo que está indo bem. Reconheça de forma específica.",
    campos: [
      {
        chave: "pontos_positivos",
        label: "O que a pessoa faz bem?",
        placeholder: "Entregas, comportamentos e forças que merecem reconhecimento.",
      },
    ],
  },
  {
    id: "melhorias",
    titulo: "Pontos de melhoria",
    subtitulo:
      "Aborde melhorias técnicas e comportamentais com base em fatos e exemplos.",
    campos: [
      {
        chave: "melhorias_tecnicas",
        label: "Melhorias técnicas",
        placeholder: "Habilidades, processos, qualidade das entregas...",
      },
      {
        chave: "melhorias_comportamentais",
        label: "Melhorias comportamentais",
        placeholder: "Comunicação, colaboração, postura...",
      },
      {
        chave: "fatos_observados",
        label: "Fatos observados",
        ajuda:
          "Registre fatos vistos diretamente ou feedbacks vindos de níveis acima.",
        placeholder: "Situações concretas, sem interpretações.",
      },
      {
        chave: "exemplos",
        label: "Exemplos rápidos",
        ajuda: "Exemplos facilitam o entendimento.",
        placeholder: "Ex.: na entrega X, aconteceu Y...",
      },
    ],
  },
  {
    id: "escuta",
    titulo: "Escuta e espaço para falar",
    subtitulo:
      "Crie espaço para a pessoa falar. Pratique escuta ativa e observe o estado emocional.",
    campos: [
      {
        chave: "escuta_espaco_fala",
        label: "O que a pessoa trouxe?",
        placeholder: "Anote a percepção dela, dúvidas e sentimentos.",
      },
      {
        chave: "pessoa_tranquila",
        label: "A pessoa está tranquila durante a conversa?",
        tipo: "checkbox",
      },
      {
        chave: "nota_emocional",
        label: "Observações sobre o estado emocional",
        ajuda: "Se necessário, ajude a regular a emoção antes de seguir.",
        placeholder: "Como a pessoa reagiu? Precisou de acolhimento?",
      },
    ],
  },
  {
    id: "clareza",
    titulo: "Clareza e propósito",
    subtitulo:
      "Dê clareza sobre o que se espera e por quê. Mostre o impacto ampliado e o benefício pessoal.",
    campos: [
      {
        chave: "clareza_expectativa",
        label: "O que se espera e por quê?",
        placeholder: "Expectativa clara + a razão por trás dela.",
      },
      {
        chave: "impacto_ampliado",
        label: "Impacto ampliado",
        ajuda: "Como o comportamento/entrega afeta o time, a área e a empresa.",
        placeholder: "Ex.: quando isso acontece, o impacto no time é...",
      },
      {
        chave: "beneficio_pessoal",
        label: "Benefício pessoal para a pessoa",
        placeholder: "O que ela ganha ao evoluir nesse ponto.",
      },
    ],
  },
  {
    id: "entendimento",
    titulo: "Checagem de entendimento",
    subtitulo: "Garanta que a mensagem chegou. Pergunte, não afirme.",
    campos: [
      {
        chave: "checagem_entendimento",
        label: "“O que ficou para você desta conversa?”",
        ajuda: "Registre o que a pessoa respondeu.",
        placeholder: "Resumo do entendimento dela.",
      },
    ],
  },
  {
    id: "solucao",
    titulo: "Construir solução junto",
    subtitulo:
      "Resolvam juntos. Dê espaço para a pessoa propor o próprio plano de ação.",
    campos: [
      {
        chave: "solucao_conjunta",
        label: "Como vão resolver juntos?",
        placeholder: "Caminhos construídos em conjunto.",
      },
      {
        chave: "plano_proposto",
        label: "Plano proposto pela pessoa",
        ajuda:
          "O valor real está em lidar com a percepção e mudar a ação — não em convencer.",
        placeholder: "O que ela se compromete a fazer?",
      },
    ],
  },
  {
    id: "fechamento",
    titulo: "Fechamento",
    subtitulo:
      "Transmita confiança. Encerre com ambiente de crescimento, clareza e força para ação.",
    campos: [
      {
        chave: "confianca_fechamento",
        label: "Mensagem de confiança e fechamento",
        placeholder: "Ex.: confio na sua capacidade de evoluir nisso...",
      },
    ],
  },
  {
    id: "compromissos",
    titulo: "Compromissos",
    subtitulo: "Defina data de ação, resultado esperado e possível nova conversa.",
    campos: [
      { chave: "data_acao", label: "Data de ação", tipo: "date" },
      {
        chave: "resultado_esperado",
        label: "Resultado esperado",
        placeholder: "O que será diferente e como saberemos.",
      },
      { chave: "proxima_conversa", label: "Possível nova conversa", tipo: "date" },
    ],
  },
];

export const ROTEIRO_VAZIO: RoteiroFeedback = {
  momento: "antes",
  abertura: "",
  pontos_positivos: "",
  melhorias_tecnicas: "",
  melhorias_comportamentais: "",
  fatos_observados: "",
  exemplos: "",
  escuta_espaco_fala: "",
  pessoa_tranquila: false,
  nota_emocional: "",
  clareza_expectativa: "",
  impacto_ampliado: "",
  beneficio_pessoal: "",
  checagem_entendimento: "",
  solucao_conjunta: "",
  plano_proposto: "",
  confianca_fechamento: "",
  data_acao: "",
  resultado_esperado: "",
  proxima_conversa: "",
};

/* ------------------------------------------------------------------ */
/* Conversa 1:1                                                        */
/* ------------------------------------------------------------------ */

export interface CampoUmAUm {
  chave: keyof AnotacoesUmAUm;
  label: string;
  ajuda?: string;
  placeholder?: string;
}

export interface BlocoUmAUm {
  id: string;
  titulo: string;
  subtitulo: string;
  campos: CampoUmAUm[];
}

export const BLOCOS_1A1: BlocoUmAUm[] = [
  {
    id: "jornada",
    titulo: "A jornada da pessoa",
    subtitulo: "Escute a trajetória com interesse genuíno. Conexão antes de conteúdo.",
    campos: [
      {
        chave: "jornada",
        label: "Como tem sido a jornada dela?",
        placeholder: "História, momento atual, o que tem vivido.",
      },
    ],
  },
  {
    id: "sonhos",
    titulo: "Sonhos, propósito e motivações",
    subtitulo: "Entenda o que move a pessoa.",
    campos: [
      {
        chave: "sonhos_motivacoes",
        label: "O que te motiva e dá propósito?",
        placeholder: "Motivações, valores, o que faz sentido para ela.",
      },
      {
        chave: "onde_sonha_estar",
        label: "“Onde você sonha estar daqui alguns anos?”",
        placeholder: "Visão de futuro e carreira.",
      },
    ],
  },
  {
    id: "autopercepcao",
    titulo: "Autopercepção",
    subtitulo:
      "Explique que a pergunta existe porque você quer ajudar no desenvolvimento.",
    campos: [
      {
        chave: "pontos_fortes",
        label: "“Quais são seus pontos fortes e dos quais mais se orgulha?”",
        placeholder: "Forças reconhecidas pela própria pessoa.",
      },
      {
        chave: "pontos_desenvolvimento",
        label: "“Quais são seus pontos de desenvolvimento?”",
        ajuda: "Reforce: você pergunta porque quer apoiar a evolução dela.",
        placeholder: "O que ela quer desenvolver.",
      },
    ],
  },
  {
    id: "visao_area",
    titulo: "Visão sobre a área",
    subtitulo: "Convide a pessoa a contribuir com a construção da área.",
    campos: [
      {
        chave: "visao_area_positivo",
        label: "O que você vê como positivo na área?",
        placeholder: "O que está funcionando bem.",
      },
      {
        chave: "visao_area_diferente",
        label: "O que você faria diferente na área?",
        placeholder: "Ideias e mudanças que ela proporia.",
      },
    ],
  },
  {
    id: "observacoes",
    titulo: "Observações",
    subtitulo: "Registre o que mais foi dito para compor o histórico.",
    campos: [
      {
        chave: "observacoes",
        label: "Outras anotações",
        placeholder: "Combinados, sensações, próximos passos.",
      },
    ],
  },
];

export const ANOTACOES_1A1_VAZIO: AnotacoesUmAUm = {
  jornada: "",
  sonhos_motivacoes: "",
  onde_sonha_estar: "",
  pontos_fortes: "",
  pontos_desenvolvimento: "",
  visao_area_positivo: "",
  visao_area_diferente: "",
  observacoes: "",
};
