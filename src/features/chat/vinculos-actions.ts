"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { ehLideranca } from "@/lib/permissions";
import { avisarNovaMensagem } from "./aviso";
import type { DadosVinculo, ItemEstoqueChat, NovoVinculo, TarefaChat } from "./vinculo-tipos";

type Resultado = { ok?: boolean; erro?: string };

const MIGRACAO = "O recurso de vínculos ainda não foi ativado no banco (migration 0049).";
const colunaAusente = (c?: string) => c === "42703" || c === "PGRST204" || c === "42P01" || c === "PGRST205";

async function usuarioAtual() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, papel: null as string | null };
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, user, papel: (data as { role: string } | null)?.role ?? null };
}

/** Envia uma mensagem já ligada a um item do estoque e/ou a uma nova tarefa. */
export async function enviarMensagemVinculada(
  conversaId: string,
  texto: string,
  vinculo: NovoVinculo
): Promise<Resultado> {
  const { supabase, user, papel } = await usuarioAtual();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const limpo = texto.trim();
  if (!limpo) return { erro: "Escreva a mensagem." };
  if (limpo.length > 2000) return { erro: "Mensagem muito longa (máx. 2000)." };

  let tarefaId: string | null = null;
  let nomeItem: string | null = null;
  if (vinculo.itemId) {
    const { data } = await supabase.from("estoque_itens").select("nome").eq("id", vinculo.itemId).maybeSingle();
    nomeItem = (data as { nome: string } | null)?.nome ?? null;
    if (!nomeItem) return { erro: "Item do estoque não encontrado." };
  }

  if (vinculo.tarefa) {
    if (!ehLideranca(papel as never)) return { erro: "Só a liderança cria tarefas pelo chat." };
    const titulo = vinculo.tarefa.titulo.trim().slice(0, 200) || (nomeItem ? `Repor: ${nomeItem}` : limpo.slice(0, 80));
    const prazo = /^\d{4}-\d{2}-\d{2}$/.test(vinculo.tarefa.prazo ?? "") ? `${vinculo.tarefa.prazo}T12:00:00-03:00` : null;
    const { data: t, error } = await supabase
      .from("tarefas")
      .insert({
        titulo,
        descricao: limpo,
        status: "a_fazer",
        responsavel_id: vinculo.tarefa.responsavelId,
        prazo,
        estoque_item_id: vinculo.itemId,
      })
      .select("id")
      .single();
    if (error || !t) {
      return { erro: colunaAusente(error?.code) ? MIGRACAO : "Não foi possível criar a tarefa." };
    }
    tarefaId = (t as { id: string }).id;

    // Notifica o responsável (sino do painel).
    if (servicoDisponivel() && vinculo.tarefa.responsavelId !== user.id) {
      await criarClienteAdmin().from("notificacoes").insert({
        destinatario_id: vinculo.tarefa.responsavelId,
        tipo: "tarefa",
        titulo: `Nova tarefa pelo chat: ${titulo}`,
        link: conversaId === "00000000-0000-0000-0000-00000000c0de" ? "/chat" : `/chat?c=${conversaId}`,
      });
    }
  }

  const { error } = await supabase.from("chat_mensagens").insert({
    conversa_id: conversaId,
    autor_id: user.id,
    texto: limpo,
    tarefa_id: tarefaId,
    estoque_item_id: vinculo.itemId,
  });
  if (error) return { erro: colunaAusente(error.code) ? MIGRACAO : "Não foi possível enviar. Tente novamente." };

  await avisarNovaMensagem(supabase, user.id, conversaId, limpo);
  revalidatePath("/operacional");
  return { ok: true };
}

/** Dados atuais da tarefa e do item vinculados a uma mensagem. */
export async function dadosVinculo(tarefaId: string | null, itemId: string | null): Promise<DadosVinculo> {
  const { supabase, user, papel } = await usuarioAtual();
  if (!user) return { tarefa: null, item: null, podeResponder: false };

  let tarefa: TarefaChat | null = null;
  if (tarefaId) {
    const { data } = await supabase
      .from("tarefas")
      .select("id, titulo, status, prazo, responsavel_id, estoque_item_id")
      .eq("id", tarefaId)
      .maybeSingle();
    tarefa = (data as TarefaChat | null) ?? null;
  }
  const idItem = tarefa?.estoque_item_id ?? itemId;
  let item: ItemEstoqueChat | null = null;
  if (idItem) {
    const { data } = await supabase
      .from("estoque_itens")
      .select("id, nome, quantidade, estoque_minimo")
      .eq("id", idItem)
      .maybeSingle();
    item = (data as ItemEstoqueChat | null) ?? null;
  }
  const podeResponder = !!tarefa && (tarefa.responsavel_id === user.id || ehLideranca(papel as never));
  return { tarefa, item, podeResponder };
}

/**
 * Responde sobre a tarefa/item: registra entrada no estoque e/ou conclui a tarefa e
 * posta o resumo na conversa, já ligado ao mesmo vínculo.
 */
export async function responderVinculo(
  conversaId: string,
  tarefaId: string | null,
  itemId: string | null,
  resposta: { texto: string; entrada: number; concluir: boolean; andamento: boolean }
): Promise<Resultado> {
  const { supabase, user } = await usuarioAtual();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const dados = await dadosVinculo(tarefaId, itemId);
  if (tarefaId && !dados.tarefa) return { erro: "Tarefa não encontrada ou sem permissão." };
  if (!dados.podeResponder && tarefaId) return { erro: "Só o responsável (ou a liderança) responde por esta tarefa." };

  const partes: string[] = [];
  const texto = resposta.texto.trim();
  if (texto) partes.push(texto);

  const entrada = Math.floor(Number(resposta.entrada) || 0);
  if (entrada > 0) {
    if (!dados.item) return { erro: "Não há item de estoque vinculado para dar entrada." };
    const { data: saldo, error } = await supabase.rpc("registrar_movimento_estoque", {
      p_item: dados.item.id,
      p_tipo: "entrada",
      p_quantidade: entrada,
      p_motivo: `Reposição pelo chat${dados.tarefa ? ` — ${dados.tarefa.titulo}` : ""}`,
      p_chamado: null,
      p_projeto: null,
    });
    if (error) return { erro: error.message || "Não foi possível registrar a entrada no estoque." };
    partes.push(`📦 Entrada de ${entrada} un. em “${dados.item.nome}” registrada. Estoque agora: ${saldo as number}.`);
  }

  if (dados.tarefa) {
    if (resposta.concluir && dados.tarefa.status !== "concluida") {
      const { error } = await supabase.from("tarefas").update({ status: "concluida" }).eq("id", dados.tarefa.id);
      if (error) return { erro: "Não foi possível concluir a tarefa." };
      partes.push(`✅ Tarefa “${dados.tarefa.titulo}” concluída.`);
    } else if (resposta.andamento && dados.tarefa.status === "a_fazer") {
      await supabase.from("tarefas").update({ status: "em_andamento" }).eq("id", dados.tarefa.id);
      partes.push(`🔧 Tarefa “${dados.tarefa.titulo}” em andamento.`);
    }
  }

  if (partes.length === 0) return { erro: "Escreva uma resposta, informe a entrada ou marque uma ação." };

  const mensagem = partes.join("\n");
  const { error } = await supabase.from("chat_mensagens").insert({
    conversa_id: conversaId,
    autor_id: user.id,
    texto: mensagem.slice(0, 2000),
    tarefa_id: tarefaId,
    estoque_item_id: dados.item?.id ?? itemId,
  });
  if (error) return { erro: colunaAusente(error.code) ? MIGRACAO : "Não foi possível enviar a resposta." };

  await avisarNovaMensagem(supabase, user.id, conversaId, mensagem);
  revalidatePath("/estoque");
  revalidatePath("/operacional");
  return { ok: true };
}
