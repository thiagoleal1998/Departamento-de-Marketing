export type CategoriaProjeto =
  | "eventos"
  | "famtour"
  | "projetos_marketing"
  | "vts";

export interface CategoriaMeta {
  valor: CategoriaProjeto;
  /** Trecho da URL: /projetos/categoria/<slug> */
  slug: string;
  label: string;
  descricao: string;
}

export const CATEGORIAS: CategoriaMeta[] = [
  {
    valor: "eventos",
    slug: "eventos",
    label: "Eventos",
    descricao: "Eventos, feiras e ações presenciais organizados por etapas.",
  },
  {
    valor: "famtour",
    slug: "famtour",
    label: "Famtour",
    descricao: "Viagens de familiarização com agentes e parceiros.",
  },
  {
    valor: "projetos_marketing",
    slug: "projetos-de-marketing",
    label: "Projetos de Marketing",
    descricao: "Projetos e campanhas maiores do departamento.",
  },
  {
    valor: "vts",
    slug: "vts",
    label: "VT's",
    descricao: "Produção de vídeos e VTs.",
  },
];

export const categoriaPorSlug = (slug: string) =>
  CATEGORIAS.find((c) => c.slug === slug);

export const categoriaPorValor = (valor: string) =>
  CATEGORIAS.find((c) => c.valor === valor);
