"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { ehLideranca } from "@/lib/permissions";
import { avisarNovaMensagem } from "./aviso";
import {
  STATUS_PROJETO_ROTULO,
  type DadosVinculo,
  type ItemEstoqueChat,
  type NovoVinculo,
  type ProjetoChat,
  type TarefaChat,
} from "./vinculo-tipos";

const STATUS_PROJETO = ["planejamento", "em_andamento", "concluido", "cancelado"];

type Resultado = { ok?: boolean; erro?: string };

const MIGRACAO = "O recurso de vínculos ainda não foi ativado no banco (migration 0049).";
const MIGRACAO_PROJETOS = "As atualizações de projeto ainda não foram ativadas no banco (migration 0050).";
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

  let projetoId: string | null = null;
  if (vinculo.projeto) {
    const { data: pj } = await supabase.from("projetos").select("id").eq("id", vinculo.projeto.id).maybeSingle();
    if (!pj) return { erro: "Projeto não encontrado." };
    projetoId = vinculo.projeto.id;
    if (vinculo.projeto.registrar) {
      const novo =
        ehLideranca(papel as never) && vinculo.projeto.novoStatus && STATUS_PROJETO.includes(vinculo.projeto.novoStatus)
          ? vinculo.projeto.novoStatus
          : null;
      const { error: errAt } = await supabase
        .from("projeto_atualizacoes")
        .insert({ projeto_id: projetoId, autor_id: user.id, texto: limpo, status_novo: novo, origem: "chat" });
      if (errAt) {
        return { erro: colunaAusente(errAt.code) ? MIGRACAO_PROJETOS : "Não foi possível registrar a atualização do projeto." };
      }
      if (novo) await supabase.from("projetos").update({ status: novo }).eq("id", projetoId);
      revalidatePath(`/projetos/${projetoId}`);
      revalidatePath("/projetos");
    }
  }

  const { error } = await supabase.from("chat_mensagens").insert({
    conversa_id: conversaId,
    autor_id: user.id,
    texto: limpo,
    tarefa_id: tarefaId,
    estoque_item_id: vinculo.itemId,
    ...(projetoId ? { projeto_id: projetoId } : {}),
  });
  if (error) {
    return {
      erro: colunaAusente(error.code) ? (projetoId ? MIGRACAO_PROJETOS : MIGRACAO) : "Não foi possível enviar. Tente novamente.",
    };
  }

  await avisarNovaMensagem(supabase, user.id, conversaId, limpo);
  revalidatePath("/operacional");
  return { ok: true };
}

/** Dados atuais da tarefa e do item vinculados a uma mensagem. */
export async function dadosVinculo(
  tarefaId: string | null,
  itemId: string | null,
  projetoId: string | null = null
): Promise<DadosVinculo> {
  const { supabase, user, papel } = await usuarioAtual();
  if (!user) return { tarefa: null, item: null, projeto: null, podeMudarStatusProjeto: false, podeResponder: false };

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
  let projeto: ProjetoChat | null = null;
  if (projetoId) {
    const { data } = await supabase
      .from("projetos")
      .select("id, nome, status, responsavel_id")
      .eq("id", projetoId)
      .maybeSingle();
    if (data) {
      const { data: ult } = await supabase
        .from("projeto_atualizacoes")
        .select("texto, created_at, autor_id")
        .eq("projeto_id", projetoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const u = ult as { texto: string; created_at: string; autor_id: string | null } | null;
      projeto = {
        ...(data as Omit<ProjetoChat, "ultima">),
        ultima: u ? { texto: u.texto, quando: u.created_at, autor_id: u.autor_id } : null,
      };
    }
  }
  const podeResponder = !!tarefa && (tarefa.responsavel_id === user.id || ehLideranca(papel as never));
  return { tarefa, item, projeto, podeMudarStatusProjeto: ehLideranca(papel as never), podeResponder };
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

/** Registra uma atualização num projeto (e, se for liderança, muda a situação) e avisa na conversa. */
export async function atualizarProjetoPeloChat(
  conversaId: string,
  projetoId: string,
  texto: string,
  novoStatus: string | null
): Promise<Resultado> {
  const { supabase, user, papel } = await usuarioAtual();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  const limpo = texto.trim();
  if (!limpo) return { erro: "Escreva a atualização." };

  const { data: pj } = await supabase.from("projetos").select("id, nome").eq("id", projetoId).maybeSingle();
  if (!pj) return { erro: "Projeto não encontrado." };
  const nome = (pj as { nome: string }).nome;

  const status = ehLideranca(papel as never) && novoStatus && STATUS_PROJETO.includes(novoStatus) ? novoStatus : null;
  const { error } = await supabase
    .from("projeto_atualizacoes")
    .insert({ projeto_id: projetoId, autor_id: user.id, texto: limpo.slice(0, 2000), status_novo: status, origem: "chat" });
  if (error) return { erro: colunaAusente(error.code) ? MIGRACAO_PROJETOS : "Não foi possível registrar a atualização." };
  if (status) await supabase.from("projetos").update({ status }).eq("id", projetoId);

  const rotulo = status ? STATUS_PROJETO_ROTULO[status as keyof typeof STATUS_PROJETO_ROTULO] : null;
  const mensagem = `🗂️ Atualização — ${nome}: ${limpo}${rotulo ? `\nSituação: ${rotulo}` : ""}`;
  const { error: errMsg } = await supabase.from("chat_mensagens").insert({
    conversa_id: conversaId,
    autor_id: user.id,
    texto: mensagem.slice(0, 2000),
    projeto_id: projetoId,
  });
  if (errMsg) {
    return { erro: colunaAusente(errMsg.code) ? MIGRACAO_PROJETOS : "Atualização salva, mas não foi possível avisar na conversa." };
  }

  await avisarNovaMensagem(supabase, user.id, conversaId, mensagem);
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/projetos");
  return { ok: true };
}
