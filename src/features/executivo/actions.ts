"use server";

import { revalidatePath } from "next/cache";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push";
import { podeAprovarComoDiretoria } from "./acesso";

type Resultado = { ok?: boolean; erro?: string };

/**
 * Decisão da diretoria sobre uma tarefa que está na coluna "Em aprovação - Marco":
 * aprovar conclui a tarefa; pedir alteração devolve para "Alterações" com a observação.
 */
export async function decidirAprovacao(
  tarefaId: string,
  decisao: "aprovar" | "alterar",
  nota: string
): Promise<Resultado> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return { erro: "Sessão expirada. Entre novamente." };
  if (!podeAprovarComoDiretoria(usuario)) return { erro: "Você não tem permissão para aprovar." };
  if (!servicoDisponivel()) return { erro: "Serviço indisponível no momento." };

  const observacao = nota.trim().slice(0, 1000);
  if (decisao === "alterar" && !observacao) return { erro: "Diga o que precisa ser alterado." };

  const admin = criarClienteAdmin();
  const { data: t } = await admin
    .from("tarefas")
    .select("id, titulo, descricao, status, responsavel_id")
    .eq("id", tarefaId)
    .maybeSingle();
  const tarefa = t as { id: string; titulo: string; descricao: string | null; status: string; responsavel_id: string | null } | null;
  if (!tarefa) return { erro: "Tarefa não encontrada." };
  if (tarefa.status !== "aprovacao_marco") return { erro: "Esta tarefa já não está aguardando a sua aprovação." };

  const quando = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const rotulo = decisao === "aprovar" ? "Aprovado" : "Alteração solicitada";
  const registro = `[${usuario.nome} · ${quando}] ${rotulo}${observacao ? `: ${observacao}` : "."}`;

  const { error } = await admin
    .from("tarefas")
    .update({
      status: decisao === "aprovar" ? "concluida" : "alteracoes",
      status_notion: decisao === "aprovar" ? "Concluído" : "Alterações",
      descricao: [tarefa.descricao, registro].filter(Boolean).join("\n\n"),
    })
    .eq("id", tarefaId);
  if (error) return { erro: "Não foi possível registrar a decisão." };

  // Avisa quem está com a tarefa.
  if (tarefa.responsavel_id) {
    const titulo =
      decisao === "aprovar"
        ? `${usuario.nome.split(" ")[0]} aprovou: ${tarefa.titulo}`
        : `${usuario.nome.split(" ")[0]} pediu alteração: ${tarefa.titulo}`;
    await admin.from("notificacoes").insert({
      destinatario_id: tarefa.responsavel_id,
      tipo: "aprovacao",
      titulo,
      link: "/operacional?tarefa=" + tarefa.id,
    });
    await enviarPush([tarefa.responsavel_id], {
      titulo,
      corpo: observacao || undefined,
      url: "/operacional?tarefa=" + tarefa.id,
      tag: "aprovacao-" + tarefa.id,
    });
  }

  revalidatePath("/executivo");
  revalidatePath("/operacional");
  return { ok: true };
}
