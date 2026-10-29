/**
 * Quem pode ser o "solicitante" de uma tarefa: as pessoas do organograma da Litoral Verde Operadora (outubro/2026).
 * Para atualizar (entrada, saída, mudança de cargo), edite esta lista.
 */
export interface Solicitante {
  nome: string;
  cargo: string;
  /** Área do organograma (Diretoria, Vendas, Produtos e operações…) ou "Reuniões". */
  area: string;
}

const L = (nome: string, cargo: string, area: string): Solicitante => ({ nome, cargo, area });

/** Reuniões de onde também surgem pedidos (aparecem no topo da lista, na ordem em que acontecem no dia a dia). */
export const REUNIOES: Solicitante[] = [
  L("Reunião de vendas", "", "Reuniões"),
  L("Reunião de Marketing", "", "Reuniões"),
  L("Reunião V4", "", "Reuniões"),
  L("Reunião MKT <> Grupos", "", "Reuniões"),
  L("Reunião MKT <> Inter", "", "Reuniões"),
  L("Reunião MKT <> COM", "", "Reuniões"),
];

export const SOLICITANTES: Solicitante[] = [
  // Conselho e diretoria
  L("Aldo Marra", "Diretor Administrativo", "Diretoria"),
  L("Christian Marra", "Sócio-Fundador", "Diretoria"),
  L("Fabian Azzali", "Diretor de Vendas e Comercial", "Diretoria"),
  L("Marco Marra", "Diretor de Marketing", "Diretoria"),
  // Financeiro, Administrativo e RH
  L("Raquel Sampaio", "Gerente Financeira e RH", "Financeiro e RH"),
  L("Viviane Ramos", "Analista Financeira Pleno", "Financeiro e RH"),
  L("Luiza Zanelatto", "Analista Dept. Pessoal", "Financeiro e RH"),
  L("Maria Luisa Golinelhi", "Analista Financeira", "Financeiro e RH"),
  L("Gabriel Lima", "Assistente Administrativo Pleno", "Financeiro e RH"),
  L("Bruna Nunes", "Assistente Financeira Pleno", "Financeiro e RH"),
  L("Rayane Gomes", "Auxiliar Administrativa", "Financeiro e RH"),
  L("Júlia Lima", "Auxiliar Financeira", "Financeiro e RH"),
  L("Danila Cabral", "Auxiliar de Serviços Gerais", "Financeiro e RH"),
  // Produtos e operações
  L("Carla Fogel", "Gerente de Produtos", "Produtos e operações"),
  L("Ana Paula Queiroz", "Analista de Aéreo", "Produtos e operações"),
  L("Vitória Barbosa", "Analista de Reservas", "Produtos e operações"),
  L("Raul Salustiano", "Analista Comercial", "Produtos e operações"),
  L("Arielle Macedo", "Analista Comercial", "Produtos e operações"),
  L("Thais Valadares", "Analista de Operações", "Produtos e operações"),
  L("Pamela Silva", "Auxiliar de Aéreo", "Produtos e operações"),
  L("Nicoly de Sá", "Assistente de Operações", "Produtos e operações"),
  L("Lorena Oliveira", "Assistente de SAC", "Produtos e operações"),
  L("Cecília Goulart", "Assistente de SAC", "Produtos e operações"),
  L("Flora Lima", "Estagiária Comercial", "Produtos e operações"),
  L("Luiz Berredo", "Estagiário Internacional", "Produtos e operações"),
  L("Carolina Marques", "Analista Comercial Internacional", "Produtos e operações"),
  L("Antônia Carvalho", "Assistente de Operações Internacional", "Produtos e operações"),
  // Vendas
  L("Thamara Castro", "Supervisora de Vendas", "Vendas"),
  L("Nathália Oliveira", "Coordenadora de Grupos", "Vendas"),
  L("Isabel Bianchi", "Auxiliar de Reservas", "Vendas"),
  L("Rafaela Macedo", "Agente de Viagem Nacional Pleno 2", "Vendas"),
  L("Juliana Rezende", "Agente de Viagem Nacional Pleno 2", "Vendas"),
  L("Estela Pitzer", "Agente de Viagem Nacional Pleno", "Vendas"),
  L("Michael Pissurno", "Agente de Viagem Nacional Pleno", "Vendas"),
  L("Helena Muller", "Agente de Viagem Nacional Pleno", "Vendas"),
  L("Tatiana Botelho", "Agente de Viagem Nacional Pleno", "Vendas"),
  L("Aline Walker", "Agente de Viagem Nacional Pleno", "Vendas"),
  L("Eduarda Meira", "Agente de Viagem Nacional Pleno", "Vendas"),
  L("Renata Wendling", "Agente de Viagem Nacional Pleno", "Vendas"),
  L("Roberta Ramos", "Agente de Viagem Nacional Pleno", "Vendas"),
  L("Priscilla Britto", "Agente de Viagem Nacional Pleno", "Vendas"),
  L("Karen Passos", "Agente de Viagem Nacional Júnior 2", "Vendas"),
  L("Tamires Fraga", "Agente de Viagem Nacional Júnior 2", "Vendas"),
  L("Beatriz Botelho", "Agente de Viagem Nacional Júnior 3", "Vendas"),
  L("Debora Mello", "Agente de SDR", "Vendas"),
  L("Gabriela Tolezano", "Agente de SDR", "Vendas"),
  L("Rodrigo Ormonde", "Agente de SDR", "Vendas"),
  L("Glaucia Domingues", "Agente de SDR", "Vendas"),
  L("Isabela Costa", "Agente de SDR", "Vendas"),
  L("Sophia Pereira", "Agente de SDR", "Vendas"),
  L("Simone Carvalho", "Promotora Interna de Agências", "Vendas"),
  L("Bernardo Machado", "Estagiário de Agências", "Vendas"),
  // T.I. e Marketing
  L("Jonas Almeida", "Gerente Sênior de T.I. e Marketing", "T.I. e Marketing"),
  L("Raphael Neves", "Analista de Suporte Técnico", "T.I. e Marketing"),
  L("Fabiana Silva", "Analista de Negócios", "T.I. e Marketing"),
  L("Uiliam Santos", "Assistente de Sistemas", "T.I. e Marketing"),
  L("George Gamarano", "Auxiliar de Suporte Técnico", "T.I. e Marketing"),
  L("Thiago Leal", "Supervisor de Marketing", "T.I. e Marketing"),
  L("Gustavo Monken", "Assistente de Marketing", "T.I. e Marketing"),
  L("Shayene Rempto", "Auxiliar de Marketing", "T.I. e Marketing"),
  L("Cesar Ricart", "Estagiário de Marketing", "T.I. e Marketing"),
];

/** Lista de escolha: primeiro as reuniões, depois as pessoas em ordem alfabética. */
export const SOLICITANTES_ORDENADOS = [...REUNIOES, ...[...SOLICITANTES].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))];

/** Área do solicitante no organograma; "Fora do organograma" se o nome não estiver na lista. */
export const areaDoSolicitante = (nome: string): string => [...REUNIOES, ...SOLICITANTES].find((s) => s.nome === nome)?.area ?? "Fora do organograma";
