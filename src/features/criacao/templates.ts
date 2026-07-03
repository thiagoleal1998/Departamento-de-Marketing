/**
 * Modelos de peça pré-definidos. Nesta etapa a geração é simulada
 * (preview interno). A estrutura está pronta para, no futuro, chamar a
 * Canva Connect API a partir de cada template.
 */
export interface CampoTemplate {
  chave: string;
  label: string;
  placeholder?: string;
  tipo?: "text" | "textarea";
}

export interface TemplatePeca {
  id: string;
  nome: string;
  categoria: string;
  canal: string;
  objetivo: string;
  descricao: string;
  /** Gradiente de fundo do preview (Tailwind). */
  tema: string;
  campos: CampoTemplate[];
}

const CAMPOS_PADRAO: CampoTemplate[] = [
  { chave: "titulo", label: "Título", placeholder: "Chamada principal" },
  { chave: "subtitulo", label: "Subtítulo", placeholder: "Apoio ao título" },
  { chave: "produto", label: "Produto / Destino", placeholder: "Ex.: Plano Premium" },
  { chave: "preco", label: "Preço", placeholder: "Ex.: R$ 99/mês" },
  { chave: "chamada", label: "Chamada", placeholder: "Frase de impacto" },
  { chave: "cta", label: "CTA (botão)", placeholder: "Ex.: Comprar agora" },
  { chave: "imagem", label: "Imagem (URL)", placeholder: "https://..." },
  {
    chave: "observacoes",
    label: "Observações",
    placeholder: "Notas para o time",
    tipo: "textarea",
  },
];

export const TEMPLATES: TemplatePeca[] = [
  {
    id: "lamina-produto",
    nome: "Lâmina de Produto",
    categoria: "Vendas",
    canal: "E-mail marketing",
    objetivo: "Conversão",
    descricao: "Apresentação de produto com preço e CTA.",
    tema: "from-indigo-500 to-violet-600",
    campos: CAMPOS_PADRAO,
  },
  {
    id: "post-social",
    nome: "Post para Redes Sociais",
    categoria: "Conteúdo",
    canal: "Instagram",
    objetivo: "Engajamento",
    descricao: "Peça quadrada para feed com chamada e CTA.",
    tema: "from-rose-500 to-orange-500",
    campos: CAMPOS_PADRAO,
  },
  {
    id: "banner-promo",
    nome: "Banner Promocional",
    categoria: "Campanha",
    canal: "Site",
    objetivo: "Promoção",
    descricao: "Banner de destaque com oferta e botão.",
    tema: "from-emerald-500 to-teal-600",
    campos: CAMPOS_PADRAO,
  },
  {
    id: "apresentacao",
    nome: "Slide de Apresentação",
    categoria: "Institucional",
    canal: "Apresentações",
    objetivo: "Comunicação",
    descricao: "Slide de abertura com título e subtítulo.",
    tema: "from-sky-500 to-blue-600",
    campos: CAMPOS_PADRAO,
  },
];
