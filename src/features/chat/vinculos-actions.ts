"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { ehLideranca } from "@/lib/permissions";
import { avisarNovaMensagem } from "./aviso";
import {
  STATUS_PROJETO_ROTULO,
  refsDe,
  type DadosVinculo,
  type ItemEstoqueChat,
  type ItemVinculado,
  type NovoVinculo,
  type ProjetoChat,
  type RefItem,
  type TarefaChat,
} from "./vinculo-tipos";

type Resultado = { ok?: boolean; erro?: string };

const STATUS_PROJETO = ["planejamento", "em_andamento", "concluido", "cancelado"];
const MIGRACAO = "O recurso de vínculos ainda não foi ativado no banco (migration 0049).";
const MIGRACAO_ITENS = "Para vincular vários itens é preciso aplicar a migration 0051 no banco.";
const MIGRACAO_PROJETOS = "As atualizações de projeto ainda não foram ativadas no banco (migration 0050).";
const colunaAusente = (c?: string) => c === "42703" || c === "PGRST204" || c === "42P01" || c === "PGRST205";
const MAX_ITENS = 20;

const ID_RE = /^[0-9a-f-]{36}$/i;
function limparRefs(refs: RefItem[]): RefItem[] {
  const vistos = new Set<string>();
  const out: RefItem[] = [];
  for (const r of refs ?? []) {
    if (!r?.id || !ID_RE.test(r.id) || vistos.has(r.id)) continue;
    vistos.add(r.id);
    const q = Math.floor(Number(r.qtd));
    out.push({ id: r.id, qtd: Number.isFinite(q) && q > 0 ? q : null });
    if (out.length >= MAX_ITENS) break;
  }
  return out;
}

async function usuarioAtual() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, papel: null as string | null };
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, user, papel: (data as { role: string } | null)?.role ?? null };
}

/** Envia uma mensagem ligada a itens do estoque, a uma nova tarefa e/ou a um projeto. */
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

  const refs = limparRefs(vinculo.itens);
  let nomes: string[] = [];
  if (refs.length > 0) {
    const { data } = await supabase.from("estoque_itens").select("id, nome").in("id", refs.map((r) => r.id));
    const achados = (data as { id: string; nome: string }[] | null) ?? [];
    if (achados.length !== refs.length) return { erro: "Algum item do estoque não foi encontrado." };
    nomes = refs.map((r) => achados.find((a) => a.id === r.id)!.nome);
  }
  const primeiro = refs[0]?.id ?? null;

  let tarefaId: string | null = null;
  if (vinculo.tarefa) {
    if (!ehLideranca(papel as never)) return { erro: "Só a liderança cria tarefas pelo chat." };
    const sugestao = nomes.length === 1 ? `Repor: ${nomes[0]}` : nomes.length > 1 ? `Repor ${nomes.length} itens do estoque` : limpo.slice(0, 80);
    const titulo = vinculo.tarefa.titulo.trim().slice(0, 200) || sugestao;
    const prazo = /^\d{4}-\d{2}-\d{2}$/.test(vinculo.tarefa.prazo ?? "") ? `${vinculo.tarefa.prazo}T12:00:00-03:00` : null;
    const base = {
      titulo,
      descricao: nomes.length > 0 ? `${limpo}\n\nItens: ${nomes.join(", ")}` : limpo,
      status: "a_fazer",
      responsavel_id: vinculo.tarefa.responsavelId,
      prazo,
      estoque_item_id: primeiro,
    };
    let { data: t, error } = await supabase
      .from("tarefas")
      .insert({ ...base, estoque_itens: refs })
      .select("id")
      .single();
    if (error && colunaAusente(error.code)) {
      if (refs.length > 1) return { erro: MIGRACAO_ITENS };
      ({ data: t, error } = await supabase.from("tarefas").insert(base).select("id").single());
    }
    if (error || !t) return { erro: colunaAusente(error?.code) ? MIGRACAO : "Não foi possível criar a tarefa." };
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

  const baseMsg = {
    conversa_id: conversaId,
    autor_id: user.id,
    texto: limpo,
    tarefa_id: tarefaId,
    estoque_item_id: primeiro,
    ...(projetoId ? { projeto_id: projetoId } : {}),
  };
  let { error } = await supabase.from("chat_mensagens").insert({ ...baseMsg, estoque_itens: refs });
  if (error && colunaAusente(error.code)) {
    if (refs.length > 1) return { erro: MIGRACAO_ITENS };
    ({ error } = await supabase.from("chat_mensagens").insert(baseMsg));
  }
  if (error) {
    return {
      erro: colunaAusente(error.code) ? (projetoId ? MIGRACAO_PROJETOS : MIGRACAO) : "Não foi possível enviar. Tente novamente.",
    };
  }

  await avisarNovaMensagem(supabase, user.id, conversaId, limpo);
  revalidatePath("/operacional");
  return { ok: true };
}

/** Dados atuais da tarefa, dos itens e do projeto vinculados a uma mensagem. */
export async function dadosVinculo(
  tarefaId: string | null,
  itensMsg: RefItem[],
  projetoId: string | null = null
): Promise<DadosVinculo> {
  const { supabase, user, papel } = await usuarioAtual();
  if (!user) return { tarefa: null, itens: [], projeto: null, podeMudarStatusProjeto: false, podeResponder: false };

  let tarefa: TarefaChat | null = null;
  if (tarefaId) {
    let { data, error } = await supabase
      .from("tarefas")
      .select("id, titulo, status, prazo, responsavel_id, estoque_item_id, estoque_itens")
      .eq("id", tarefaId)
      .maybeSingle();
    if (error) {
      // Antes da migration 0051 a coluna estoque_itens não existe.
      ({ data } = await supabase
        .from("tarefas")
        .select("id, titulo, status, prazo, responsavel_id, estoque_item_id")
        .eq("id", tarefaId)
        .maybeSingle());
    }
    tarefa = (data as TarefaChat | null) ?? null;
  }

  // Os itens da tarefa valem sobre os da mensagem (a mensagem de resposta não os repete).
  const refs = limparRefs(tarefa ? refsDe(tarefa.estoque_itens, tarefa.estoque_item_id) : itensMsg);
  const finais = refs.length > 0 ? refs : limparRefs(itensMsg);
  let itens: ItemVinculado[] = [];
  if (finais.length > 0) {
    const { data } = await supabase
      .from("estoque_itens")
      .select("id, nome, quantidade, estoque_minimo")
      .in("id", finais.map((r) => r.id));
    const porId = new Map(((data as ItemEstoqueChat[] | null) ?? []).map((i) => [i.id, i]));
    itens = finais.flatMap((r) => {
      const i = porId.get(r.id);
      return i ? [{ ...i, pedido: r.qtd }] : [];
    });
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

  const lider = ehLideranca(papel as never);
  const podeResponder = !!tarefa && (tarefa.responsavel_id === user.id || lider);
  return { tarefa, itens, projeto, podeMudarStatusProjeto: lider, podeResponder };
}

/**
 * Responde sobre a tarefa/itens: registra entradas no estoque (uma por item) e/ou conclui a
 * tarefa e posta o resumo na conversa, já ligado ao mesmo vínculo.
 */
export async function responderVinculo(
  conversaId: string,
  tarefaId: string | null,
  itensMsg: RefItem[],
  resposta: { texto: string; entradas: { itemId: string; qtd: number }[]; concluir: boolean; andamento: boolean }
): Promise<Resultado> {
  const { supabase, user } = await usuarioAtual();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const dados = await dadosVinculo(tarefaId, itensMsg);
  if (tarefaId && !dados.tarefa) return { erro: "Tarefa não encontrada ou sem permissão." };
  if (!dados.podeResponder && tarefaId) return { erro: "Só o responsável (ou a liderança) responde por esta tarefa." };

  const partes: string[] = [];
  const texto = resposta.texto.trim();
  if (texto) partes.push(texto);

  const entradas = (resposta.entradas ?? [])
    .map((e) => ({ itemId: e.itemId, qtd: Math.floor(Number(e.qtd) || 0) }))
    .filter((e) => e.qtd > 0);
  const registradas: string[] = [];
  for (const e of entradas) {
    const item = dados.itens.find((i) => i.id === e.itemId);
    if (!item) return { erro: "Item de estoque não vinculado a esta mensagem." };
    const { data: saldo, error } = await supabase.rpc("registrar_movimento_estoque", {
      p_item: item.id,
      p_tipo: "entrada",
      p_quantidade: e.qtd,
      p_motivo: `Reposição pelo chat${dados.tarefa ? ` — ${dados.tarefa.titulo}` : ""}`,
      p_chamado: null,
      p_projeto: null,
    });
    if (error) {
      const feitas = registradas.length > 0 ? ` (já registrado: ${registradas.join("; ")})` : "";
      return { erro: (error.message || `Não foi possível registrar a entrada de “${item.nome}”.`) + feitas };
    }
    registradas.push(`${item.nome}: +${e.qtd} (estoque ${saldo as number})`);
  }
  if (registradas.length > 0) partes.push(`📦 Entradas no estoque — ${registradas.join("; ")}.`);

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

  if (partes.length === 0) return { erro: "Escreva uma resposta, informe as entradas ou marque uma ação." };

  const mensagem = partes.join("\n");
  const refs = dados.itens.map((i) => ({ id: i.id, qtd: i.pedido }));
  const baseMsg = {
    conversa_id: conversaId,
    autor_id: user.id,
    texto: mensagem.slice(0, 2000),
    tarefa_id: tarefaId,
    estoque_item_id: refs[0]?.id ?? null,
  };
  let { error } = await supabase.from("chat_mensagens").insert({ ...baseMsg, estoque_itens: refs });
  if (error && colunaAusente(error.code)) {
    ({ error } = await supabase.from("chat_mensagens").insert(baseMsg));
  }
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
