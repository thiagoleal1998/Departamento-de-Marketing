"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { avisarDiretoria } from "@/features/executivo/avisos";
import { tarefaParaEtapaStatus } from "@/features/projetos/tarefa";
import { ehRaiz } from "@/lib/pastas";
import { registrarAcao } from "@/features/atividade/registro";
import { TAREFA_STATUS_META } from "@/types";
import { normalizarLembretes } from "@/lib/lembretes";
import type { TarefaStatus } from "@/types";
import { diaBrasilia, prazoParaGravar } from "@/lib/utils";
import { registrarEventosTarefa, type NovoEvento } from "./historico";
import { MOTIVOS_PRAZO } from "./historico-tipos";

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
  if (antes && antes.status !== novoStatus) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await registrarAcao(user.id, "Moveu a tarefa de coluna", `${antes.titulo} → ${TAREFA_STATUS_META[novoStatus]?.label ?? novoStatus}`, "/operacional");
      await registrarEventosTarefa(tarefaId, user.id, [{ campo: "status", de: TAREFA_STATUS_META[antes.status as TarefaStatus]?.label ?? antes.status, para: TAREFA_STATUS_META[novoStatus]?.label ?? novoStatus }]);
    }
  }
  revalidatePath("/operacional");
}

/**
 * Posiciona um card: muda de coluna (se for o caso) e grava a ordem de todos os cards da coluna, na sequência
 * em que aparecem no quadro (de cima para baixo). A leitura passa pela regra de acesso; a gravação da ordem usa
 * a chave de serviço, só nos cards que a pessoa enxerga.
 */
export async function posicionarTarefa(
  tarefaId: string,
  novoStatus: TarefaStatus,
  idsDaColuna: string[]
): Promise<{ ok?: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  if (!servicoDisponivel()) return { erro: "Reordenação indisponível no momento." };

  const { data: antes } = await supabase.from("tarefas").select("status").eq("id", tarefaId).maybeSingle();
  if (!antes) return { erro: "Você não tem permissão para mexer neste card." };
  if (antes.status !== novoStatus) await moverTarefa(tarefaId, novoStatus);

  const ids = Array.from(new Set(idsDaColuna)).slice(0, 1500);
  // Só reordena o que a pessoa enxerga (a liderança enxerga tudo).
  const permitidos = new Set<string>();
  for (let i = 0; i < ids.length; i += 80) {
    const { data } = await supabase.from("tarefas").select("id").in("id", ids.slice(i, i + 80));
    for (const t of (data as { id: string }[] | null) ?? []) permitidos.add(t.id);
  }
  const admin = criarClienteAdmin();
  const ordenados = ids.filter((id) => permitidos.has(id));
  for (let i = 0; i < ordenados.length; i += 25) {
    await Promise.all(
      ordenados.slice(i, i + 25).map((id, k) => admin.from("tarefas").update({ ordem: (i + k + 1) * 10 }).eq("id", id))
    );
  }
  revalidatePath("/operacional");
  return { ok: true };
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

/** Duplica os dados salvos em um card independente, sem reutilizar identidade ou vínculos de execução. */
export async function duplicarTarefa(tarefaId: string): Promise<{ id?: string; erro?: string }> {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  if (!servicoDisponivel()) return { erro: "Duplicação indisponível no momento." };

  // A origem precisa ser visível pela RLS, inclusive para o colaborador do card.
  const { data: origem } = await supabase.from("tarefas").select("*").eq("id", tarefaId).maybeSingle();
  if (!origem) return { erro: "Tarefa não encontrada ou sem permissão." };
  const { data: perfil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!perfil) return { erro: "Não foi possível conferir sua permissão." };
  const lideranca = perfil.role === "gerente" || perfil.role === "lider";
  const responsavel = lideranca ? origem.responsavel_id ?? null : user.id;

  const dados: Record<string, unknown> = {
    titulo: String(origem.titulo).slice(0, 192) + " (cópia)",
    descricao: origem.descricao,
    status: "a_fazer",
    responsavel_id: responsavel,
    prazo: origem.prazo, // Já é um timestamp: preserva exatamente o prazo salvo.
    ordem: 0,
  };
  // Só copia colunas presentes na origem: continua funcionando com migrations opcionais pendentes.
  for (const campo of ["prioridade", "tag", "link", "conteudo", "pasta_raiz", "pasta_caminho", "link_site", "solicitante", "lembretes", "colaborador_id"]) {
    if (Object.prototype.hasOwnProperty.call(origem, campo)) dados[campo] = origem[campo];
  }
  if (dados.colaborador_id === responsavel) dados.colaborador_id = null;
  if (lideranca && Object.prototype.hasOwnProperty.call(origem, "responsaveis_notion")) dados.responsaveis_notion = origem.responsaveis_notion;

  const admin = criarClienteAdmin();
  const { data: copia, error } = await admin.from("tarefas").insert(dados).select("id").single();
  if (error || !copia) return { erro: "Não foi possível duplicar a tarefa. Tente novamente." };

  await registrarEventosTarefa(copia.id, user.id, [{ campo: "criada", para: String(dados.titulo), detalhe: "Duplicada de: " + origem.titulo }]);
  await registrarAcao(user.id, "Duplicou a tarefa", origem.titulo, "/operacional");
  const destinatarios = Array.from(new Set([responsavel, dados.colaborador_id].filter((id): id is string => typeof id === "string" && id !== user.id)));
  if (destinatarios.length) {
    await admin.from("notificacoes").insert(destinatarios.map((destinatario_id) => ({
      destinatario_id,
      tipo: "tarefa",
      titulo: "Nova tarefa duplicada: " + dados.titulo,
      link: "/operacional?tarefa=" + copia.id,
    })));
  }
  revalidatePath("/operacional");
  return { id: copia.id };
}

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
  pasta_raiz?: string | null;
  pasta_caminho?: string;
  colaborador_id?: string | null;
  link_site?: string;
  lembretes?: number[];
  solicitante?: string;
  /** Motivo (chave da lista) da mudança do prazo; obrigatório ao ADIAR um prazo que já existia. */
  prazo_motivo?: string;
  prazo_motivo_detalhe?: string;
}

/** Limpa o caminho: sem letra de unidade no começo, sem barras sobrando. */
function limparPasta(raiz: string | null | undefined, caminho: string | undefined) {
  const c = (caminho ?? "").trim().replace(/\//g, "\\").replace(/^[A-Za-z]:\\*/, "").replace(/^\\+/, "").slice(0, 500);
  return { pasta_raiz: c && ehRaiz(raiz) ? raiz : c ? "corporativo" : null, pasta_caminho: c || null };
}

const AVISO_PASTA = "O card foi salvo, mas o caminho da pasta não: falta rodar a migration 0069 no Supabase.";
const AVISO_LEMBRETES = "O card foi salvo, mas os lembretes não: falta rodar a migration 0073 no Supabase.";
const AVISO_LINK_SITE = "O card foi salvo, mas o link do site não: falta rodar a migration 0071 no Supabase.";
const AVISO_SOLICITANTE = "O card foi salvo, mas o solicitante não: falta rodar a migration 0086 no Supabase.";
const AVISO_COLABORADOR = "O card foi salvo, mas o colaborador não: falta rodar a migration 0070 no Supabase.";

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
  const linkSite = (d.link_site ?? "").trim();
  if (linkSite && !/^https?:\/\//i.test(linkSite)) return { erro: "O link do site deve começar com http:// ou https://." };

  // A leitura passa pela RLS: só enxerga o card quem é da liderança ou o responsável atual.
  const { data: antes } = await supabase.from("tarefas").select("status, responsavel_id, prazo, titulo, prioridade").eq("id", tarefaId).maybeSingle();
  if (!antes) return { erro: "Você não tem permissão para editar este card." };
  // Colaborador e solicitante ficam em colunas à parte (sem as migrations 0070/0086 a leitura falha e segue sem elas).
  const { data: extra } = await supabase.from("tarefas").select("colaborador_id, solicitante").eq("id", tarefaId).maybeSingle();
  const antesExtra = (extra as { colaborador_id: string | null; solicitante: string | null } | null) ?? { colaborador_id: null, solicitante: null };

  // Prazo adiado (nova data depois da anterior): é preciso dizer o motivo, escolhido na lista.
  const diaAntes = antes.prazo ? diaBrasilia(antes.prazo as string) : null;
  const diaDepois = d.prazo || null;
  const adiando = !!diaAntes && !!diaDepois && diaDepois > diaAntes;
  const motivoPrazo = MOTIVOS_PRAZO.some(([k]) => k === d.prazo_motivo) ? (d.prazo_motivo as string) : null;
  if (adiando && !motivoPrazo) return { erro: "Informe o motivo do adiamento do prazo." };

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
      prazo: prazoParaGravar(d.prazo),
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

  // Gravado à parte: sem a migration 0069 o restante do card continua salvando.
  let avisoPasta: string | null = null;
  if (d.lembretes !== undefined) {
    const { error: errLemb } = await gravador.from("tarefas").update({ lembretes: normalizarLembretes(d.lembretes) }).eq("id", tarefaId);
    if (errLemb) avisoPasta = AVISO_LEMBRETES;
  }
  if (d.link_site !== undefined) {
    const { error: errSite } = await gravador.from("tarefas").update({ link_site: linkSite || null }).eq("id", tarefaId);
    if (errSite) avisoPasta = avisoPasta ?? AVISO_LINK_SITE;
  }
  // Solicitante: à parte (migration 0086).
  if (d.solicitante !== undefined) {
    const { error: errSol } = await gravador.from("tarefas").update({ solicitante: d.solicitante.trim().slice(0, 120) || null }).eq("id", tarefaId);
    if (errSol) avisoPasta = avisoPasta ?? AVISO_SOLICITANTE;
  }
  // Colaborador: também à parte (migration 0070). Quem entra agora é avisado.
  if (d.colaborador_id !== undefined) {
    const { data: ant } = await supabase.from("tarefas").select("colaborador_id").eq("id", tarefaId).maybeSingle();
    const anterior = (ant as { colaborador_id: string | null } | null)?.colaborador_id ?? null;
    const novo = d.colaborador_id || null;
    if (novo !== anterior) {
      const { error: errColab } = await gravador.from("tarefas").update({ colaborador_id: novo }).eq("id", tarefaId);
      if (errColab) avisoPasta = avisoPasta ?? AVISO_COLABORADOR;
      else if (novo && novo !== user.id && servicoDisponivel()) {
        await criarClienteAdmin().from("notificacoes").insert({
          destinatario_id: novo,
          tipo: "tarefa",
          titulo: "Você foi incluído(a) como colaborador no card: " + titulo,
          link: "/operacional?tarefa=" + tarefaId,
        });
      }
    }
  }
  if (d.pasta_caminho !== undefined) {
    const { error: errPasta } = await gravador.from("tarefas").update(limparPasta(d.pasta_raiz, d.pasta_caminho)).eq("id", tarefaId);
    if (errPasta) avisoPasta = avisoPasta ?? AVISO_PASTA;
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
  // Linha do tempo do card: o que mudou (com o motivo, quando o prazo mudou).
  try {
    const rotulo = (s: string) => TAREFA_STATUS_META[s as TarefaStatus]?.label ?? s;
    const eventos: NovoEvento[] = [];
    if (antes.status !== d.status) eventos.push({ campo: "status", de: rotulo(antes.status as string), para: rotulo(d.status) });
    if (diaAntes !== diaDepois) {
      eventos.push({ campo: "prazo", de: diaAntes, para: diaDepois, motivo: motivoPrazo, detalhe: d.prazo_motivo_detalhe?.trim() || null });
    }
    if ((antes.titulo as string) !== titulo) eventos.push({ campo: "titulo", de: antes.titulo as string, para: titulo });
    if ((antes.prioridade ?? null) !== (d.prioridade ?? null)) eventos.push({ campo: "prioridade", de: antes.prioridade ? String(antes.prioridade) : null, para: d.prioridade ? String(d.prioridade) : null });
    const solicitanteDepois = d.solicitante !== undefined ? d.solicitante.trim() || null : antesExtra.solicitante;
    if ((antesExtra.solicitante ?? null) !== solicitanteDepois) eventos.push({ campo: "solicitante", de: antesExtra.solicitante, para: solicitanteDepois });
    const respDepois = d.responsavel_id || null;
    const colabDepois = d.colaborador_id !== undefined ? d.colaborador_id || null : antesExtra.colaborador_id;
    const respMudou = (antes.responsavel_id ?? null) !== respDepois;
    const colabMudou = (antesExtra.colaborador_id ?? null) !== colabDepois;
    if ((respMudou || colabMudou) && servicoDisponivel()) {
      const ids = [antes.responsavel_id, respDepois, antesExtra.colaborador_id, colabDepois].filter((x): x is string => !!x);
      const { data: ps } = await criarClienteAdmin().from("profiles").select("id, nome").in("id", ids);
      const nome = (id: string | null) => (id ? ((ps as { id: string; nome: string }[] | null) ?? []).find((p) => p.id === id)?.nome ?? null : null);
      if (respMudou) eventos.push({ campo: "responsavel", de: nome(antes.responsavel_id ?? null), para: nome(respDepois) });
      if (colabMudou) eventos.push({ campo: "colaborador", de: nome(antesExtra.colaborador_id), para: nome(colabDepois) });
    }
    await registrarEventosTarefa(tarefaId, user.id, eventos);
  } catch {
    // o histórico é complementar
  }
  await registrarAcao(user.id, "Editou a tarefa", titulo, "/operacional");
  revalidatePath("/operacional");
  if (avisoPasta) return { erro: avisoPasta };
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
    .select("id, responsavel_id, titulo")
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

  await registrarAcao(user.id, "Excluiu a tarefa", (tarefa as { titulo?: string }).titulo ?? null, "/operacional");
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
  pasta_raiz?: string | null;
  pasta_caminho?: string;
  colaborador_id?: string | null;
  link_site?: string;
  lembretes?: number[];
  solicitante?: string;
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
  const linkSite = (d.link_site ?? "").trim();
  if (linkSite && !/^https?:\/\//i.test(linkSite)) return { erro: "O link do site deve começar com http:// ou https://." };
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
      prazo: prazoParaGravar(d.prazo),
      prioridade: d.prioridade,
      tag: d.tag.trim() || null,
      link: link || null,
    })
    .select("id")
    .single();
  if (error || !data) return { erro: "Não foi possível criar o card. Tente novamente." };
  const id = (data as { id: string }).id;
  if (d.pasta_caminho?.trim()) {
    // Sem a migration 0069 o card é criado do mesmo jeito; o caminho pode ser informado depois de rodá-la.
    await admin.from("tarefas").update(limparPasta(d.pasta_raiz, d.pasta_caminho)).eq("id", id);
  }

  // Sem a migration 0086 o card é criado do mesmo jeito, só sem o solicitante.
  if (d.solicitante?.trim()) await admin.from("tarefas").update({ solicitante: d.solicitante.trim().slice(0, 120) }).eq("id", id);
  // Sem a migration 0071 o card é criado do mesmo jeito, só sem o link do site.
  if (linkSite) await admin.from("tarefas").update({ link_site: linkSite }).eq("id", id);
  // Sem a migration 0073 o card é criado do mesmo jeito, só sem os lembretes.
  const lembretes = normalizarLembretes(d.lembretes);
  if (lembretes.length > 0) await admin.from("tarefas").update({ lembretes }).eq("id", id);
  if (d.colaborador_id && d.colaborador_id !== responsavel) {
    // Sem a migration 0070 o card é criado do mesmo jeito, só sem o colaborador.
    const { error: errColab } = await admin.from("tarefas").update({ colaborador_id: d.colaborador_id }).eq("id", id);
    if (!errColab && d.colaborador_id !== user.id) {
      await admin.from("notificacoes").insert({
        destinatario_id: d.colaborador_id,
        tipo: "tarefa",
        titulo: `Você foi incluído(a) como colaborador no card: ${titulo}`,
        link: "/operacional?tarefa=" + id,
      });
    }
  }
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
  await registrarAcao(user.id, "Criou a tarefa", titulo, "/operacional");
  await registrarEventosTarefa(id, user.id, [{ campo: "criada", para: titulo }]);
  revalidatePath("/operacional");
  return { ok: true, id };
}
