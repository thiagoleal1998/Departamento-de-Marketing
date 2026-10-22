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
  /** Valor inicial ao criar um registro (selects). */
  padrao?: string;
}

export interface CadastroDef {
  tabela: string;
  rota: string;
  /** Mostra "atualizado por / em" (usa alterado_por e updated_at). */
  rastreio?: boolean;
  campos: CampoDef[];
}

export type CadastroChave = "landing_pages" | "conteudos_site" | "lp_conteudos" | "divulgacao_condicoes";

export const CADASTROS: Record<CadastroChave, CadastroDef> = {
  landing_pages: {
    tabela: "landing_pages",
    rota: "/operacional/landing-pages",
    campos: [
      { name: "nome", label: "Produto", tipo: "texto", obrigatorio: true, lista: true },
      {
        name: "grupo",
        label: "Grupo",
        tipo: "select",
        lista: true,
        obrigatorio: true,
        padrao: "novas",
        opcoes: [
          { value: "novas", label: "Novas LPs" },
          { value: "b2c", label: "B2C" },
          { value: "v4", label: "LPs V4" },
          { value: "antigas", label: "LPs antigas" },
          { value: "epic", label: "Epic Pages (descontinuado)" },
          { value: "feriados", label: "Feriados" },
        ],
      },
      {
        name: "tipo_pagina",
        label: "Tipo de página",
        tipo: "select",
        obrigatorio: true,
        padrao: "produto",
        opcoes: [
          { value: "produto", label: "Produto" },
          { value: "destino", label: "Destino" },
          { value: "tematica", label: "Temática" },
        ],
      },
      {
        name: "status_patrocinio",
        label: "Status de patrocínio",
        tipo: "select",
        lista: true,
        padrao: "ativo",
        opcoes: [
          { value: "ativo", label: "Ativo" },
          { value: "inativo", label: "Inativo" },
          { value: "cancelado", label: "Cancelado" },
          { value: "desativado", label: "Desativado" },
        ],
      },
      {
        name: "destino",
        label: "Destino",
        tipo: "select",
        lista: true,
        opcoes: [
          { value: "Nacional", label: "Nacional" },
          { value: "Internacional", label: "Internacional" },
        ],
      },
      { name: "continente", label: "Continente", tipo: "texto" },
      { name: "pais", label: "País", tipo: "texto" },
      { name: "regiao", label: "Região", tipo: "texto" },
      { name: "estado", label: "Estado", tipo: "texto", lista: true },
      { name: "cidade", label: "Cidade", tipo: "texto" },
      { name: "dominio", label: "Domínio da URL", tipo: "texto" },
      { name: "url", label: "URL", tipo: "url", lista: true, placeholder: "https://" },
      { name: "codigo_reduzido", label: "Código reduzido", tipo: "texto" },
      { name: "codigo_feriado", label: "Código feriado", tipo: "texto" },
      {
        name: "banner_obrigatorio",
        label: "Banner obrigatório?",
        tipo: "select",
        opcoes: [
          { value: "Sim", label: "Sim" },
          { value: "Não", label: "Não" },
        ],
      },
      {
        name: "tem_link_casamento",
        label: "Tem link de casamento?",
        tipo: "select",
        opcoes: [
          { value: "Sim", label: "Sim" },
          { value: "Não", label: "Não" },
        ],
      },
      { name: "link_casamento", label: "Link casamento", tipo: "url", placeholder: "https://" },
      { name: "canal", label: "Canal", tipo: "texto", lista: true, placeholder: "Ex.: Google, Youtube" },
      {
        name: "tag_adm_mkt",
        label: "TAG no ADM MKT",
        tipo: "select",
        opcoes: [
          { value: "Sim", label: "Sim" },
          { value: "Não", label: "Não" },
        ],
      },
      {
        name: "banner_no_ar",
        label: "Banner no ar (Comercial)",
        tipo: "select",
        opcoes: [
          { value: "Sim", label: "Sim" },
          { value: "Não", label: "Não" },
        ],
      },
      { name: "objetivo", label: "Objetivo / campanha", tipo: "texto" },
      { name: "responsavel_id", label: "Responsável", tipo: "pessoa" },
      { name: "observacoes", label: "Observações", tipo: "textarea" },
    ],
  },
  conteudos_site: {
    tabela: "conteudos_site",
    rota: "/operacional/conteudos-site",
    campos: [
      { name: "titulo", label: "Nome", tipo: "texto", obrigatorio: true, lista: true },
      {
        name: "categoria",
        label: "Tipo de conteúdo",
        tipo: "select",
        lista: true,
        opcoes: [
          { value: "Destino", label: "Destino" },
          { value: "Resort", label: "Resort" },
          { value: "Hotel", label: "Hotel" },
          { value: "Hotéis em Portugal", label: "Hotéis em Portugal" },
          { value: "Capitais pelo Mundo", label: "Capitais pelo Mundo" },
          { value: "Circuitos", label: "Circuitos" },
          { value: "Casamento em Resort", label: "Casamento em Resort" },
          { value: "Grupos e Eventos", label: "Grupos e Eventos" },
          { value: "Viagens Exóticas", label: "Viagens Exóticas" },
          { value: "Redes corporativas", label: "Redes corporativas" },
          { value: "LV Magazine", label: "LV Magazine" },
        ],
      },
      {
        name: "estrelas",
        label: "Estrelas",
        tipo: "select",
        lista: true,
        opcoes: [
          { value: "Não se aplica", label: "Não se aplica" },
          { value: "3 Estrela", label: "3 estrelas" },
          { value: "3.5 Estrela", label: "3,5 estrelas" },
          { value: "4 Estrela", label: "4 estrelas" },
          { value: "4.5 Estrela", label: "4,5 estrelas" },
          { value: "5 Estrela", label: "5 estrelas" },
        ],
      },
      {
        name: "abrangencia",
        label: "Produto",
        tipo: "select",
        lista: true,
        opcoes: [
          { value: "Nacional", label: "Nacional" },
          { value: "Internacional", label: "Internacional" },
          { value: "Não se aplica", label: "Não se aplica" },
        ],
      },
      { name: "pagina_url", label: "URL no site", tipo: "url", lista: true, placeholder: "https://" },
      {
        name: "status",
        label: "Status",
        tipo: "select",
        lista: true,
        padrao: "publicado",
        opcoes: [
          { value: "a_fazer", label: "A fazer" },
          { value: "em_producao", label: "Em produção" },
          { value: "em_revisao", label: "Em revisão" },
          { value: "publicado", label: "Publicado" },
        ],
      },
      { name: "responsavel_id", label: "Responsável", tipo: "pessoa" },
      { name: "prazo", label: "Prazo", tipo: "data" },
      { name: "observacoes", label: "Observações", tipo: "textarea" },
    ],
  },
  divulgacao_condicoes: {
    tabela: "divulgacao_condicoes",
    rota: "/operacional/divulgacao",
    campos: [
      { name: "hotel", label: "Hotel", tipo: "texto", obrigatorio: true, lista: true },
      { name: "periodo_venda", label: "Período de venda", tipo: "texto", lista: true, placeholder: "Ex.: 15 a 21/03" },
      { name: "periodo_viagem", label: "Período de viagem", tipo: "texto", lista: true, placeholder: "Ex.: 15/03 a 31/08" },
      { name: "condicao", label: "Condição", tipo: "textarea", lista: true },
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
