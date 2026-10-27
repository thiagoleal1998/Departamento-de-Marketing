"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { uploadReferencia } from "@/features/chamados/upload";
import {
  criarTarefaDaEtapa,
  etapaParaTarefaStatus,
} from "./tarefa";
import { categoriaPorValor } from "./categorias";
import { enviarImagemProjeto } from "./imagem";
import type { ProjetoStatus, EtapaStatus } from "@/types";

async function usuarioId() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Quem pode mexer no projeto: gerente, líder e o responsável por ele. O banco só deixa a liderança gravar,
 * então, conferida a permissão aqui, a gravação usa a chave de serviço.
 */
async function escritorDoProjeto(projetoId: string) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: eu } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const papel = (eu as { role: string } | null)?.role;
  if (papel !== "gerente" && papel !== "lider") {
    const { data: p } = await supabase.from("projetos").select("responsavel_id").eq("id", projetoId).maybeSingle();
    if ((p as { responsavel_id: string | null } | null)?.responsavel_id !== user.id) return null;
  }
  return { db: servicoDisponivel() ? criarClienteAdmin() : supabase, uid: user.id };
}

export async function criarProjeto(formData: FormData) {
  const uid = await usuarioId();
  if (!uid) redirect("/login");
  const supabase = await criarClienteServidor();

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const responsavel_id =
    String(formData.get("responsavel_id") ?? "").trim() || null;
  const categoria =
    categoriaPorValor(String(formData.get("categoria") ?? ""))?.valor ??
    "projetos_marketing";
  const data_inicio = String(formData.get("data_inicio") ?? "").trim() || null;
  const data_fim = String(formData.get("data_fim") ?? "").trim() || null;

  const { data, error } = await supabase
    .from("projetos")
    .insert({
      nome,
      descricao,
      responsavel_id,
      categoria,
      data_inicio,
      data_fim,
      criado_por: uid,
    })
    .select("id")
    .single();
  if (error || !data) return;

  // Capa e logo do parceiro (migration 0079): gravadas à parte; sem ela o projeto é criado do mesmo jeito.
  {
    const campos: Record<string, string> = {};
    const capa = String(formData.get("capa") ?? "");
    const logo = String(formData.get("logo_parceiro") ?? "");
    if (capa) {
      const u = await enviarImagemProjeto(capa, "capa");
      if (u) campos.capa_url = u;
    }
    if (logo) {
      const u = await enviarImagemProjeto(logo, "logo");
      if (u) campos.logo_parceiro_url = u;
    }
    if (Object.keys(campos).length > 0) await supabase.from("projetos").update(campos).eq("id", data.id);
  }

  // Todo projeto (famtour, evento, feira, VT…) também aparece como card no quadro de Tarefas.
  if (servicoDisponivel()) {
    try {
      const admin = criarClienteAdmin();
      const { data: card } = await admin
        .from("tarefas")
        .insert({
          titulo: nome,
          descricao,
          status: "a_fazer",
          responsavel_id,
          prazo: data_fim,
          tag: categoriaPorValor(categoria)?.label ?? null,
        })
        .select("id")
        .single();
      const cardId = (card as { id: string } | null)?.id;
      // Ligação com o projeto à parte (migration 0078): sem ela o card é criado do mesmo jeito.
      if (cardId) await admin.from("tarefas").update({ projeto_id: data.id }).eq("id", cardId);
      if (cardId && responsavel_id && responsavel_id !== uid) {
        await admin.from("notificacoes").insert({
          destinatario_id: responsavel_id,
          tipo: "tarefa",
          titulo: `Novo card para você: ${nome}`,
          link: "/operacional?tarefa=" + cardId,
        });
      }
      revalidatePath("/operacional");
    } catch {
      // o projeto já foi criado; o card é complementar
    }
  }

  revalidatePath("/projetos");
  revalidatePath("/projetos/categoria/[slug]", "page");
  redirect(`/projetos/${data.id}`);
}

/**
 * Edita os dados do projeto (nome, descrição, responsável e datas). O card do projeto em Tarefas acompanha.
 * Pode a liderança e o responsável pelo projeto.
 */
export async function atualizarProjeto(projetoId: string, formData: FormData) {
  const w = await escritorDoProjeto(projetoId);
  if (!w) return;
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const responsavel_id = String(formData.get("responsavel_id") ?? "").trim() || null;
  const data_inicio = String(formData.get("data_inicio") ?? "").trim() || null;
  const data_fim = String(formData.get("data_fim") ?? "").trim() || null;

  const { error } = await w.db.from("projetos").update({ nome, descricao, responsavel_id, data_inicio, data_fim }).eq("id", projetoId);
  if (error) return;

  // Capa e logo do parceiro: nova imagem substitui; "remover" tira.
  {
    const imagens: Record<string, string | null> = {};
    const capa = String(formData.get("capa") ?? "");
    const logo = String(formData.get("logo_parceiro") ?? "");
    if (capa) {
      const u = await enviarImagemProjeto(capa, "capa");
      if (u) imagens.capa_url = u;
    } else if (formData.get("remover_capa") === "1") imagens.capa_url = null;
    if (logo) {
      const u = await enviarImagemProjeto(logo, "logo");
      if (u) imagens.logo_parceiro_url = u;
    } else if (formData.get("remover_logo_parceiro") === "1") imagens.logo_parceiro_url = null;
    if (Object.keys(imagens).length > 0) await w.db.from("projetos").update(imagens).eq("id", projetoId);
  }

  // Card do projeto no quadro de Tarefas (sem a migration 0078 não há ligação e nada acontece).
  try {
    await w.db.from("tarefas").update({ titulo: nome, descricao, responsavel_id, prazo: data_fim }).eq("projeto_id", projetoId);
  } catch {
    // complementar
  }
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/projetos");
  revalidatePath("/projetos/categoria/[slug]", "page");
  revalidatePath("/operacional");
}

export async function atualizarCategoriaProjeto(
  projetoId: string,
  categoria: string
) {
  const meta = categoriaPorValor(categoria);
  if (!meta) return;
  const w = await escritorDoProjeto(projetoId);
  if (!w) return;
  await w.db.from("projetos").update({ categoria: meta.valor }).eq("id", projetoId);
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/projetos");
  revalidatePath("/projetos/categoria/[slug]", "page");
}

export async function atualizarStatusProjeto(
  projetoId: string,
  status: ProjetoStatus
) {
  const w = await escritorDoProjeto(projetoId);
  if (!w) return;
  await w.db.from("projetos").update({ status }).eq("id", projetoId);
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/projetos");
}

export async function adicionarEtapa(projetoId: string, formData: FormData) {
  const w = await escritorDoProjeto(projetoId);
  if (!w) return;
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return;
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const responsavel_id =
    String(formData.get("responsavel_id") ?? "").trim() || null;
  const prazo = String(formData.get("prazo") ?? "").trim() || null;

  // ordem = fim da lista
  const { count } = await w.db
    .from("projeto_etapas")
    .select("*", { count: "exact", head: true })
    .eq("projeto_id", projetoId);

  const { data: etapa } = await w.db
    .from("projeto_etapas")
    .insert({
      projeto_id: projetoId,
      titulo,
      descricao,
      responsavel_id,
      prazo,
      ordem: count ?? 0,
    })
    .select("id")
    .single();

  // Cada etapa vira um card no kanban operacional.
  if (etapa) {
    await criarTarefaDaEtapa(etapa.id, { titulo, descricao, responsavel_id, prazo });
  }

  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/operacional");
}

/** A etapa pertence a qual projeto? (leitura aberta a quem está logado) */
async function projetoDaEtapa(etapaId: string): Promise<string | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("projeto_etapas").select("projeto_id").eq("id", etapaId).maybeSingle();
  return (data as { projeto_id: string } | null)?.projeto_id ?? null;
}

export async function atualizarStatusEtapa(
  etapaId: string,
  status: EtapaStatus
) {
  const projetoId = await projetoDaEtapa(etapaId);
  if (!projetoId) return;
  const w = await escritorDoProjeto(projetoId);
  if (!w) return;
  await w.db.from("projeto_etapas").update({ status }).eq("id", etapaId);
  // Espelha no card do kanban.
  await w.db
    .from("tarefas")
    .update({ status: etapaParaTarefaStatus(status) })
    .eq("etapa_id", etapaId);
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/operacional");
}

/** Edita título, descrição, responsável e prazo de uma etapa; o card dela em Tarefas acompanha. */
export async function atualizarEtapa(projetoId: string, formData: FormData) {
  const etapaId = String(formData.get("etapa_id") ?? "").trim();
  if (!etapaId) return;
  const w = await escritorDoProjeto(projetoId);
  if (!w) return;
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return;
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const responsavel_id = String(formData.get("responsavel_id") ?? "").trim() || null;
  const prazo = String(formData.get("prazo") ?? "").trim() || null;

  const { error } = await w.db.from("projeto_etapas").update({ titulo, descricao, responsavel_id, prazo }).eq("id", etapaId).eq("projeto_id", projetoId);
  if (error) return;
  await w.db.from("tarefas").update({ titulo, descricao, responsavel_id, prazo }).eq("etapa_id", etapaId);
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/operacional");
}

export async function removerEtapa(projetoId: string, formData: FormData) {
  const w = await escritorDoProjeto(projetoId);
  if (!w) return;
  const etapaId = String(formData.get("etapa_id") ?? "").trim();
  if (!etapaId) return;
  await w.db.from("projeto_etapas").delete().eq("id", etapaId).eq("projeto_id", projetoId);
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/operacional");
}

/* ------------------------------------------------------------------ */
/* Documentos                                                          */
/* ------------------------------------------------------------------ */
export async function adicionarDocumento(
  projetoId: string,
  formData: FormData
) {
  const w = await escritorDoProjeto(projetoId);
  if (!w) return;
  const nome = String(formData.get("nome") ?? "").trim();
  const linkRaw = String(formData.get("url") ?? "").trim();

  const arquivo = await uploadReferencia(
    formData.get("arquivo") as File | null
  );
  let url = arquivo?.url ?? null;
  if (!url && linkRaw) {
    url = linkRaw.startsWith("http") ? linkRaw : `https://${linkRaw}`;
  }
  if (!url) return; // precisa de arquivo ou link
  const nomeFinal = nome || arquivo?.nome || "Documento";

  await w.db
    .from("projeto_documentos")
    .insert({ projeto_id: projetoId, nome: nomeFinal, url });

  revalidatePath(`/projetos/${projetoId}`);
}

export async function removerDocumento(
  projetoId: string,
  formData: FormData
) {
  const w = await escritorDoProjeto(projetoId);
  if (!w) return;
  const docId = String(formData.get("doc_id") ?? "").trim();
  if (!docId) return;
  await w.db.from("projeto_documentos").delete().eq("id", docId).eq("projeto_id", projetoId);
  revalidatePath(`/projetos/${projetoId}`);
}

/* ------------------------------------------------------------------ */
/* Comparativos de custo                                               */
/* ------------------------------------------------------------------ */
export async function adicionarComparativo(
  projetoId: string,
  formData: FormData
) {
  const w = await escritorDoProjeto(projetoId);
  if (!w) return;
  const item = String(formData.get("item") ?? "").trim();
  const fornecedor = String(formData.get("fornecedor") ?? "").trim();
  if (!item || !fornecedor) return;

  const valorRaw = String(formData.get("valor") ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const valor = valorRaw ? Number(valorRaw) : null;
  const observacao = String(formData.get("observacao") ?? "").trim() || null;

  await w.db.from("projeto_comparativos").insert({
    projeto_id: projetoId,
    item,
    fornecedor,
    valor: Number.isFinite(valor as number) ? valor : null,
    observacao,
  });

  revalidatePath(`/projetos/${projetoId}`);
}

export async function removerComparativo(
  projetoId: string,
  formData: FormData
) {
  const w = await escritorDoProjeto(projetoId);
  if (!w) return;
  const compId = String(formData.get("comp_id") ?? "").trim();
  if (!compId) return;
  await w.db.from("projeto_comparativos").delete().eq("id", compId).eq("projeto_id", projetoId);
  revalidatePath(`/projetos/${projetoId}`);
}

/** Registra uma atualização na linha do tempo do projeto (qualquer pessoa logada). */
export async function adicionarAtualizacaoProjeto(projetoId: string, formData: FormData) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const texto = String(formData.get("texto") ?? "").trim().slice(0, 2000);
  if (!texto) return;
  await supabase.from("projeto_atualizacoes").insert({ projeto_id: projetoId, autor_id: user.id, texto, origem: "manual" });
  revalidatePath(`/projetos/${projetoId}`);
}
