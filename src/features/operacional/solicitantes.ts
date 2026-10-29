/**
 * Quem pode ser o "solicitante" de uma tarefa: as pessoas do organograma da Litoral Verde Operadora (outubro/2026).
 * Para atualizar (entrada, saída, mudança de cargo), edite esta lista.
 */
export interface Solicitante {
  nome: string;
  cargo: string;
}

const L = (nome: string, cargo: string): Solicitante => ({ nome, cargo });

export const SOLICITANTES: Solicitante[] = [
  // Conselho e diretoria
  L("Aldo Marra", "Diretor Administrativo"),
  L("Christian Marra", "Sócio-Fundador"),
  L("Fabian Azzali", "Diretor de Vendas e Comercial"),
  L("Marco Marra", "Diretor de Marketing"),
  // Financeiro, Administrativo e RH
  L("Raquel Sampaio", "Gerente Financeira e RH"),
  L("Viviane Ramos", "Analista Financeira Pleno"),
  L("Luiza Zanelatto", "Analista Dept. Pessoal"),
  L("Maria Luisa Golinelhi", "Analista Financeira"),
  L("Gabriel Lima", "Assistente Administrativo Pleno"),
  L("Bruna Nunes", "Assistente Financeira Pleno"),
  L("Rayane Gomes", "Auxiliar Administrativa"),
  L("Júlia Lima", "Auxiliar Financeira"),
  L("Danila Cabral", "Auxiliar de Serviços Gerais"),
  // Produtos e operações
  L("Carla Fogel", "Gerente de Produtos"),
  L("Ana Paula Queiroz", "Analista de Aéreo"),
  L("Vitória Barbosa", "Analista de Reservas"),
  L("Raul Salustiano", "Analista Comercial"),
  L("Arielle Macedo", "Analista Comercial"),
  L("Thais Valadares", "Analista de Operações"),
  L("Pamela Silva", "Auxiliar de Aéreo"),
  L("Nicoly de Sá", "Assistente de Operações"),
  L("Lorena Oliveira", "Assistente de SAC"),
  L("Cecília Goulart", "Assistente de SAC"),
  L("Flora Lima", "Estagiária Comercial"),
  L("Luiz Berredo", "Estagiário Internacional"),
  L("Carolina Marques", "Analista Comercial Internacional"),
  L("Antônia Carvalho", "Assistente de Operações Internacional"),
  // Vendas
  L("Thamara Castro", "Supervisora de Vendas"),
  L("Nathália Oliveira", "Coordenadora de Grupos"),
  L("Isabel Bianchi", "Auxiliar de Reservas"),
  L("Rafaela Macedo", "Agente de Viagem Nacional Pleno 2"),
  L("Juliana Rezende", "Agente de Viagem Nacional Pleno 2"),
  L("Estela Pitzer", "Agente de Viagem Nacional Pleno"),
  L("Michael Pissurno", "Agente de Viagem Nacional Pleno"),
  L("Helena Muller", "Agente de Viagem Nacional Pleno"),
  L("Tatiana Botelho", "Agente de Viagem Nacional Pleno"),
  L("Aline Walker", "Agente de Viagem Nacional Pleno"),
  L("Eduarda Meira", "Agente de Viagem Nacional Pleno"),
  L("Renata Wendling", "Agente de Viagem Nacional Pleno"),
  L("Roberta Ramos", "Agente de Viagem Nacional Pleno"),
  L("Priscilla Britto", "Agente de Viagem Nacional Pleno"),
  L("Karen Passos", "Agente de Viagem Nacional Júnior 2"),
  L("Tamires Fraga", "Agente de Viagem Nacional Júnior 2"),
  L("Beatriz Botelho", "Agente de Viagem Nacional Júnior 3"),
  L("Debora Mello", "Agente de SDR"),
  L("Gabriela Tolezano", "Agente de SDR"),
  L("Rodrigo Ormonde", "Agente de SDR"),
  L("Glaucia Domingues", "Agente de SDR"),
  L("Isabela Costa", "Agente de SDR"),
  L("Sophia Pereira", "Agente de SDR"),
  L("Simone Carvalho", "Promotora Interna de Agências"),
  L("Bernardo Machado", "Estagiário de Agências"),
  // T.I. e Marketing
  L("Jonas Almeida", "Gerente Sênior de T.I. e Marketing"),
  L("Raphael Neves", "Analista de Suporte Técnico"),
  L("Fabiana Silva", "Analista de Negócios"),
  L("Uiliam Santos", "Assistente de Sistemas"),
  L("George Gamarano", "Auxiliar de Suporte Técnico"),
  L("Thiago Leal", "Supervisor de Marketing"),
  L("Gustavo Monken", "Assistente de Marketing"),
  L("Shayene Rempto", "Auxiliar de Marketing"),
  L("Cesar Ricart", "Estagiário de Marketing"),
];

/** Nomes em ordem alfabética, para a lista de escolha. */
export const SOLICITANTES_ORDENADOS = [...SOLICITANTES].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
