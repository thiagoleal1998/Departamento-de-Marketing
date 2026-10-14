/**
 * Definição dos cadastros simples do Operacional (landing pages, conteúdos
 * do site e controle de conteúdo das LPs). Compartilhado entre servidor e
 * client — não coloque segredos aqui.
 */
export type TipoCampo =
  | "texto"
  | "textarea"
  | "select"
  | "data"
  | "url"
  | "pessoa"
  | "lp";

export interface CampoDef {
  name: string;
  label: string;
  tipo: TipoCampo;
  obrigatorio?: boolean;
  opcoes?: { value: string; label: string }[];
  /** Aparece como coluna na lista. */
  lista?: boolean;
  placeholder?: string;
}

export interface CadastroDef {
  tabela: string;
  rota: string;
  /** Mostra "atualizado por / em" (usa alterado_por e updated_at). */
  rastreio?: boolean;
  campos: CampoDef[];
}

export type CadastroChave = "landing_pages" | "conteudos_site" | "lp_conteudos";

export const CADASTROS: Record<CadastroChave, CadastroDef> = {
  landing_pages: {
    tabela: "landing_pages",
    rota: "/operacional/landing-pages",
    campos: [
      { name: "nome", label: "Nome", tipo: "texto", obrigatorio: true, lista: true },
      { name: "url", label: "URL", tipo: "url", lista: true, placeholder: "https://" },
      { name: "objetivo", label: "Objetivo / campanha", tipo: "texto", lista: true },
      { name: "responsavel_id", label: "Responsável", tipo: "pessoa", lista: true },
      {
        name: "status",
        label: "Status",
        tipo: "select",
        lista: true,
        opcoes: [
          { value: "rascunho", label: "Rascunho" },
          { value: "no_ar", label: "No ar" },
          { value: "pausada", label: "Pausada" },
          { value: "encerrada", label: "Encerrada" },
        ],
      },
      { name: "observacoes", label: "Observações", tipo: "textarea" },
    ],
  },
  conteudos_site: {
    tabela: "conteudos_site",
    rota: "/operacional/conteudos-site",
    campos: [
      { name: "titulo", label: "Título", tipo: "texto", obrigatorio: true, lista: true },
      { name: "pagina_url", label: "Página / URL do site", tipo: "url", lista: true, placeholder: "https://" },
      {
        name: "tipo",
        label: "Tipo",
        tipo: "select",
        lista: true,
        opcoes: [
          { value: "texto", label: "Texto" },
          { value: "banner", label: "Banner" },
          { value: "blog", label: "Blog" },
          { value: "imagem", label: "Imagem" },
          { value: "outro", label: "Outro" },
        ],
      },
      { name: "responsavel_id", label: "Responsável", tipo: "pessoa", lista: true },
      {
        name: "status",
        label: "Status",
        tipo: "select",
        lista: true,
        opcoes: [
          { value: "a_fazer", label: "A fazer" },
          { value: "em_producao", label: "Em produção" },
          { value: "em_revisao", label: "Em revisão" },
          { value: "publicado", label: "Publicado" },
        ],
      },
      { name: "prazo", label: "Prazo", tipo: "data", lista: true },
      { name: "observacoes", label: "Observações", tipo: "textarea" },
    ],
  },
  lp_conteudos: {
    tabela: "lp_conteudos",
    rota: "/operacional/controle-lps",
    rastreio: true,
    campos: [
      { name: "landing_page_id", label: "Landing page", tipo: "lp", obrigatorio: true, lista: true },
      {
        name: "elemento",
        label: "Elemento",
        tipo: "texto",
        obrigatorio: true,
        lista: true,
        placeholder: "Ex.: Título principal, oferta, imagem do topo",
      },
      { name: "conteudo", label: "O que está no ar", tipo: "textarea", lista: true },
      { name: "versao", label: "Versão", tipo: "texto", lista: true, placeholder: "Ex.: v3" },
    ],
  },
};
