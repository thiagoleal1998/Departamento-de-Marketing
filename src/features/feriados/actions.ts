"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push";
import { dataBr } from "./calendario";

type Resultado = { ok?: boolean; erro?: string; avisados?: number };
const MIGRACAO = "A escala de feriados ainda não foi ativada no banco (migration 0067).";
const semTabela = (c?: string) => c === "42P01" || c === "PGRST205";
const ehData = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

async function lideranca() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, erro: "Sessão expirada. Entre novamente." };
  const { data: eu } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const papel = (eu as { role: string } | null)?.role;
  if (papel !== "gerente" && papel !== "lider") return { supabase, user, erro: "Só a liderança monta a escala." };
  return { supabase, user, erro: null as string | null };
}

/** Avisa no sino e no navegador (push). Usa a chave de serviço: quem monta a escala pode não ler os outros perfis. */
async function avisar(destinatarios: string[], titulo: string) {
  const ids = Array.from(new Set(destinatarios.filter(Boolean)));
  if (ids.length === 0 || !servicoDisponivel()) return;
  try {
    await criarClienteAdmin()
      .from("notificacoes")
      .insert(ids.map((destinatario_id) => ({ destinatario_id, tipo: "escala_feriado", titulo, link: "/dashboard" })));
  } catch {
    // aviso é complementar
  }
  await enviarPush(ids, { titulo, url: "/dashboard", tag: "escala-feriado" });
}

/**
 * Define quem fica de plantão no feriado (substitui a escala daquela data). Quem entra agora é avisado na hora:
 * "Você está escalado(a) no feriado…". Quem sai só é avisado se tiver sido avisado antes.
 */
export async function definirEscala(data: string, nomeFeriado: string, profileIds: string[]): Promise<Resultado> {
  const l = await lideranca();
  if (l.erro || !l.user) return { erro: l.erro ?? "Sessão expirada." };
  if (!ehData(data)) return { erro: "Data inválida." };

  const { data: atuais, error: errLer } = await l.supabase.from("escala_feriados").select("id, profile_id").eq("data", data);
  if (errLer) return { erro: semTabela(errLer.code) ? MIGRACAO : "Não foi possível ler a escala." };
  const existentes = (atuais as { id: string; profile_id: string }[] | null) ?? [];
  const novos = Array.from(new Set(profileIds));
  const entrando = novos.filter((id) => !existentes.some((e) => e.profile_id === id));
  const saindo = existentes.filter((e) => !novos.includes(e.profile_id));

  if (entrando.length > 0) {
    const { error } = await l.supabase.from("escala_feriados").insert(entrando.map((profile_id) => ({ data, profile_id, criado_por: l.user!.id })));
    if (error) return { erro: "Não foi possível escalar." };
  }
  if (saindo.length > 0) {
    const { error } = await l.supabase.from("escala_feriados").delete().in("id", saindo.map((s) => s.id));
    if (error) return { erro: "Não foi possível tirar da escala." };
  }

  const nome = nomeFeriado.slice(0, 120);
  await avisar(
    entrando.filter((id) => id !== l.user!.id),
    `Você está escalado(a) no feriado: ${nome} (${dataBr(data)}).`
  );
  revalidatePath("/gestao/feriados");
  return { ok: true, avisados: entrando.length };
}

/**
 * Avisa quem NÃO está na escala daquele feriado: "Você estará de folga…". Registra o aviso para a tela
 * mostrar que o time já foi avisado (e o colaborador ver "Folga" no lugar de "A definir").
 */
export async function avisarFolga(data: string, nomeFeriado: string): Promise<Resultado> {
  const l = await lideranca();
  if (l.erro || !l.user) return { erro: l.erro ?? "Sessão expirada." };
  if (!ehData(data)) return { erro: "Data inválida." };
  if (!servicoDisponivel()) return { erro: "Avisos indisponíveis no momento." };

  const admin = criarClienteAdmin();
  const { data: escalados, error } = await admin.from("escala_feriados").select("profile_id").eq("data", data);
  if (error) return { erro: semTabela(error.code) ? MIGRACAO : "Não foi possível ler a escala." };
  const noPlantao = new Set(((escalados as { profile_id: string }[] | null) ?? []).map((e) => e.profile_id));

  const { data: ativos } = await admin.from("profiles").select("id").eq("ativo", true);
  const folga = ((ativos as { id: string }[] | null) ?? []).map((p) => p.id).filter((id) => !noPlantao.has(id));

  const { error: errAviso } = await admin.from("escala_avisos").upsert({ data, avisado_em: new Date().toISOString(), avisado_por: l.user.id });
  if (errAviso && !semTabela(errAviso.code)) return { erro: "Não foi possível registrar o aviso." };

  await avisar(
    folga.filter((id) => id !== l.user!.id),
    `Você estará de folga no feriado: ${nomeFeriado.slice(0, 120)} (${dataBr(data)}).`
  );
  revalidatePath("/gestao/feriados");
  return { ok: true, avisados: folga.length };
}

/** Feriado ou data extra (municipal, estadual, ponte). */
export async function adicionarFeriadoExtra(data: string, nome: string): Promise<Resultado> {
  const l = await lideranca();
  if (l.erro || !l.user) return { erro: l.erro ?? "Sessão expirada." };
  const n = nome.trim().slice(0, 120);
  if (!ehData(data)) return { erro: "Informe a data." };
  if (!n) return { erro: "Informe o nome do feriado." };
  const { data: linhas, error } = await l.supabase.from("feriados_extras").insert({ data, nome: n, criado_por: l.user.id }).select("id");
  if (error) return { erro: semTabela(error.code) ? MIGRACAO : "Não foi possível adicionar." };
  if (!linhas || linhas.length === 0) return { erro: "Só a liderança adiciona feriados." };
  revalidatePath("/gestao/feriados");
  return { ok: true };
}

export async function removerFeriadoExtra(id: string): Promise<Resultado> {
  const l = await lideranca();
  if (l.erro) return { erro: l.erro };
  const { data, error } = await l.supabase.from("feriados_extras").delete().eq("id", id).select("id");
  if (error || !data || data.length === 0) return { erro: "Não foi possível remover." };
  revalidatePath("/gestao/feriados");
  return { ok: true };
}
