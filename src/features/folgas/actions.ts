"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push";
import { registrarAcao } from "@/features/atividade/registro";
import { FUNCOES_AUTORIZACAO, PESSOAS_RH, ehTipoFolga, nomeAutorizador, rotuloTipo, textoPeriodo, textoRetorno, type Autorizacao } from "./tipos";

type Resultado = { ok?: boolean; erro?: string; aviso?: string; avisados?: number };
const MIGRACAO = "As folgas ainda não foram ativadas no banco (migration 0090).";
const semTabela = (c?: string) => c === "42P01" || c === "PGRST205" || c === "42703" || c === "PGRST204";
const ehData = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const semColuna = (c?: string) => c === "42703" || c === "PGRST204";
const AVISO_RETORNO = "A folga foi salva, mas a data de retorno não: falta rodar a migration 0091 no Supabase.";

async function lideranca() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, erro: "Sessão expirada. Entre novamente." };
  const { data: eu } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const papel = (eu as { role: string } | null)?.role;
  if (papel !== "gerente" && papel !== "lider") return { supabase, user, erro: "Só a liderança registra folgas." };
  return { supabase, user, erro: null as string | null };
}

/** Avisa no sino e no navegador (push). Chave de serviço: quem registra pode não ler todos os perfis. */
async function avisar(destinatarios: string[], titulo: string) {
  const ids = Array.from(new Set(destinatarios.filter(Boolean)));
  if (ids.length === 0 || !servicoDisponivel()) return;
  try {
    await criarClienteAdmin()
      .from("notificacoes")
      .insert(ids.map((destinatario_id) => ({ destinatario_id, tipo: "folga", titulo, link: "/gestao/folgas" })));
  } catch {
    // aviso é complementar
  }
  await enviarPush(ids, { titulo, url: "/gestao/folgas", tag: "folga" });
}

async function nomesDe(ids: string[]): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  if (ids.length === 0 || !servicoDisponivel()) return mapa;
  const { data } = await criarClienteAdmin().from("profiles").select("id, nome").in("id", Array.from(new Set(ids)));
  for (const p of (data ?? []) as { id: string; nome: string }[]) mapa.set(p.id, p.nome);
  return mapa;
}

/** Só funções conhecidas, uma pessoa por função (no RH, o nome precisa estar na lista do RH). */
function limparAutorizacoes(a: Autorizacao[]): Autorizacao[] {
  const saida: Autorizacao[] = [];
  for (const f of FUNCOES_AUTORIZACAO) {
    const x = a.find((i) => i.funcao === f);
    if (!x) continue;
    if (f === "RH") {
      const nome = (PESSOAS_RH as readonly string[]).find((n) => n === x.nome);
      if (nome) saida.push({ funcao: f, nome });
    } else if (x.profile_id) {
      saida.push({ funcao: f, profile_id: x.profile_id });
    }
  }
  return saida;
}

export interface DadosFolga {
  profile_id: string;
  tipo: string;
  inicio: string;
  fim: string;
  /** Dia em que volta ao trabalho (vazio = não informado). */
  retorno: string;
  justificativa: string;
  autorizacoes: Autorizacao[];
}

/**
 * Cria (id = null) ou atualiza uma folga. A pessoa é avisada na hora (com quem autorizou); o time só é avisado
 * quando a liderança manda (avisarEquipeFolga). Mudou período ou tipo de uma folga já avisada ao time: o aviso
 * volta a ficar pendente, para o time saber da mudança.
 */
export async function salvarFolga(id: string | null, d: DadosFolga): Promise<Resultado> {
  const l = await lideranca();
  if (l.erro || !l.user) return { erro: l.erro ?? "Sessão expirada." };

  if (!d.profile_id) return { erro: "Escolha o colaborador." };
  if (!ehTipoFolga(d.tipo)) return { erro: "Escolha o tipo da folga." };
  if (!ehData(d.inicio) || !ehData(d.fim)) return { erro: "Informe o primeiro e o último dia." };
  if (d.fim < d.inicio) return { erro: "O último dia não pode ser antes do primeiro." };
  if (d.retorno && (!ehData(d.retorno) || d.retorno <= d.fim)) return { erro: "O retorno precisa ser depois do último dia da folga." };

  const autorizacoes = limparAutorizacoes(d.autorizacoes ?? []);
  const dados = {
    profile_id: d.profile_id,
    tipo: d.tipo,
    inicio: d.inicio,
    fim: d.fim,
    justificativa: d.justificativa.trim().slice(0, 1000) || null,
    autorizacoes,
  };

  let mudouPeriodo = false;
  let equipeJaAvisada = false;
  if (id) {
    type Antes = { profile_id: string; tipo: string; inicio: string; fim: string; retorno?: string | null; equipe_avisada_em: string | null };
    let lido = (await l.supabase.from("folgas").select("profile_id, tipo, inicio, fim, retorno, equipe_avisada_em").eq("id", id).maybeSingle()) as unknown as { data: Antes | null; error: { code?: string } | null };
    if (lido.error && semColuna(lido.error.code)) {
      lido = (await l.supabase.from("folgas").select("profile_id, tipo, inicio, fim, equipe_avisada_em").eq("id", id).maybeSingle()) as unknown as typeof lido;
    }
    if (lido.error) return { erro: semTabela(lido.error.code) ? MIGRACAO : "Não foi possível ler a folga." };
    const a = lido.data;
    if (!a) return { erro: "Folga não encontrada." };
    mudouPeriodo = a.inicio !== d.inicio || a.fim !== d.fim || a.tipo !== d.tipo || a.profile_id !== d.profile_id || (a.retorno ?? "") !== d.retorno;
    equipeJaAvisada = Boolean(a.equipe_avisada_em);
  }

  const gravar = (campos: Record<string, unknown>) =>
    id
      ? l.supabase
          .from("folgas")
          .update({ ...campos, ...(mudouPeriodo ? { equipe_avisada_em: null, equipe_avisada_por: null } : {}) })
          .eq("id", id)
          .select("id")
      : l.supabase.from("folgas").insert({ ...campos, criado_por: l.user!.id }).select("id");
  // Antes da migration 0091 a coluna "retorno" não existe: grava sem ela e avisa.
  let avisoRetorno: string | undefined;
  let { data, error } = await gravar({ ...dados, retorno: d.retorno || null });
  if (error && semColuna(error.code)) {
    ({ data, error } = await gravar(dados));
    if (!error && d.retorno) avisoRetorno = AVISO_RETORNO;
  }
  if (error) return { erro: semTabela(error.code) ? MIGRACAO : "Não foi possível salvar a folga." };
  if (!data || data.length === 0) return { erro: "Só a liderança registra folgas." };

  // Aviso à pessoa (a justificativa fica na tela dela, não no aviso).
  const periodo = textoPeriodo(dados);
  const tipo = rotuloTipo(dados.tipo);
  const voltaEm = d.retorno ? ` Retorno em ${textoRetorno({ fim: d.fim, retorno: d.retorno })}.` : "";
  let avisados = 0;
  if (d.profile_id !== l.user.id && (!id || mudouPeriodo)) {
    const nomes = await nomesDe(autorizacoes.flatMap((a) => (a.profile_id ? [a.profile_id] : [])));
    const quem = autorizacoes.map((a) => `${nomeAutorizador(a, nomes)} (${a.funcao})`).join(", ");
    await avisar(
      [d.profile_id],
      `${id ? "Sua folga mudou" : "Sua folga foi registrada"}: ${tipo}, ${periodo}.${voltaEm}${quem ? ` Autorizada por ${quem}.` : ""}`
    );
    avisados = 1;
  }

  const [nomeDe] = await Promise.all([nomesDe([d.profile_id])]);
  await registrarAcao(l.user.id, id ? "Alterou uma folga" : "Registrou uma folga", `${nomeDe.get(d.profile_id) ?? "Colaborador"} · ${tipo} · ${periodo}`, "/gestao/folgas");
  revalidatePath("/gestao/folgas");
  return {
    ok: true,
    avisados,
    ...(avisoRetorno
      ? { aviso: avisoRetorno }
      : id && mudouPeriodo && equipeJaAvisada
        ? { aviso: "O período, o tipo ou o retorno mudou: o time já tinha sido avisado, então o botão \"Avisar equipe\" voltou para você avisar a mudança." }
        : {}),
  };
}

export async function excluirFolga(id: string): Promise<Resultado> {
  const l = await lideranca();
  if (l.erro || !l.user) return { erro: l.erro ?? "Sessão expirada." };
  const { data, error } = await l.supabase.from("folgas").delete().eq("id", id).select("id");
  if (error || !data || data.length === 0) return { erro: "Não foi possível excluir (apenas liderança pode)." };
  revalidatePath("/gestao/folgas");
  return { ok: true };
}

/**
 * Avisa o time (todo mundo ativo, menos a própria pessoa e quem está avisando) de que o colaborador estará ausente.
 * O aviso leva só o nome, o período e o tipo: a justificativa e as autorizações NUNCA vão para o time.
 */
export async function avisarEquipeFolga(id: string): Promise<Resultado> {
  const l = await lideranca();
  if (l.erro || !l.user) return { erro: l.erro ?? "Sessão expirada." };
  if (!servicoDisponivel()) return { erro: "Avisos indisponíveis no momento." };

  type Lida = { id: string; profile_id: string; tipo: string; inicio: string; fim: string; retorno?: string | null };
  let lida = (await l.supabase.from("folgas").select("id, profile_id, tipo, inicio, fim, retorno").eq("id", id).maybeSingle()) as unknown as { data: Lida | null; error: { code?: string } | null };
  if (lida.error && semColuna(lida.error.code)) {
    lida = (await l.supabase.from("folgas").select("id, profile_id, tipo, inicio, fim").eq("id", id).maybeSingle()) as unknown as typeof lida;
  }
  if (lida.error) return { erro: semTabela(lida.error.code) ? MIGRACAO : "Não foi possível ler a folga." };
  const f = lida.data;
  if (!f) return { erro: "Folga não encontrada." };

  const admin = criarClienteAdmin();
  const [{ data: pessoa }, { data: ativos }] = await Promise.all([
    admin.from("profiles").select("nome").eq("id", f.profile_id).maybeSingle(),
    admin.from("profiles").select("id").eq("ativo", true),
  ]);
  const nome = (pessoa as { nome: string } | null)?.nome ?? "Um colaborador";
  const destinatarios = ((ativos as { id: string }[] | null) ?? []).map((p) => p.id).filter((x) => x !== f.profile_id && x !== l.user!.id);

  const { error: errMarca } = await l.supabase
    .from("folgas")
    .update({ equipe_avisada_em: new Date().toISOString(), equipe_avisada_por: l.user.id })
    .eq("id", id);
  if (errMarca) return { erro: "Não foi possível registrar o aviso." };

  const volta = f.retorno ? ` Retorna em ${textoRetorno({ fim: f.fim, retorno: f.retorno })}.` : "";
  await avisar(destinatarios, `${nome} estará ausente em ${textoPeriodo(f)} (${rotuloTipo(f.tipo)}).${volta}`);
  await registrarAcao(l.user.id, "Avisou a equipe de uma folga", `${nome} · ${textoPeriodo(f)}`, "/gestao/folgas");
  revalidatePath("/gestao/folgas");
  return { ok: true, avisados: destinatarios.length };
}
