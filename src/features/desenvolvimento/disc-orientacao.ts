import type { FatorDisc } from "@/features/perfis/tipos";

/**
 * Orientações ao gestor sobre como conduzir um plano de ação, por estilo DISC.
 * Base: síntese de materiais de prática de gestão e coaching com DISC (ver FONTES).
 * São ponto de partida, não diagnóstico: valide sempre com a observação e com a própria pessoa.
 */
export interface OrientacaoPerfil {
  rotulo: string;
  resumo: string;
  motivadores: string[];
  sobPressao: string[];
  apresentarPlano: string[];
  darFeedback: string[];
  metas: string[];
  acompanhamento: string[];
  reconhecer: string[];
  evitar: string[];
  perguntas: string[];
  acoesDeDesenvolvimento: string[];
  atencao: string;
}

export const ORIENTACAO: Record<FatorDisc, OrientacaoPerfil> = {
  D: {
    rotulo: "Dominância (D)",
    resumo: "Orientada a resultados, decidida e confiante; gosta de desafio, autonomia e controle.",
    motivadores: ["Desafios e metas ambiciosas", "Autonomia para decidir", "Resultados visíveis", "Sentir que está no controle"],
    sobPressao: ["Fica impaciente e direta demais", "Pode atropelar pessoas e processos", "Tende a tomar a decisão sozinha"],
    apresentarPlano: [
      "Comece reconhecendo conquistas e resultados recentes para ganhar atenção.",
      "Vá direto ao ponto: resultado esperado, lista curta de ações e prazo.",
      "Deixe claro o “o quê” e o limite, e dê autonomia no “como”.",
    ],
    darFeedback: [
      "Seja breve, direto e baseado em fatos e impacto.",
      "Abra com o resultado e termine com um próximo passo claro e uma data.",
      "Faça perguntas de “o quê” e “como” para que ela mesma chegue às soluções.",
    ],
    metas: ["Metas desafiadoras, com prazo e critérios de sucesso", "Entregar o resultado e a autoridade para decidir", "Evite detalhar etapas que ela pode definir sozinha"],
    acompanhamento: ["Check-ins curtos e frequentes (por exemplo, 15 minutos por semana)", "Foco em decisão e avanço, não em relatório"],
    reconhecer: ["Ligue o elogio a impacto e resultado", "Crédito público por entregas grandes"],
    evitar: ["Explicar demais ou rodear", "Microgerenciar", "Perguntas abertas sem opções", "Tirar a sensação de controle"],
    perguntas: ["O que é mais importante você alcançar aqui?", "O que você faria se a decisão fosse sua?", "Qual o próximo passo e até quando?"],
    acoesDeDesenvolvimento: ["Liderar um projeto com meta desafiadora", "Treinar escuta ativa e empatia", "Praticar delegar e pedir opinião antes de decidir"],
    atencao: "Pode assumir a condução da conversa e acabar “orientando o gestor”. Mantenha o combinado no foco.",
  },
  I: {
    rotulo: "Influência (I)",
    resumo: "Comunicativa, entusiasta e sociável; gosta de pessoas, reconhecimento e variedade.",
    motivadores: ["Reconhecimento e visibilidade", "Trabalhar com pessoas e em equipe", "Variedade e novas ideias", "Ambiente leve e colaborativo"],
    sobPressao: ["Fala mais e se dispersa", "Promete além do que consegue entregar", "Evita conflito e concorda para agradar"],
    apresentarPlano: [
      "Converse de forma animada e deixe a pessoa expressar o que pensa e sente.",
      "Mostre como o plano beneficia a pessoa e a equipe.",
      "Ajude a escolher poucas prioridades para as ideias virarem ação.",
    ],
    darFeedback: [
      "Reconheça primeiro o que está bom, com entusiasmo genuíno.",
      "Mantenha o foco no comportamento e em fatos, para a crítica não soar como rejeição pessoal.",
      "Pergunte o que, especificamente, ela fará, e registre por escrito.",
    ],
    metas: ["Metas ligadas a pessoas, parcerias e visibilidade", "Marcos curtos e frequentes", "Plano escrito simples e bem organizado (detalhes escapam com facilidade)"],
    acompanhamento: ["Contatos frequentes e conversados, não só por escrito", "Checklist visual para sustentar o foco"],
    reconhecer: ["Reconhecimento público e frequente", "Celebrar avanços com o time"],
    evitar: ["Comunicar só por escrito", "Programas muito estruturados e longos", "Críticas que soem como desaprovação pessoal", "Rotinas repetitivas sem variação"],
    perguntas: ["O que você já tem em mente para fazer isso acontecer?", "Quais dessas ideias você prioriza primeiro?", "Como vamos garantir que isso saia do papel?"],
    acoesDeDesenvolvimento: ["Tarefas de trabalho em equipe e networking", "Cursos de comunicação e persuasão", "Praticar organização, prazos e acompanhamento de detalhes"],
    atencao: "Um “sim” entusiasmado nem sempre vira entrega. Confirme prazos e responsabilidades por escrito.",
  },
  S: {
    rotulo: "Estabilidade (S)",
    resumo: "Paciente, leal e colaborativa; valoriza estabilidade, harmonia e confiança.",
    motivadores: ["Estabilidade e previsibilidade", "Harmonia e confiança na equipe", "Reconhecimento sincero da dedicação", "Entender o porquê das mudanças"],
    sobPressao: ["Fica quieta, recua e absorve", "Evita discordar abertamente e acumula", "Pode se sobrecarregar para não incomodar"],
    apresentarPlano: [
      "Compartilhe o plano com antecedência e explique o que vai acontecer, sem surpresas.",
      "Mostre por que ele importa e como se encaixa no cenário maior.",
      "Divida em passos graduais, num ritmo constante.",
    ],
    darFeedback: [
      "Faça com regularidade, num tom acolhedor e tranquilizador.",
      "Comece reconhecendo o que funciona e traga exemplos concretos.",
      "Ofereça retomar o assunto depois, para ela ter tempo de pensar.",
      "Não confunda um “sim” rápido com concordância: pergunte o que a preocupa.",
    ],
    metas: ["Responsabilidades claras e estáveis", "Ritmo constante e metas progressivas", "Explique a importância de cada etapa"],
    acompanhamento: ["1:1 consistentes, no mesmo ritmo e horário", "Pergunte ativamente como ela está se sentindo e se há sobrecarga"],
    reconhecer: ["Reconhecer confiabilidade e constância, de forma sincera e privada"],
    evitar: ["Mudanças bruscas sem preparo", "Pressão e pressa", "Exposição pública", "Interpretar silêncio como concordância"],
    perguntas: ["O que te preocupa nesse plano?", "O que ajudaria você a se sentir segura para avançar?", "Em que posso apoiar ou tirar peso agora?"],
    acoesDeDesenvolvimento: ["Treinamento para lidar com conflito e dizer não", "Preparação gradual para mudanças", "Assumir pequenas frentes de liderança com suporte"],
    atencao: "Sob estresse ela se cala. Crie espaço seguro para discordar e acompanhe sinais de sobrecarga.",
  },
  C: {
    rotulo: "Conformidade (C)",
    resumo: "Analítica, criteriosa e detalhista; busca precisão, qualidade e regras claras.",
    motivadores: ["Precisão e qualidade", "Clareza de expectativas e critérios", "Tempo para analisar", "Reconhecimento por trabalho bem feito e completo"],
    sobPressao: ["Fica excessivamente crítica e rígida", "Foca ainda mais em detalhes e regras", "Se isola ou trava na análise"],
    apresentarPlano: [
      "Apresente dados e evidências e envie a pauta e o material antes da conversa.",
      "Defina expectativas, padrões e critérios por escrito, com clareza.",
      "Dê tempo para analisar e deixe a pessoa detalhar a execução do plano.",
    ],
    darFeedback: [
      "Seja factual e específico, com exemplos; elogio ou crítica vaga soa incompleto.",
      "Evite apontar o erro de forma direta: isso ativa a defesa. Escolha bem as palavras.",
      "Peça que ela avalie o próprio desempenho e como melhoraria.",
      "Dê tempo para refletir e responder; pergunte que apoio precisa.",
    ],
    metas: ["Padrões de qualidade claros e mensuráveis", "Metas construídas a partir da autoavaliação dela", "Deixe-a estruturar o plano de execução"],
    acompanhamento: ["Pauta enviada antes e registro por escrito", "Ritmo deliberado e previsível, sem pressa"],
    reconhecer: ["Reconhecer precisão, qualidade e profundidade, citando detalhes específicos"],
    evitar: ["Pressa para decidir", "Críticas vagas ou sem base", "Mudar regras no meio do caminho", "Supor que ela não aguenta ritmo acelerado"],
    perguntas: ["Como você avalia seu desempenho nesse ponto?", "O que você melhoraria e como mediria?", "De que dados ou apoio você precisa para avançar?"],
    acoesDeDesenvolvimento: ["Treinamentos técnicos e especializados", "Participar da revisão e melhoria de processos", "Praticar decidir com informação suficiente e flexibilidade diante da ambiguidade"],
    atencao: "Pode reagir defensivamente a críticas. Foque em fatos e evite surpresas na conversa.",
  },
};

/** Ajuste de nuance conforme o perfil secundário. */
export const NUANCE_SECUNDARIO: Record<FatorDisc, string> = {
  D: "O traço secundário D reforça a busca por resultado e autonomia: seja objetivo e ofereça decisão sobre o “como”.",
  I: "O traço secundário I traz energia social: inclua conversa, reconhecimento e espaço para ela se expressar.",
  S: "O traço secundário S pede ritmo e previsibilidade: avise antes das mudanças e evite pressa.",
  C: "O traço secundário C pede clareza e fundamentos: leve dados, critérios e dê tempo para analisar.",
};

export const FONTES: { titulo: string; url: string }[] = [
  { titulo: "Witto — Como direcionar os PDIs por perfil comportamental", url: "https://www.witto.com.br/post/como-direcionar-os-pdis-por-perfil-comportamental" },
  { titulo: "Corporate Teams — 12 DiSC feedback strategies for managers", url: "https://www.corporateteams.com/12-disc-feedback-strategies-for-managers/" },
  { titulo: "The DISC Personality Test — How to adapt management styles", url: "https://www.thediscpersonalitytest.com/blog/how-to-adapt-management-styles-different-disc-profiles/" },
  { titulo: "DiSC Profiles 4U — Using DiSC assessments to coach your team", url: "https://www.discprofiles4u.com/blog/2024/using-disc-assessments-to-coach-your-team-effectively/" },
  { titulo: "TTI Success Insights — Each DISC type under pressure", url: "https://www.ttisi.com/blog/normal-moderate-extreme-each-disc-type-under-pressure/" },
  { titulo: "CIS Assessment — Como dar feedback eficaz com base no perfil DISC", url: "https://cisassessment.com/como-dar-feedback-eficaz-para-cada-pessoa/" },
];
