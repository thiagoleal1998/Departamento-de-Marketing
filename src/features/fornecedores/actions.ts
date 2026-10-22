"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import {
  BUCKET_NOTAS,
  MAX_BYTES_NOTA,
  TIPOS_NOTA,
  lerValor,
  type Cotacao,
  type DadosCotacao,
  type DadosFornecedor,
  type Fornecedor,
} from "./tipos";

type Resultado = { ok?: boolean; erro?: string };
const MIGRACAO = "Fornecedores e cotações ainda não foram ativados no banco (migration 0063).";
const semTabela = (c?: string) => c === "42P01" || c === "PGRST205";
const ehData = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

async function exigirLideranca() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, erro: "Sessão expirada. Entre novamente." };
  const { data: eu } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const papel = (eu as { role: string } | null)?.role;
  if (papel !== "gerente" && papel !== "lider") return { supabase, user, erro: "Só a liderança acessa fornecedores e cotações." };
  return { supabase, user, erro: null as string | null };
}

const nuloSeVazio = (v: string, max = 300) => v.trim().slice(0, max) || null;

// ---- Fornecedores ----------------------------------------------------------

export async function listarFornecedores(): Promise<{ itens: Fornecedor[]; indisponivel?: boolean; erro?: string }> {
  const { supabase, erro } = await exigirLideranca();
  if (erro) return { itens: [], erro };
  const { data, error } = await supabase
    .from("fornecedores")
    .select("id, nome, contato_nome, telefone, email, site, cnpj, observacoes")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) return { itens: [], indisponivel: semTabela(error.code) };
  return { itens: (data ?? []) as Fornecedor[] };
}

export async function salvarFornecedor(id: string | null, d: DadosFornecedor): Promise<Resultado & { id?: string }> {
  const { supabase, user, erro } = await exigirLideranca();
  if (erro || !user) return { erro: erro ?? "Sessão expirada." };
  const nome = d.nome.trim().slice(0, 160);
  if (!nome) return { erro: "Informe o nome do fornecedor." };
  const site = nuloSeVazio(d.site, 300);
  if (site && !/^https?:\/\//i.test(site)) return { erro: "O site deve começar com http:// ou https://." };

  const dados = {
    nome,
    contato_nome: nuloSeVazio(d.contato_nome, 160),
    telefone: nuloSeVazio(d.telefone, 40),
    email: nuloSeVazio(d.email, 160),
    site,
    cnpj: nuloSeVazio(d.cnpj, 24),
    observacoes: nuloSeVazio(d.observacoes, 1000),
  };
  const q = id
    ? supabase.from("fornecedores").update(dados).eq("id", id).select("id")
    : supabase.from("fornecedores").insert({ ...dados, criado_por: user.id }).select("id");
  const { data, error } = await q;
  if (error || !data || data.length === 0) return { erro: semTabela(error?.code) ? MIGRACAO : "Não foi possível salvar o fornecedor." };
  revalidatePath("/estoque");
  return { ok: true, id: (data[0] as { id: string }).id };
}

export async function excluirFornecedor(id: string): Promise<Resultado> {
  const { supabase, erro } = await exigirLideranca();
  if (erro) return { erro };
  const { count } = await supabase.from("estoque_cotacoes").select("id", { count: "exact", head: true }).eq("fornecedor_id", id);
  if ((count ?? 0) > 0) {
    // Tem histórico de cotações: só inativa, para não perder preços e notas.
    const { error } = await supabase.from("fornecedores").update({ ativo: false }).eq("id", id);
    if (error) return { erro: "Não foi possível remover o fornecedor." };
  } else {
    const { error } = await supabase.from("fornecedores").delete().eq("id", id);
    if (error) return { erro: "Não foi possível remover o fornecedor." };
  }
  revalidatePath("/estoque");
  return { ok: true };
}

// ---- Cotações e compras ----------------------------------------------------

type LinhaCotacao = {
  id: string;
  item_id: string;
  fornecedor_id: string;
  data_cotacao: string;
  valor_unitario: number | string;
  quantidade: number | null;
  prazo_entrega_dias: number | null;
  condicoes: string | null;
  observacao: string | null;
  contratado: boolean;
  data_compra: string | null;
  valor_total_pago: number | string | null;
  nota_fiscal_numero: string | null;
  nota_fiscal_caminho: string | null;
  nota_fiscal_nome: string | null;
};

async function montarCotacoes(linhas: LinhaCotacao[], nomes: Map<string, string>): Promise<Cotacao[]> {
  const urls = new Map<string, string>();
  const caminhos = linhas.map((l) => l.nota_fiscal_caminho).filter((c): c is string => !!c);
  if (caminhos.length > 0 && servicoDisponivel()) {
    const { data } = await criarClienteAdmin().storage.from(BUCKET_NOTAS).createSignedUrls(caminhos, 3600);
    for (const s of data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return linhas.map((l) => ({
    id: l.id,
    item_id: l.item_id,
    fornecedor_id: l.fornecedor_id,
    fornecedor_nome: nomes.get(l.fornecedor_id) ?? "—",
    data_cotacao: l.data_cotacao,
    valor_unitario: Number(l.valor_unitario),
    quantidade: l.quantidade,
    prazo_entrega_dias: l.prazo_entrega_dias,
    condicoes: l.condicoes,
    observacao: l.observacao,
    contratado: l.contratado,
    data_compra: l.data_compra,
    valor_total_pago: l.valor_total_pago === null ? null : Number(l.valor_total_pago),
    nota_fiscal_numero: l.nota_fiscal_numero,
    nota_fiscal_nome: l.nota_fiscal_nome,
    nota_fiscal_url: l.nota_fiscal_caminho ? urls.get(l.nota_fiscal_caminho) ?? null : null,
  }));
}

async function nomesDeFornecedores(supabase: Awaited<ReturnType<typeof criarClienteServidor>>) {
  const { data } = await supabase.from("fornecedores").select("id, nome");
  return new Map(((data ?? []) as { id: string; nome: string }[]).map((f) => [f.id, f.nome]));
}

/** Cotações e compras de um produto (mais recentes primeiro). */
export async function listarCotacoesItem(itemId: string): Promise<{ itens: Cotacao[]; indisponivel?: boolean; erro?: string }> {
  const { supabase, erro } = await exigirLideranca();
  if (erro) return { itens: [], erro };
  const { data, error } = await supabase
    .from("estoque_cotacoes")
    .select("*")
    .eq("item_id", itemId)
    .order("data_cotacao", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return { itens: [], indisponivel: semTabela(error.code) };
  return { itens: await montarCotacoes((data ?? []) as LinhaCotacao[], await nomesDeFornecedores(supabase)) };
}

/** Cotações e compras de um fornecedor, com o nome do produto. */
export async function listarCotacoesFornecedor(
  fornecedorId: string
): Promise<{ itens: (Cotacao & { produto: string })[]; erro?: string }> {
  const { supabase, erro } = await exigirLideranca();
  if (erro) return { itens: [], erro };
  const { data, error } = await supabase
    .from("estoque_cotacoes")
    .select("*")
    .eq("fornecedor_id", fornecedorId)
    .order("data_cotacao", { ascending: false });
  if (error) return { itens: [] };
  const linhas = (data ?? []) as LinhaCotacao[];
  const ids = Array.from(new Set(linhas.map((l) => l.item_id)));
  const produtos = new Map<string, string>();
  if (ids.length > 0) {
    const { data: itens } = await supabase.from("estoque_itens").select("id, nome, cor").in("id", ids);
    for (const i of (itens ?? []) as { id: string; nome: string; cor: string | null }[]) produtos.set(i.id, i.cor ? `${i.nome} (${i.cor})` : i.nome);
  }
  const cotacoes = await montarCotacoes(linhas, await nomesDeFornecedores(supabase));
  return { itens: cotacoes.map((c) => ({ ...c, produto: produtos.get(c.item_id) ?? "Produto removido" })) };
}

export async function salvarCotacao(itemId: string, id: string | null, d: DadosCotacao): Promise<Resultado> {
  const { supabase, user, erro } = await exigirLideranca();
  if (erro || !user) return { erro: erro ?? "Sessão expirada." };

  if (!d.fornecedor_id) return { erro: "Escolha o fornecedor." };
  const valor = lerValor(d.valor_unitario);
  if (valor === null || valor < 0) return { erro: "Informe o valor unitário cotado (ex.: 12,50)." };
  if (!ehData(d.data_cotacao)) return { erro: "Informe a data da cotação." };
  const qtd = d.quantidade.trim() ? parseInt(d.quantidade, 10) : null;
  if (qtd !== null && (!Number.isInteger(qtd) || qtd <= 0)) return { erro: "A quantidade deve ser um número inteiro maior que zero." };
  const prazo = d.prazo_entrega_dias.trim() ? parseInt(d.prazo_entrega_dias, 10) : null;
  if (prazo !== null && (!Number.isInteger(prazo) || prazo < 0)) return { erro: "O prazo de entrega deve ser em dias (número inteiro)." };

  let dataCompra: string | null = null;
  let totalPago: number | null = null;
  if (d.contratado) {
    if (d.data_compra && !ehData(d.data_compra)) return { erro: "Data da compra inválida." };
    dataCompra = d.data_compra || null;
    totalPago = lerValor(d.valor_total_pago);
  }
  if (d.nota_fiscal_caminho && !d.nota_fiscal_caminho.startsWith(`${itemId}/`)) return { erro: "Arquivo da nota fiscal inválido." };

  // Nota já gravada: se a tela não enviou arquivo novo (só o nome), ela é mantida.
  let caminhoAntigo: string | null = null;
  if (id) {
    const { data: antes } = await supabase.from("estoque_cotacoes").select("nota_fiscal_caminho").eq("id", id).maybeSingle();
    caminhoAntigo = (antes as { nota_fiscal_caminho: string | null } | null)?.nota_fiscal_caminho ?? null;
  }
  const caminhoFinal = d.contratado ? d.nota_fiscal_caminho ?? (d.nota_fiscal_nome && caminhoAntigo ? caminhoAntigo : null) : null;

  const dados = {
    item_id: itemId,
    fornecedor_id: d.fornecedor_id,
    data_cotacao: d.data_cotacao,
    valor_unitario: valor,
    quantidade: qtd,
    prazo_entrega_dias: prazo,
    condicoes: nuloSeVazio(d.condicoes, 500),
    observacao: nuloSeVazio(d.observacao, 1000),
    contratado: d.contratado,
    data_compra: dataCompra,
    valor_total_pago: totalPago,
    nota_fiscal_numero: d.contratado ? nuloSeVazio(d.nota_fiscal_numero, 60) : null,
    nota_fiscal_caminho: caminhoFinal,
    nota_fiscal_nome: d.contratado ? d.nota_fiscal_nome?.slice(0, 200) ?? null : null,
  };

  const q = id
    ? supabase.from("estoque_cotacoes").update(dados).eq("id", id).select("id")
    : supabase.from("estoque_cotacoes").insert({ ...dados, criado_por: user.id }).select("id");
  const { data, error } = await q;
  if (error || !data || data.length === 0) return { erro: semTabela(error?.code) ? MIGRACAO : "Não foi possível salvar a cotação." };

  // Troca/remoção da nota: apaga o arquivo antigo do armazenamento.
  if (caminhoAntigo && caminhoAntigo !== caminhoFinal && servicoDisponivel()) {
    await criarClienteAdmin().storage.from(BUCKET_NOTAS).remove([caminhoAntigo]);
  }
  revalidatePath("/estoque");
  return { ok: true };
}

export async function excluirCotacao(id: string): Promise<Resultado> {
  const { supabase, erro } = await exigirLideranca();
  if (erro) return { erro };
  const { data: linha } = await supabase.from("estoque_cotacoes").select("nota_fiscal_caminho").eq("id", id).maybeSingle();
  const { data, error } = await supabase.from("estoque_cotacoes").delete().eq("id", id).select("id");
  if (error || !data || data.length === 0) return { erro: "Não foi possível excluir a cotação." };
  const caminho = (linha as { nota_fiscal_caminho: string | null } | null)?.nota_fiscal_caminho;
  if (caminho && servicoDisponivel()) await criarClienteAdmin().storage.from(BUCKET_NOTAS).remove([caminho]);
  revalidatePath("/estoque");
  return { ok: true };
}

/** Endereço de envio assinado para a nota fiscal (o arquivo vai direto do navegador ao armazenamento). */
export async function prepararEnvioNota(
  itemId: string,
  nome: string,
  tipo: string,
  tamanho: number
): Promise<{ caminho?: string; token?: string; erro?: string }> {
  const { erro } = await exigirLideranca();
  if (erro) return { erro };
  if (!servicoDisponivel()) return { erro: "Envio de arquivos indisponível." };
  if (!TIPOS_NOTA.includes(tipo)) return { erro: "Use PDF, imagem (PNG, JPG, WebP) ou XML." };
  if (tamanho > MAX_BYTES_NOTA) return { erro: "O arquivo pode ter no máximo 15 MB." };
  const seguro = nome.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const caminho = `${itemId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${seguro}`;
  const { data, error } = await criarClienteAdmin().storage.from(BUCKET_NOTAS).createSignedUploadUrl(caminho);
  if (error || !data) return { erro: "Não foi possível preparar o envio. A migration 0063 já foi aplicada?" };
  return { caminho, token: data.token };
}
