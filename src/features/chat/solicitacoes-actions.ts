"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { avisarNovaMensagem } from "./aviso";
import {
  BUCKET_SOLICITACOES,
  MAX_BYTES_PROVA,
  STATUS_SOLICITACAO_ROTULO,
  TIPOS_PROVA,
  metaDoTipo,
  type NovaSolicitacao,
  type SolicitacaoView,
  type StatusSolicitacao,
} from "./solicitacao-tipos";

type Resultado = { ok?: boolean; erro?: string };
const MIGRACAO = "As solicitações de criação ainda não foram ativadas no banco (migration 0055).";
const semTabela = (c?: string) => c === "42P01" || c === "PGRST205" || c === "42703" || c === "PGRST204";

async function usuario() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Endereço de envio assinado para o print de prova (vai direto do navegador ao armazenamento). */
export async function prepararEnvioProva(
  nome: string,
  tipo: string,
  tamanho: number
): Promise<{ caminho?: string; token?: string; erro?: string }> {
  const { user } = await usuario();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  if (!servicoDisponivel()) return { erro: "Envio de arquivos indisponível." };
  if (!TIPOS_PROVA.includes(tipo)) return { erro: "Use uma imagem (PNG, JPG, WebP, GIF) ou PDF." };
  if (tamanho > MAX_BYTES_PROVA) return { erro: "O arquivo pode ter no máximo 10 MB." };

  const seguro = nome.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const caminho = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${seguro}`;
  const { data, error } = await criarClienteAdmin().storage.from(BUCKET_SOLICITACOES).createSignedUploadUrl(caminho);
  if (error || !data) return { erro: "Não foi possível preparar o envio. Tente novamente." };
  return { caminho, token: data.token };
}

/** Cria a solicitação (pedido estruturado) e a mostra na conversa como um cartão próprio. */
export async function criarSolicitacaoChat(conversaId: string, d: NovaSolicitacao): Promise<Resultado> {
  const { supabase, user } = await usuario();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const meta = metaDoTipo(d.tipo);
  const produto = d.produto.trim().slice(0, 200);
  const solicitante = d.solicitante.trim().slice(0, 120);
  const link = d.linkReferencia.trim().slice(0, 1000);
  const detalhes = d.detalhes.trim().slice(0, 3000);
  const prazo = /^\d{4}-\d{2}-\d{2}$/.test(d.prazo ?? "") ? d.prazo : null;

  if (!produto) return { erro: `Informe: ${meta.rotuloProduto.toLowerCase()}.` };
  if (!solicitante) return { erro: "Informe quem solicitou." };
  if (meta.exigeReferencia && !link) return { erro: "Informe o link de referência." };
  if (link && !/^https?:\/\//i.test(link)) return { erro: "O link de referência deve começar com http:// ou https://." };
  if (meta.exigeProva && !d.prova) return { erro: "Anexe o print de prova da solicitação." };

  const { data: sol, error } = await supabase
    .from("chat_solicitacoes")
    .insert({
      conversa_id: conversaId,
      tipo: d.tipo,
      produto,
      link_referencia: link || null,
      solicitante,
      prazo,
      detalhes: detalhes || null,
      prova_caminho: d.prova?.caminho ?? null,
      prova_nome: d.prova?.nome?.slice(0, 200) ?? null,
      criado_por: user.id,
    })
    .select("id")
    .single();
  if (error || !sol) return { erro: semTabela(error?.code) ? MIGRACAO : "Não foi possível criar a solicitação." };

  const texto = `📋 Solicitação de ${meta.rotulo.toLowerCase()}: ${produto}`;
  const { error: errMsg } = await supabase
    .from("chat_mensagens")
    .insert({ conversa_id: conversaId, autor_id: user.id, texto, solicitacao_id: (sol as { id: string }).id });
  if (errMsg) return { erro: semTabela(errMsg.code) ? MIGRACAO : "A solicitação foi criada, mas não foi possível avisar na conversa." };

  await avisarNovaMensagem(supabase, user.id, conversaId, texto);
  revalidatePath("/chat");
  return { ok: true };
}

/** Dados da solicitação para o cartão (com link temporário do print). */
export async function dadosSolicitacao(id: string): Promise<SolicitacaoView | null> {
  const { supabase, user } = await usuario();
  if (!user) return null;

  const { data } = await supabase.from("chat_solicitacoes").select("*").eq("id", id).maybeSingle();
  const s = data as {
    id: string;
    tipo: string;
    produto: string;
    link_referencia: string | null;
    solicitante: string;
    prazo: string | null;
    detalhes: string | null;
    prova_caminho: string | null;
    prova_nome: string | null;
    status: StatusSolicitacao;
    criado_por: string | null;
    created_at: string;
  } | null;
  if (!s) return null;

  let provaUrl: string | null = null;
  if (s.prova_caminho && servicoDisponivel()) {
    const { data: u } = await criarClienteAdmin().storage.from(BUCKET_SOLICITACOES).createSignedUrl(s.prova_caminho, 3600);
    provaUrl = u?.signedUrl ?? null;
  }
  let criadoPorNome: string | null = null;
  if (s.criado_por && servicoDisponivel()) {
    const { data: p } = await criarClienteAdmin().from("profiles").select("nome").eq("id", s.criado_por).maybeSingle();
    criadoPorNome = (p as { nome: string } | null)?.nome ?? null;
  }

  return {
    id: s.id,
    tipo: s.tipo,
    produto: s.produto,
    linkReferencia: s.link_referencia,
    solicitante: s.solicitante,
    prazo: s.prazo,
    detalhes: s.detalhes,
    provaNome: s.prova_nome,
    provaUrl,
    provaEhImagem: /\.(png|jpe?g|webp|gif)$/i.test(s.prova_nome ?? s.prova_caminho ?? ""),
    status: s.status,
    criadoPorNome,
    criadoEm: s.created_at,
  };
}

/** Atualiza o andamento da solicitação e avisa na conversa. */
export async function atualizarStatusSolicitacao(id: string, status: StatusSolicitacao): Promise<Resultado> {
  const { supabase, user } = await usuario();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  if (!(status in STATUS_SOLICITACAO_ROTULO)) return { erro: "Situação inválida." };

  const { data, error } = await supabase
    .from("chat_solicitacoes")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("conversa_id, produto, tipo")
    .maybeSingle();
  if (error || !data) return { erro: "Não foi possível atualizar a solicitação." };
  const s = data as { conversa_id: string; produto: string; tipo: string };

  const { data: eu } = await supabase.from("profiles").select("nome").eq("id", user.id).single();
  const quem = (eu as { nome: string } | null)?.nome ?? "Alguém";
  const texto = `📋 ${quem} marcou a solicitação de ${metaDoTipo(s.tipo).rotulo.toLowerCase()} “${s.produto}” como ${STATUS_SOLICITACAO_ROTULO[status].toLowerCase()}.`;
  await supabase.from("chat_mensagens").insert({ conversa_id: s.conversa_id, autor_id: user.id, texto, solicitacao_id: id });
  await avisarNovaMensagem(supabase, user.id, s.conversa_id, texto);

  revalidatePath("/chat");
  return { ok: true };
}
