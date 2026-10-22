export const BUCKET_NOTAS = "estoque-notas";
export const MAX_BYTES_NOTA = 15 * 1024 * 1024;
export const TIPOS_NOTA = ["application/pdf", "image/png", "image/jpeg", "image/webp", "text/xml", "application/xml"];
export const ACCEPT_NOTA = ".pdf,.png,.jpg,.jpeg,.webp,.xml";

export interface Fornecedor {
  id: string;
  nome: string;
  contato_nome: string | null;
  telefone: string | null;
  email: string | null;
  site: string | null;
  cnpj: string | null;
  observacoes: string | null;
}

export interface DadosFornecedor {
  nome: string;
  contato_nome: string;
  telefone: string;
  email: string;
  site: string;
  cnpj: string;
  observacoes: string;
}

export interface Cotacao {
  id: string;
  item_id: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  data_cotacao: string; // yyyy-mm-dd
  valor_unitario: number;
  quantidade: number | null;
  prazo_entrega_dias: number | null;
  condicoes: string | null;
  observacao: string | null;
  contratado: boolean;
  data_compra: string | null;
  valor_total_pago: number | null;
  nota_fiscal_numero: string | null;
  nota_fiscal_nome: string | null;
  nota_fiscal_url: string | null;
}

export interface DadosCotacao {
  fornecedor_id: string;
  data_cotacao: string;
  valor_unitario: string; // aceita "12,50"
  quantidade: string;
  prazo_entrega_dias: string;
  condicoes: string;
  observacao: string;
  contratado: boolean;
  data_compra: string;
  valor_total_pago: string;
  nota_fiscal_numero: string;
  nota_fiscal_caminho: string | null;
  nota_fiscal_nome: string | null;
}

/** "12,50" / "1.234,56" / "12.5" → número (ou null se vazio/inválido). */
export function lerValor(v: string): number | null {
  const t = v.trim().replace(/[R$\s]/g, "");
  if (!t) return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : null;
}

export const moeda = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const dataBr = (iso: string | null) => (iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "—");
