/** Uma linha de um campo do produto (com a cor da célula, quando houver). */
export interface LinhaCampo {
  t: string;
  bg?: string;
}

export interface CampoProduto {
  rotulo: string;
  linhas: LinhaCampo[];
}

/** Um produto (hotel) da planilha, com todos os seus campos. */
export interface ProdutoComercial {
  chave: string;
  secao: string;
  nome: string;
  ordem: number;
  /** Marcação pela cor do nome, conforme a legenda (ex.: "Produtos que temos acordo"). */
  tag: string | null;
  tagCor: string | null;
  campos: CampoProduto[];
}

export interface MudancaCampo {
  campo: string;
  antes: string[];
  depois: string[];
}

export interface AlteracaoComercial {
  id: string;
  chave: string;
  secao: string;
  nome: string;
  tipo: "novo" | "alterado" | "removido";
  mudancas: MudancaCampo[];
  detectado_em: string;
}

export interface InfoSincronizacao {
  sincronizado_em: string | null;
  origem: string | null;
  erro: string | null;
}

export const PLANILHA_ID =
  process.env.COMERCIAL_PLANILHA_ID ?? "1yWpvf733bZWuzrvmlwic7CtFSexjtPih0rdZNaWkXvg";

export const PLANILHA_URL = `https://docs.google.com/spreadsheets/d/${PLANILHA_ID}/edit`;

/** Por quantos dias um produto alterado fica em destaque. */
export const DIAS_DESTAQUE = 7;
