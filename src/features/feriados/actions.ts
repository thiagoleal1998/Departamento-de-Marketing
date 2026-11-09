"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push";
import { dataBr } from "./calendario";
import { registrarAcao } from "@/features/atividade/registro";
import { ROTULO_MODALIDADE, modalidadeOuPadrao, type ItemEscala } from "./modalidade";

type Resultado = { ok?: boolean; erro?: string; avisados?: number; aviso?: string };
const MIGRACAO = "A escala de feriados ainda não foi ativada no banco (migration 0067).";
const semTabela = (c?: string) => c === "42P01" || c === "PGRST205";
const semColuna = (c?: string) => c === "42703" || c === "PGRST204";
const AVISO_MODALIDADE = "A escala foi salva, mas a modalidade (presencial ou home office) não: falta rodar a migration 0089 no Supabase.";
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
 * Define quem fica de plantão no feriado e COMO (presencial ou home office); substitui a escala daquela data.
 * Quem entra agora é avisado na hora ("Você está escalado(a) no feriado… — home office") e quem continua, mas muda de
 * modalidade, também. Quem sai só é avisado se tiver sido avisado antes.
 */
export async function definirEscala(data: string, nomeFeriado: string, itens: ItemEscala[]): Promise<Resultado> {
  const l = await lideranca();
  if (l.erro || !l.user) return { erro: l.erro ?? "Sessão expirada." };
  if (!ehData(data)) return { erro: "Data inválida." };

  // Antes da migration 0089 a coluna "modalidade" não existe: lê sem ela e trata todos como presenciais.
  let comColuna = true;
  type Lido = { id: string; profile_id: string; modalidade?: string };
  type Leitura = { data: Lido[] | null; error: { code?: string } | null };
  let lidos = (await l.supabase.from("escala_feriados").select("id, profile_id, modalidade").eq("data", data)) as unknown as Leitura;
  if (lidos.error && semColuna(lidos.error.code)) {
    comColuna = false;
    lidos = (await l.supabase.from("escala_feriados").select("id, profile_id").eq("data", data)) as unknown as Leitura;
  }
  if (lidos.error) return { erro: semTabela(lidos.error.code) ? MIGRACAO : "Não foi possível ler a escala." };
  const existentes = (lidos.data ?? []).map((e) => ({ ...e, modalidade: modalidadeOuPadrao(e.modalidade) }));

  // Uma pessoa só aparece uma vez (vale a última escolha).
  const novos = new Map<string, ItemEscala>();
  for (const i of itens) novos.set(i.id, { id: i.id, modalidade: modalidadeOuPadrao(i.modalidade) });
  const lista = Array.from(novos.values());
  const entrando = lista.filter((i) => !existentes.some((e) => e.profile_id === i.id));
  const saindo = existentes.filter((e) => !novos.has(e.profile_id));
  const mudaram = lista.filter((i) => existentes.some((e) => e.profile_id === i.id && e.modalidade !== i.modalidade));

  let aviso: string | undefined;
  if (entrando.length > 0) {
    const linhas = entrando.map((i) => ({ data, profile_id: i.id, criado_por: l.user!.id, ...(comColuna ? { modalidade: i.modalidade } : {}) }));
    let { error } = await l.supabase.from("escala_feriados").insert(linhas);
    if (error && semColuna(error.code)) {
      comColuna = false;
      ({ error } = await l.supabase.from("escala_feriados").insert(linhas.map(({ modalidade: _m, ...resto }) => resto)));
    }
    if (error) return { erro: "Não foi possível escalar." };
  }
  if (saindo.length > 0) {
    const { error } = await l.supabase.from("escala_feriados").delete().in("id", saindo.map((s) => s.id));
    if (error) return { erro: "Não foi possível tirar da escala." };
  }
  if (mudaram.length > 0 && comColuna) {
    for (const i of mudaram) {
      const { error } = await l.supabase.from("escala_feriados").update({ modalidade: i.modalidade }).eq("data", data).eq("profile_id", i.id);
      if (error) return { erro: "Não foi possível mudar a modalidade." };
    }
  }
  const algumaHomeOffice = lista.some((i) => i.modalidade === "home_office");
  if (!comColuna && algumaHomeOffice) aviso = AVISO_MODALIDADE;

  const nome = nomeFeriado.slice(0, 120);
  const quem = (i: ItemEscala) => (comColuna ? ` — ${ROTULO_MODALIDADE[i.modalidade].toLowerCase()}` : "");
  for (const i of entrando.filter((x) => x.id !== l.user!.id)) {
    await avisar([i.id], `Você está escalado(a) no feriado: ${nome} (${dataBr(data)})${quem(i)}.`);
  }
  if (comColuna) {
    for (const i of mudaram.filter((x) => x.id !== l.user!.id)) {
      await avisar([i.id], `Sua escala no feriado ${nome} (${dataBr(data)}) mudou: ${ROTULO_MODALIDADE[i.modalidade].toLowerCase()}.`);
    }
  }
  const resumo = lista.length > 0 ? ` · ${lista.filter((i) => i.modalidade === "home_office").length} em home office` : "";
  await registrarAcao(l.user.id, "Alterou a escala de feriado", `${nome} (${dataBr(data)})${resumo}`, "/gestao/feriados");
  revalidatePath("/gestao/feriados");
  return { ok: true, avisados: entrando.length + (comColuna ? mudaram.length : 0), ...(aviso ? { aviso } : {}) };
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
  await registrarAcao(l.user.id, "Avisou a folga de feriado", `${nomeFeriado.slice(0, 120)} (${dataBr(data)})`, "/gestao/feriados");
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
