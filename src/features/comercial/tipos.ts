/** Uma célula com conteúdo ou cor de fundo (as demais ficam vazias). */
export interface CelulaComercial {
  r: number;
  c: number;
  /** Texto exibido (já formatado). */
  v?: string;
  /** Cor de fundo (#RRGGBB). */
  bg?: string;
}

export interface MesclagemComercial {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

/** Conteúdo de uma aba da planilha. */
export interface DadosAbaComercial {
  linhas: number;
  colunas: number;
  celulas: CelulaComercial[];
  mesclagens: MesclagemComercial[];
  /** Largura de cada coluna, em pixels. */
  larguras: number[];
  /** Linha do cabeçalho da tabela (fica fixa ao rolar), se encontrada. */
  cabecalho: number | null;
}

export interface AbaComercial {
  nome: string;
  ordem: number;
  dados: DadosAbaComercial;
  atualizado_em: string;
}

export interface InfoSincronizacao {
  sincronizado_em: string | null;
  origem: string | null;
  erro: string | null;
}

export const PLANILHA_ID =
  process.env.COMERCIAL_PLANILHA_ID ?? "1yWpvf733bZWuzrvmlwic7CtFSexjtPih0rdZNaWkXvg";

export const PLANILHA_URL = `https://docs.google.com/spreadsheets/d/${PLANILHA_ID}/edit`;
