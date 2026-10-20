export interface DocumentoCentral {
  id: string;
  nome: string;
  categoria: string;
  url: string | null;
  notion_url: string | null;
}

export const CATEGORIAS_DOCUMENTO = ["Documentos", "Controle", "Modelos", "Descrição da VT", "Outros"];
