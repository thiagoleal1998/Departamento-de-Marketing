"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { avisarDiretoria } from "@/features/executivo/avisos";
import { tarefaParaEtapaStatus } from "@/features/projetos/tarefa";
import type { TarefaStatus } from "@/types";

/** Move uma tarefa para outra coluna do kanban (novo status). */
export async function moverTarefa(tarefaId: string, novoStatus: TarefaStatus) {
  const supabase = await criarClienteServidor();
  const { data: antes } = await supabase.from("tarefas").select("status, titulo").eq("id", tarefaId).maybeSingle();
  const { data } = await supabase
    .from("tarefas")
    .update({ status: novoStatus })
    .eq("id", tarefaId)
    .select("etapa_id")
    .single();

  // Se a tarefa é uma etapa de projeto, sincroniza a etapa.
  if (data?.etapa_id) {
    await supabase
      .from("projeto_etapas")
      .update({ status: tarefaParaEtapaStatus(novoStatus) })
      .eq("id", data.etapa_id);
    revalidatePath("/projetos");
  }
  if (novoStatus === "aprovacao_marco" && antes && antes.status !== novoStatus) {
    await avisarDiretoria({ titulo: "Para aprovar: " + antes.titulo, link: "/executivo" });
  }
  revalidatePath("/operacional");
}

const STATUS_VALIDOS: TarefaStatus[] = [
  "a_fazer",
  "em_andamento",
  "alteracoes",
  "aprovacao_gustavo",
  "aprovacao_thiago",
  "aprovacao_marco",
  "revisao",
  "concluida",
];

export interface DadosTarefa {
  titulo: string;
  descricao: string;
  status: TarefaStatus;
  responsavel_id: string | null;
  prazo: string | null;
  prioridade: number | null;
  tag: string;
  link: string;
  conteudo: string;
}

/** Salva as propriedades e o conteúdo de um card (como a página do Notion). */
export async function salvarTarefa(
  tarefaId: string,
  d: DadosTarefa
): Promise<{ ok?: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const titulo = d.titulo.trim();
  if (!titulo) return { erro: "O card precisa de um título." };
  if (!STATUS_VALIDOS.includes(d.status)) return { erro: "Status inválido." };
  if (d.prioridade !== null && (d.prioridade < 1 || d.prioridade > 5)) {
    return { erro: "Prioridade deve ser de 1 a 5." };
  }
  if (d.conteudo.length > 50000) {
    return { erro: "O conteúdo está muito grande." };
  }

  // A leitura passa pela RLS: só enxerga o card quem é da liderança ou o responsável atual.
  const { data: antes } = await supabase.from("tarefas").select("status, responsavel_id").eq("id", tarefaId).maybeSingle();
  if (!antes) return { erro: "Você não tem permissão para editar este card." };

  // Quem passa o card a outra pessoa deixa de ser o responsável, e a regra de atualização do banco
  // (liderança ou responsável) barraria a própria gravação. Como a permissão já foi conferida acima,
  // a gravação usa a chave de serviço.
  const gravador = servicoDisponivel() ? criarClienteAdmin() : supabase;
  const { data, error } = await gravador
    .from("tarefas")
    .update({
      titulo,
      descricao: d.descricao.trim() || null,
      status: d.status,
      responsavel_id: d.responsavel_id || null,
      prazo: d.prazo || null,
      prioridade: d.prioridade,
      tag: d.tag.trim() || null,
      link: d.link.trim() || null,
      conteudo: d.conteudo || null,
    })
    .eq("id", tarefaId)
    .select("etapa_id")
    .maybeSingle();

  if (error) return { erro: "Não foi possível salvar. Tente novamente." };
  if (!data) {
    return { erro: "Você não tem permissão para editar este card." };
  }

  if (data.etapa_id) {
    await supabase
      .from("projeto_etapas")
      .update({ status: tarefaParaEtapaStatus(d.status) })
      .eq("id", data.etapa_id);
    revalidatePath("/projetos");
  }
  if (d.status === "aprovacao_marco" && antes && antes.status !== d.status) {
    await avisarDiretoria({ titulo: "Para aprovar: " + titulo, link: "/executivo" });
  }
  // Avisa quem recebeu o card.
  const novoResp = d.responsavel_id || null;
  if (novoResp && novoResp !== antes.responsavel_id && novoResp !== user.id && servicoDisponivel()) {
    await criarClienteAdmin().from("notificacoes").insert({
      destinatario_id: novoResp,
      tipo: "tarefa",
      titulo: "Card passado para você: " + titulo,
      link: "/operacional?tarefa=" + tarefaId,
    });
  }
  revalidatePath("/operacional");
  return { ok: true };
}

/**
 * Exclui uma tarefa (card) que não é mais necessária. Pode quem é da liderança ou o responsável
 * pela tarefa. A exclusão é definitiva.
 */
export async function excluirTarefa(tarefaId: string): Promise<{ ok?: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  // A leitura passa pela RLS: só enxerga a tarefa quem é da liderança ou o responsável.
  const { data: tarefa } = await supabase
    .from("tarefas")
    .select("id, responsavel_id")
    .eq("id", tarefaId)
    .maybeSingle();
  if (!tarefa) return { erro: "Tarefa não encontrada ou sem permissão." };

  const { data: eu } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const lideranca = eu?.role === "gerente" || eu?.role === "lider";
  if (!lideranca && tarefa.responsavel_id !== user.id) {
    return { erro: "Só a liderança ou o responsável pela tarefa pode excluí-la." };
  }

  // A regra de acesso do banco não prevê exclusão; a permissão foi conferida acima.
  if (!servicoDisponivel()) return { erro: "Exclusão indisponível no momento." };
  const { error } = await criarClienteAdmin().from("tarefas").delete().eq("id", tarefaId);
  if (error) return { erro: "Não foi possível excluir a tarefa." };

  revalidatePath("/operacional");
  revalidatePath("/chat");
  return { ok: true };
}

export interface NovoCard {
  titulo: string;
  descricao: string;
  status: TarefaStatus;
  responsavel_id: string | null;
  prazo: string | null;
  prioridade: number | null;
  tag: string;
  link: string;
}

/**
 * Cria um card no quadro. Liderança escolhe qualquer responsável; os demais criam cards para si mesmos
 * (o banco só deixa a liderança inserir tarefas, por isso a gravação usa a chave de serviço depois de checar quem é).
 */
export async function criarTarefaCard(d: NovoCard): Promise<{ ok?: boolean; erro?: string; id?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const titulo = d.titulo.trim().slice(0, 200);
  if (!titulo) return { erro: "Dê um título ao card." };
  if (!STATUS_VALIDOS.includes(d.status)) return { erro: "Coluna inválida." };
  if (d.prioridade !== null && (d.prioridade < 1 || d.prioridade > 5)) return { erro: "Prioridade deve ser de 1 a 5." };
  const link = d.link.trim();
  if (link && !/^https?:\/\//i.test(link)) return { erro: "O link deve começar com http:// ou https://." };
  if (!servicoDisponivel()) return { erro: "Criação de cards indisponível no momento." };

  const { data: eu } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const papel = (eu as { role: string } | null)?.role;
  const lideranca = papel === "gerente" || papel === "lider";
  const responsavel = lideranca ? d.responsavel_id || null : user.id;

  const admin = criarClienteAdmin();
  const { data, error } = await admin
    .from("tarefas")
    .insert({
      titulo,
      descricao: d.descricao.trim() || null,
      status: d.status,
      responsavel_id: responsavel,
      prazo: d.prazo || null,
      prioridade: d.prioridade,
      tag: d.tag.trim() || null,
      link: link || null,
    })
    .select("id")
    .single();
  if (error || !data) return { erro: "Não foi possível criar o card. Tente novamente." };
  const id = (data as { id: string }).id;

  if (responsavel && responsavel !== user.id) {
    await admin.from("notificacoes").insert({
      destinatario_id: responsavel,
      tipo: "tarefa",
      titulo: `Novo card para você: ${titulo}`,
      link: "/operacional?tarefa=" + id,
    });
  }
  if (d.status === "aprovacao_marco") {
    await avisarDiretoria({ titulo: "Para aprovar: " + titulo, link: "/executivo" });
  }
  revalidatePath("/operacional");
  return { ok: true, id };
}
