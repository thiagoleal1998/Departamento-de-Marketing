"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ehLideranca } from "@/lib/permissions";
import { diaBrasilia } from "@/lib/utils";
import { registrarAcao } from "@/features/atividade/registro";
import { pendenciasDoCadastro, pendenciasDoFluxo } from "./validacao";
import { FLUXO_VAZIO, MESES_ATE_REVISAO, type DadosFluxo, type Pendencia, type Processo, type TipoFluxo } from "./tipos";

type Resultado = { ok?: boolean; erro?: string; id?: string; pendencias?: Pendencia[] };

const MIGRACAO = "Fluxos e processos ainda não foram ativados no banco (rode a migration 0085 no Supabase).";
const tabelaAusente = (c?: string) => c === "42P01" || c === "PGRST205" || c === "42703" || c === "PGRST204";

async function contexto() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, erro: "Sessão expirada. Entre novamente." };
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!ehLideranca((data as { role: string } | null)?.role as never)) return { supabase, user, erro: "Só a liderança altera processos." };
  return { supabase, user, erro: null as string | null };
}

async function historico(supabase: Awaited<ReturnType<typeof criarClienteServidor>>, processoId: string, autor: string, acao: string, detalhe?: string) {
  await supabase.from("proc_historico").insert({ processo_id: processoId, autor_id: autor, acao, detalhe: detalhe ?? null });
}

const FLUXO_INICIAL: DadosFluxo = {
  nodes: [
    { id: "inicio", type: "bloco", position: { x: 300, y: 0 }, data: { tipo: "inicio", nome: "Início" } },
    { id: "fim", type: "bloco", position: { x: 300, y: 240 }, data: { tipo: "fim", nome: "Fim" } },
  ],
  edges: [],
};

/** Cria um processo em rascunho (com código automático) e um fluxo atual com Início e Fim. */
export async function criarProcesso(nome: string, macroprocessoId: string | null): Promise<Resultado> {
  const { supabase, user, erro } = await contexto();
  if (erro || !user) return { erro: erro ?? "Sessão expirada." };
  const limpo = nome.trim().slice(0, 150);
  if (!limpo) return { erro: "Dê um nome ao processo." };

  let sigla = "GER";
  if (macroprocessoId) {
    const { data: m, error } = await supabase.from("proc_macroprocessos").select("sigla").eq("id", macroprocessoId).maybeSingle();
    if (error) return { erro: tabelaAusente(error.code) ? MIGRACAO : "Não foi possível criar o processo." };
    sigla = (m as { sigla: string } | null)?.sigla ?? sigla;
  }
  const prefixo = `MKT-${sigla}-`;
  const { data: existentes, error: errCod } = await supabase.from("proc_processos").select("codigo").like("codigo", prefixo + "%");
  if (errCod) return { erro: tabelaAusente(errCod.code) ? MIGRACAO : "Não foi possível criar o processo." };
  const maior = ((existentes as { codigo: string }[] | null) ?? []).reduce((n, c) => Math.max(n, Number(c.codigo.slice(prefixo.length)) || 0), 0);
  const codigo = prefixo + String(maior + 1).padStart(3, "0");

  const { data, error } = await supabase
    .from("proc_processos")
    .insert({ codigo, nome: limpo, macroprocesso_id: macroprocessoId, criado_por: user.id })
    .select("id")
    .single();
  if (error || !data) return { erro: tabelaAusente(error?.code) ? MIGRACAO : "Não foi possível criar o processo." };
  const id = (data as { id: string }).id;
  await supabase.from("proc_fluxos").insert({ processo_id: id, tipo: "atual", dados: FLUXO_INICIAL });
  await historico(supabase, id, user.id, "Criou o processo", `${codigo} — ${limpo}`);
  await registrarAcao(user.id, "Criou um processo", limpo, "/gestao/processos");
  revalidatePath("/gestao/processos");
  return { ok: true, id };
}

export interface DadosCadastro {
  nome: string;
  macroprocesso_id: string | null;
  descricao: string;
  objetivo: string;
  gatilho: string;
  entradas: string;
  saidas: string;
  responsavel_id: string | null;
  areas: string[];
  ferramentas: string[];
  prazo_referencia: string;
  indicadores: string;
  documentos: string;
}

const limpar = (s: string, max = 4000) => s.trim().slice(0, max) || null;
const lista = (v: string[]) => Array.from(new Set(v.map((x) => x.trim()).filter(Boolean))).slice(0, 30);

/** Salva o cadastro do processo. Editar um processo publicado o põe "em revisão" (a versão publicada continua valendo). */
export async function salvarCadastro(id: string, d: DadosCadastro): Promise<Resultado> {
  const { supabase, user, erro } = await contexto();
  if (erro || !user) return { erro: erro ?? "Sessão expirada." };
  const nome = d.nome.trim().slice(0, 150);
  if (!nome) return { erro: "O processo precisa de um nome." };

  const { data: atual } = await supabase.from("proc_processos").select("status").eq("id", id).maybeSingle();
  const status = (atual as { status: string } | null)?.status;
  const { error } = await supabase
    .from("proc_processos")
    .update({
      nome,
      macroprocesso_id: d.macroprocesso_id || null,
      descricao: limpar(d.descricao),
      objetivo: limpar(d.objetivo),
      gatilho: limpar(d.gatilho),
      entradas: limpar(d.entradas),
      saidas: limpar(d.saidas),
      responsavel_id: d.responsavel_id || null,
      areas: lista(d.areas),
      ferramentas: lista(d.ferramentas),
      prazo_referencia: limpar(d.prazo_referencia, 200),
      indicadores: limpar(d.indicadores),
      documentos: limpar(d.documentos),
      updated_at: new Date().toISOString(),
      ...(status === "publicado" ? { status: "revisao" } : {}),
    })
    .eq("id", id);
  if (error) return { erro: "Não foi possível salvar o cadastro." };
  await historico(supabase, id, user.id, status === "publicado" ? "Editou o cadastro (em revisão)" : "Editou o cadastro");
  revalidatePath("/gestao/processos");
  revalidatePath(`/gestao/processos/${id}`);
  return { ok: true };
}

/** Salva o fluxo (chamado pelo salvamento automático do editor). */
export async function salvarFluxo(processoId: string, tipo: TipoFluxo, dados: DadosFluxo): Promise<Resultado> {
  const { supabase, user, erro } = await contexto();
  if (erro || !user) return { erro: erro ?? "Sessão expirada." };
  if (!Array.isArray(dados?.nodes) || !Array.isArray(dados?.edges)) return { erro: "Fluxo inválido." };
  if (dados.nodes.length > 400 || dados.edges.length > 800) return { erro: "O fluxo ficou grande demais." };

  const { error } = await supabase
    .from("proc_fluxos")
    .upsert({ processo_id: processoId, tipo, dados, updated_at: new Date().toISOString() }, { onConflict: "processo_id,tipo" });
  if (error) return { erro: tabelaAusente(error.code) ? MIGRACAO : "Não foi possível salvar o fluxo." };

  // Fluxo atual de um processo publicado: passa a "em revisão"; a versão publicada continua a vigente.
  if (tipo === "atual") {
    const { data: p } = await supabase.from("proc_processos").select("status").eq("id", processoId).maybeSingle();
    if ((p as { status: string } | null)?.status === "publicado") {
      await supabase.from("proc_processos").update({ status: "revisao", updated_at: new Date().toISOString() }).eq("id", processoId);
      await historico(supabase, processoId, user.id, "Editou o fluxo (em revisão)");
      revalidatePath("/gestao/processos");
      revalidatePath(`/gestao/processos/${processoId}`);
    }
  }
  return { ok: true };
}

function somarMeses(dia: string, meses: number): string {
  const d = new Date(dia + "T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d.toISOString().slice(0, 10);
}

/** Publica o processo: só com as regras de qualidade cumpridas. Guarda uma cópia do fluxo como versão vigente. */
export async function publicarProcesso(id: string): Promise<Resultado> {
  const { supabase, user, erro } = await contexto();
  if (erro || !user) return { erro: erro ?? "Sessão expirada." };

  const { data: p } = await supabase.from("proc_processos").select("*").eq("id", id).maybeSingle();
  const processo = p as Processo | null;
  if (!processo) return { erro: "Processo não encontrado." };
  const { data: f } = await supabase.from("proc_fluxos").select("dados").eq("processo_id", id).eq("tipo", "atual").maybeSingle();
  const fluxo = ((f as { dados: DadosFluxo } | null)?.dados ?? FLUXO_VAZIO) as DadosFluxo;

  const erros = [...pendenciasDoCadastro(processo), ...pendenciasDoFluxo(fluxo)].filter((x) => x.nivel === "erro");
  if (erros.length > 0) return { erro: "Ainda há pendências para publicar.", pendencias: erros };

  const hoje = diaBrasilia(new Date());
  const jaPublicado = processo.publicado_em !== null;
  const versao = jaPublicado ? processo.versao + 1 : processo.versao;
  const { error } = await supabase
    .from("proc_processos")
    .update({
      status: "publicado",
      versao,
      publicado_em: new Date().toISOString(),
      ultima_revisao: hoje,
      proxima_revisao: somarMeses(hoje, MESES_ATE_REVISAO),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { erro: "Não foi possível publicar." };
  await supabase.from("proc_fluxos").update({ publicado: fluxo }).eq("processo_id", id).eq("tipo", "atual");
  await historico(supabase, id, user.id, "Publicou", `Versão ${versao}`);
  await registrarAcao(user.id, "Publicou um processo", `${processo.codigo} v${versao}`, "/gestao/processos");
  revalidatePath("/gestao/processos");
  revalidatePath(`/gestao/processos/${id}`);
  return { ok: true };
}

/** Marca como revisado hoje (sem mudar o conteúdo) e agenda a próxima revisão. */
export async function marcarRevisado(id: string): Promise<Resultado> {
  const { supabase, user, erro } = await contexto();
  if (erro || !user) return { erro: erro ?? "Sessão expirada." };
  const hoje = diaBrasilia(new Date());
  const { error } = await supabase.from("proc_processos").update({ ultima_revisao: hoje, proxima_revisao: somarMeses(hoje, MESES_ATE_REVISAO) }).eq("id", id);
  if (error) return { erro: "Não foi possível registrar a revisão." };
  await historico(supabase, id, user.id, "Revisão periódica feita", "Sem mudanças no conteúdo");
  revalidatePath("/gestao/processos");
  revalidatePath(`/gestao/processos/${id}`);
  return { ok: true };
}

/** Cria o fluxo proposto como cópia do atual (para desenhar melhorias sem mexer no que vale hoje). */
export async function criarFluxoProposto(processoId: string): Promise<Resultado> {
  const { supabase, user, erro } = await contexto();
  if (erro || !user) return { erro: erro ?? "Sessão expirada." };
  const { data: f } = await supabase.from("proc_fluxos").select("dados").eq("processo_id", processoId).eq("tipo", "atual").maybeSingle();
  const dados = (f as { dados: DadosFluxo } | null)?.dados ?? FLUXO_INICIAL;
  const { error } = await supabase.from("proc_fluxos").upsert({ processo_id: processoId, tipo: "proposto", dados }, { onConflict: "processo_id,tipo" });
  if (error) return { erro: "Não foi possível criar o fluxo proposto." };
  await historico(supabase, processoId, user.id, "Criou o fluxo proposto", "Cópia do fluxo atual");
  revalidatePath(`/gestao/processos/${processoId}`);
  return { ok: true };
}

export async function descartarFluxoProposto(processoId: string): Promise<Resultado> {
  const { supabase, user, erro } = await contexto();
  if (erro || !user) return { erro: erro ?? "Sessão expirada." };
  const { error } = await supabase.from("proc_fluxos").delete().eq("processo_id", processoId).eq("tipo", "proposto");
  if (error) return { erro: "Não foi possível descartar." };
  await historico(supabase, processoId, user.id, "Descartou o fluxo proposto");
  revalidatePath(`/gestao/processos/${processoId}`);
  return { ok: true };
}

/** Troca o fluxo atual pelo proposto (a melhoria foi implantada). O processo fica "em revisão" até ser publicado. */
export async function adotarFluxoProposto(processoId: string): Promise<Resultado> {
  const { supabase, user, erro } = await contexto();
  if (erro || !user) return { erro: erro ?? "Sessão expirada." };
  const { data: f } = await supabase.from("proc_fluxos").select("dados").eq("processo_id", processoId).eq("tipo", "proposto").maybeSingle();
  const dados = (f as { dados: DadosFluxo } | null)?.dados;
  if (!dados) return { erro: "Não há fluxo proposto." };
  await supabase.from("proc_fluxos").update({ dados, updated_at: new Date().toISOString() }).eq("processo_id", processoId).eq("tipo", "atual");
  await supabase.from("proc_fluxos").delete().eq("processo_id", processoId).eq("tipo", "proposto");
  await supabase.from("proc_processos").update({ status: "revisao", updated_at: new Date().toISOString() }).eq("id", processoId).eq("status", "publicado");
  await historico(supabase, processoId, user.id, "Adotou o fluxo proposto como o atual", "Publique para tornar vigente");
  revalidatePath("/gestao/processos");
  revalidatePath(`/gestao/processos/${processoId}`);
  return { ok: true };
}

export async function excluirProcesso(id: string): Promise<Resultado> {
  const { supabase, user, erro } = await contexto();
  if (erro || !user) return { erro: erro ?? "Sessão expirada." };
  const { data: p } = await supabase.from("proc_processos").select("codigo, nome").eq("id", id).maybeSingle();
  const { error } = await supabase.from("proc_processos").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir." };
  await registrarAcao(user.id, "Excluiu um processo", (p as { codigo: string; nome: string } | null)?.nome ?? null, "/gestao/processos");
  revalidatePath("/gestao/processos");
  return { ok: true };
}

/** Cria ou altera um macroprocesso (as categorias são editáveis). */
export async function salvarMacroprocesso(id: string | null, nome: string, sigla: string, descricao: string): Promise<Resultado> {
  const { supabase, erro } = await contexto();
  if (erro) return { erro };
  const n = nome.trim().slice(0, 100);
  const s = sigla.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  if (!n) return { erro: "Dê um nome ao macroprocesso." };
  if (s.length < 2) return { erro: "A sigla precisa de 2 a 4 letras (ex.: COM)." };
  if (id) {
    const { error } = await supabase.from("proc_macroprocessos").update({ nome: n, sigla: s, descricao: limpar(descricao, 400) }).eq("id", id);
    if (error) return { erro: "Não foi possível salvar." };
  } else {
    const { data: ult } = await supabase.from("proc_macroprocessos").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("proc_macroprocessos").insert({ nome: n, sigla: s, descricao: limpar(descricao, 400), ordem: ((ult as { ordem: number } | null)?.ordem ?? 0) + 1 });
    if (error) return { erro: tabelaAusente(error.code) ? MIGRACAO : "Não foi possível criar." };
  }
  revalidatePath("/gestao/processos");
  return { ok: true };
}

export async function excluirMacroprocesso(id: string): Promise<Resultado> {
  const { supabase, erro } = await contexto();
  if (erro) return { erro };
  const { count } = await supabase.from("proc_processos").select("id", { count: "exact", head: true }).eq("macroprocesso_id", id);
  if ((count ?? 0) > 0) return { erro: `Há ${count} processo(s) neste macroprocesso. Mude-os de macroprocesso antes de excluir.` };
  const { error } = await supabase.from("proc_macroprocessos").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir." };
  revalidatePath("/gestao/processos");
  return { ok: true };
}
