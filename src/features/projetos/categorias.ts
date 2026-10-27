export type CategoriaProjeto =
  | "eventos"
  | "feiras"
  | "famtour"
  | "projetos_marketing"
  | "vts";

export interface CategoriaMeta {
  valor: CategoriaProjeto;
  /** Trecho da URL: /projetos/categoria/<slug> */
  slug: string;
  label: string;
  descricao: string;
  /** Textos que mudam com a categoria (botão, título e aviso de lista vazia). */
  textos: {
    novo: string; // "Novo famtour"
    nenhum: string; // "Nenhum famtour ainda"
    criar: string; // "Crie um famtour…"
    nome: string; // "Nome do famtour"
    exemplo: string; // exemplo do campo de nome
    botaoCriar: string; // "Criar famtour"
  };
}

export const CATEGORIAS: CategoriaMeta[] = [
  {
    valor: "eventos",
    slug: "eventos",
    label: "Eventos",
    descricao: "Eventos, feiras e ações presenciais organizados por etapas.",
    textos: { novo: "Novo evento", nenhum: "Nenhum evento ainda", criar: "Crie um evento", nome: "Nome do evento", exemplo: "Ex.: Workshop com agentes de viagens", botaoCriar: "Criar evento" },
  },
  {
    valor: "feiras",
    slug: "feiras",
    label: "Feira",
    descricao: "Feiras e exposições do setor, com stand, brindes e logística.",
    textos: { novo: "Nova feira", nenhum: "Nenhuma feira ainda", criar: "Crie uma feira", nome: "Nome da feira", exemplo: "Ex.: Feira de Turismo 2026", botaoCriar: "Criar feira" },
  },
  {
    valor: "famtour",
    slug: "famtour",
    label: "Famtour",
    descricao: "Viagens de familiarização com agentes e parceiros.",
    textos: { novo: "Novo famtour", nenhum: "Nenhum famtour ainda", criar: "Crie um famtour", nome: "Nome do famtour", exemplo: "Ex.: Famtour Costa do Sauípe", botaoCriar: "Criar famtour" },
  },
  {
    valor: "projetos_marketing",
    slug: "projetos-de-marketing",
    label: "Projetos de Marketing",
    descricao: "Projetos e campanhas maiores do departamento.",
    textos: { novo: "Novo projeto", nenhum: "Nenhum projeto ainda", criar: "Crie um projeto", nome: "Nome do projeto", exemplo: "Ex.: Campanha de Black November", botaoCriar: "Criar projeto" },
  },
  {
    valor: "vts",
    slug: "vts",
    label: "VT's",
    descricao: "Produção de vídeos e VTs.",
    textos: { novo: "Novo VT", nenhum: "Nenhum VT ainda", criar: "Crie um VT", nome: "Nome do VT", exemplo: "Ex.: VT Reveillon 2027", botaoCriar: "Criar VT" },
  },
];

/** Textos genéricos, para quando não há categoria (lista geral de projetos). */
export const TEXTOS_PROJETO: CategoriaMeta["textos"] = {
  novo: "Novo projeto",
  nenhum: "Nenhum projeto ainda",
  criar: "Crie um projeto",
  nome: "Nome do projeto",
  exemplo: "Ex.: Feira de Turismo 2026",
  botaoCriar: "Criar projeto",
};

export const categoriaPorSlug = (slug: string) =>
  CATEGORIAS.find((c) => c.slug === slug);

export const categoriaPorValor = (valor: string) =>
  CATEGORIAS.find((c) => c.valor === valor);
