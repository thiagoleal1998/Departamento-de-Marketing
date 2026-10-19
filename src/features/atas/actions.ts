"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { notificar } from "@/features/notificacoes/enviar";
import { estadoVivoPorSerie, itemParaTarefa } from "./vivo";
import {
  CATEGORIA_LABEL,
  carregarMembros,
  MOTIVO_LABEL,
  itemAberto,
  situacaoNaData,
  type CategoriaDemanda,
  type MotivoAlteracao,
  type StatusItem,
} from "./data";

export type Resultado = { ok?: boolean; erro?: string };

const STATUS: StatusItem[] = ["nao_iniciado", "em_andamento", "concluido", "cancelado"];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

async function exigirLideranca() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, erro: "Sessão expirada. Entre novamente." };
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (data?.role !== "gerente" && data?.role !== "lider") {
    return { supabase, user, erro: "Apenas a liderança registra as atas." };
  }
  return { supabase, user, erro: null as string | null };
}

/** Só mexe em reuniões ainda em andamento. */
async function reuniaoAberta(supabase: Awaited<ReturnType<typeof criarClienteServidor>>, id: string) {
  const { data } = await supabase.from("reunioes").select("estado").eq("id", id).maybeSingle();
  return data?.estado === "em_andamento";
}

/** Cria a reunião do dia e traz os itens ainda abertos da anterior (com o andamento atual). */
export async function criarReuniao(formData: FormData) {
  const { supabase, erro } = await exigirLideranca();
  if (erro) return;
  const data = String(formData.get("data") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return;

  const { data: existente } = await supabase.from("reunioes").select("id").eq("data", data).maybeSingle();
  if (existente) redirect(`/atas/${existente.id}`);

  const { data: anterior } = await supabase
    .from("reunioes")
    .select("id, presencas")
    .lt("data", data)
    .order("data", { ascending: false })
    .limit(1)
    .maybeSingle();

  const membros = await carregarMembros();
  const presencas = (
    (anterior?.presencas as { nome: string; presenca: string; obs: string }[] | undefined) ?? []
  )
    .filter((p) => situacaoNaData(p.nome, data, membros) !== "desligado")
    .map((p) =>
      situacaoNaData(p.nome, data, membros) === "afastado"
        ? { nome: p.nome, presenca: "Afastado(a)", obs: membros.find((m) => m.nome === p.nome)?.observacao ?? "" }
        : { nome: p.nome, presenca: "Presente", obs: "" }
    );

  const { data: nova, error } = await supabase
    .from("reunioes")
    .insert({ data, estado: "em_andamento", presencas })
    .select("id")
    .single();
  if (error || !nova) return;

  if (anterior) {
    const [{ data: itens }, vivo] = await Promise.all([
      supabase
        .from("reuniao_itens")
        .select("*")
        .eq("reuniao_id", anterior.id)
        .eq("secao", "ata")
        .order("ordem", { ascending: true }),
      estadoVivoPorSerie(),
    ]);
    const copiar = ((itens ?? []) as Record<string, unknown>[])
      .map((it) => {
        const v = vivo.get(String(it.serie));
        return {
          it,
          status: (v?.status ?? (it.status as StatusItem | null)) as StatusItem | null,
          prazo: v?.prazo ?? (it.prazo as string | null),
          responsavel_id: v ? v.responsavel_id : (it.responsavel_id as string | null),
          prioridade: v?.prioridade ?? (it.prioridade as number | null),
        };
      })
      .filter((x) => itemAberto(x.status))
      .map((x, i) => ({
        reuniao_id: nova.id,
        secao: "ata",
        ordem: i + 1,
        titulo: x.it.titulo,
        serie: x.it.serie,
        detalhamento: x.it.detalhamento,
        plano_acao: x.it.plano_acao,
        prioridade: x.prioridade,
        responsavel_id: x.responsavel_id,
        responsaveis_texto: x.it.responsaveis_texto,
        link: x.it.link,
        prazo: x.prazo,
        status: x.status ?? "nao_iniciado",
        categoria: x.it.categoria ?? null,
        motivo: null,
      }));
    if (copiar.length > 0) await supabase.from("reuniao_itens").insert(copiar);
  }

  revalidatePath("/atas");
  redirect(`/atas/${nova.id}`);
}

export interface DadosItem {
  titulo: string;
  detalhamento: string;
  plano_acao: string;
  prioridade: number | null;
  responsavel_id: string | null;
  prazo: string | null; // ISO com fuso
  status: StatusItem;
  link: string;
  categoria: CategoriaDemanda | null;
  motivo: MotivoAlteracao | null;
}

export async function salvarItem(itemId: string, reuniaoId: string, d: DadosItem): Promise<Resultado> {
  const { supabase, erro } = await exigirLideranca();
  if (erro) return { erro };
  if (!(await reuniaoAberta(supabase, reuniaoId))) {
    return { erro: "Esta reunião já foi concluída." };
  }
  const titulo = d.titulo.trim();
  if (!titulo) return { erro: "O item precisa de um título." };
  if (!STATUS.includes(d.status)) return { erro: "Status inválido." };
  if (d.prioridade !== null && (d.prioridade < 1 || d.prioridade > 5)) {
    return { erro: "Prioridade deve ser de 1 a 5." };
  }
  if (d.categoria && !(d.categoria in CATEGORIA_LABEL)) return { erro: "Tipo de demanda inválido." };
  if (d.motivo && !(d.motivo in MOTIVO_LABEL)) return { erro: "Motivo inválido." };
  const base = {
    titulo,
    detalhamento: d.detalhamento.trim() || null,
    plano_acao: d.plano_acao.trim() || null,
    prioridade: d.prioridade,
    responsavel_id: d.responsavel_id || null,
    prazo: d.prazo || null,
    status: d.status,
    link: d.link.trim() || null,
  };
  let { error } = await supabase
    .from("reuniao_itens")
    .update({ ...base, categoria: d.categoria || null, motivo: d.motivo || null })
    .eq("id", itemId);
  // Colunas novas ainda não criadas (migration 0040): salva sem elas.
  if (error && (error.code === "42703" || error.code === "PGRST204")) {
    ({ error } = await supabase.from("reuniao_itens").update(base).eq("id", itemId));
  }
  if (error) return { erro: "Não foi possível salvar. Tente novamente." };
  revalidatePath(`/atas/${reuniaoId}`);
  return { ok: true };
}

export async function adicionarItem(reuniaoId: string, titulo: string): Promise<Resultado> {
  const { supabase, erro } = await exigirLideranca();
  if (erro) return { erro };
  if (!(await reuniaoAberta(supabase, reuniaoId))) return { erro: "Esta reunião já foi concluída." };
  const t = titulo.trim().slice(0, 300);
  if (!t) return { erro: "Informe o título do item." };
  const { data: ult } = await supabase
    .from("reuniao_itens")
    .select("ordem")
    .eq("reuniao_id", reuniaoId)
    .eq("secao", "ata")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("reuniao_itens").insert({
    reuniao_id: reuniaoId,
    secao: "ata",
    ordem: (ult?.ordem ?? 0) + 1,
    titulo: t,
    serie: norm(t).slice(0, 120),
    status: "nao_iniciado",
  });
  if (error) return { erro: "Não foi possível adicionar. Já existe um item com esse assunto?" };
  revalidatePath(`/atas/${reuniaoId}`);
  return { ok: true };
}

export async function removerItem(itemId: string, reuniaoId: string): Promise<Resultado> {
  const { supabase, erro } = await exigirLideranca();
  if (erro) return { erro };
  if (!(await reuniaoAberta(supabase, reuniaoId))) return { erro: "Esta reunião já foi concluída." };
  const { error } = await supabase.from("reuniao_itens").delete().eq("id", itemId);
  if (error) return { erro: "Não foi possível remover." };
  revalidatePath(`/atas/${reuniaoId}`);
  return { ok: true };
}

export async function salvarPresencas(
  reuniaoId: string,
  presencas: { nome: string; presenca: string; obs: string }[]
): Promise<Resultado> {
  const { supabase, erro } = await exigirLideranca();
  if (erro) return { erro };
  if (!(await reuniaoAberta(supabase, reuniaoId))) return { erro: "Esta reunião já foi concluída." };
  const limpas = presencas
    .slice(0, 30)
    .map((p) => ({ nome: p.nome.slice(0, 80), presenca: p.presenca.slice(0, 30), obs: p.obs.slice(0, 200) }));
  const { error } = await supabase.from("reunioes").update({ presencas: limpas }).eq("id", reuniaoId);
  if (error) return { erro: "Não foi possível salvar a presença." };
  revalidatePath(`/atas/${reuniaoId}`);
  return { ok: true };
}

/**
 * Conclui a reunião: cada item vira (ou atualiza) uma tarefa no kanban,
 * itens finalizados fecham a tarefa e os responsáveis são avisados.
 */
export async function concluirReuniao(reuniaoId: string): Promise<Resultado> {
  const { supabase, erro } = await exigirLideranca();
  if (erro) return { erro };
  if (!(await reuniaoAberta(supabase, reuniaoId))) return { erro: "Esta reunião já foi concluída." };

  const { data: reuniao } = await supabase.from("reunioes").select("data").eq("id", reuniaoId).single();
  const { data: itens } = await supabase
    .from("reuniao_itens")
    .select("*")
    .eq("reuniao_id", reuniaoId)
    .eq("secao", "ata");
  const lista = (itens ?? []) as {
    titulo: string;
    serie: string;
    detalhamento: string | null;
    plano_acao: string | null;
    prioridade: number | null;
    responsavel_id: string | null;
    link: string | null;
    prazo: string | null;
    status: StatusItem | null;
  }[];

  const { data: existentes } = await supabase
    .from("tarefas")
    .select("id, ata_serie")
    .in("ata_serie", lista.map((i) => i.serie).concat("__nenhuma__"));
  const porSerie = new Map(
    ((existentes as { id: string; ata_serie: string }[] | null) ?? []).map((t) => [t.ata_serie, t.id])
  );

  const porPessoa = new Map<string, number>();
  for (const it of lista) {
    const descricao =
      [it.detalhamento, it.plano_acao ? `Plano de ação: ${it.plano_acao}` : null]
        .filter(Boolean)
        .join("\n\n") || null;
    const campos = {
      titulo: it.titulo,
      descricao,
      status: itemParaTarefa(it.status),
      responsavel_id: it.responsavel_id,
      prazo: it.prazo,
      prioridade: it.prioridade,
      link: it.link,
    };
    const tarefaId = porSerie.get(it.serie);
    if (tarefaId) {
      await supabase.from("tarefas").update(campos).eq("id", tarefaId);
    } else if (itemAberto(it.status)) {
      await supabase.from("tarefas").insert({ ...campos, tag: "Ata", ata_serie: it.serie });
    }
    if (itemAberto(it.status) && it.responsavel_id) {
      porPessoa.set(it.responsavel_id, (porPessoa.get(it.responsavel_id) ?? 0) + 1);
    }
  }

  const { error } = await supabase.from("reunioes").update({ estado: "realizada" }).eq("id", reuniaoId);
  if (error) return { erro: "Não foi possível concluir a reunião." };

  const [a, m, d] = String(reuniao?.data ?? "").split("-");
  for (const [pessoa, qtd] of porPessoa) {
    await notificar([pessoa], {
      tipo: "ata",
      titulo: `Ata de ${d}/${m}: você tem ${qtd} item(ns) em aberto`,
      link: "/atas",
    });
  }
  void a;

  revalidatePath("/atas");
  revalidatePath("/operacional");
  revalidatePath(`/atas/${reuniaoId}`);
  return { ok: true };
}
