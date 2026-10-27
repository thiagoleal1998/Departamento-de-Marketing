"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { normalizarLembretes } from "@/lib/lembretes";
import { registrarAcao } from "@/features/atividade/registro";

type Resultado = { ok?: boolean; erro?: string };

export interface DadosItemCalendario {
  nome: string;
  data: string; // yyyy-mm-dd ou vazio
  status: string;
  tipo: string;
  canais: string[];
  responsaveis: string[];
  tipo_post: string;
  objetivo: string;
  publico: string[];
  tags: string;
  lembretes?: number[];
}

const lista = (v: string[], max = 12) => Array.from(new Set(v.map((x) => x.trim()).filter(Boolean))).slice(0, max);
const nulo = (v: string, max = 300) => v.trim().slice(0, max) || null;

/**
 * Cria ou edita um item do calendário. O banco só deixa a liderança gravar; como o time inteiro
 * programa os e-mails, a gravação usa a chave de serviço depois de conferir que há alguém logado.
 */
export async function salvarItemCalendario(id: string | null, d: DadosItemCalendario): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  if (!servicoDisponivel()) return { erro: "Edição indisponível no momento." };

  const nome = d.nome.trim().slice(0, 300);
  if (!nome) return { erro: "Dê um nome ao item (por exemplo, o assunto do e-mail)." };
  if (d.data && !/^\d{4}-\d{2}-\d{2}$/.test(d.data)) return { erro: "Data inválida." };

  const dados = {
    nome,
    data: d.data || null,
    status: nulo(d.status, 80) ?? "Não iniciada",
    tipo: nulo(d.tipo, 80),
    canais: lista(d.canais),
    responsaveis: lista(d.responsaveis),
    tipo_post: nulo(d.tipo_post, 80),
    objetivo: nulo(d.objetivo, 80),
    publico: lista(d.publico),
    tags: nulo(d.tags, 300),
  };
  const admin = criarClienteAdmin();
  const q = id
    ? admin.from("calendario_conteudo").update(dados).eq("id", id).select("id")
    : admin.from("calendario_conteudo").insert(dados).select("id");
  const { data, error } = await q;
  if (error || !data || data.length === 0) return { erro: "Não foi possível salvar. Tente novamente." };

  // Quem criou: gravado à parte (migration 0077). Só o autor (e a liderança) exclui depois.
  const itemId = (data[0] as { id: string }).id;
  if (!id) await admin.from("calendario_conteudo").update({ criado_por: user.id }).eq("id", itemId);
  await registrarAcao(user.id, id ? "Editou item do calendário" : "Criou item do calendário", nome, "/operacional/calendario");

  // Lembretes gravados à parte: sem a migration 0073 o item salva do mesmo jeito.
  if (d.lembretes !== undefined) {
    const { error: errLemb } = await admin
      .from("calendario_conteudo")
      .update({ lembretes: normalizarLembretes(d.lembretes) })
      .eq("id", itemId);
    if (errLemb) return { erro: "O item foi salvo, mas os lembretes não: falta rodar a migration 0073 no Supabase." };
  }

  revalidatePath("/operacional/calendario");
  revalidatePath("/executivo");
  return { ok: true };
}

/** Exclui um item (liderança). */
export async function excluirItemCalendario(id: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  const { data: eu } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const papel = (eu as { role: string } | null)?.role;
  const lideranca = papel === "gerente" || papel === "lider";
  if (!servicoDisponivel()) return { erro: "Exclusão indisponível no momento." };

  const admin = criarClienteAdmin();
  const { data: item } = await admin.from("calendario_conteudo").select("nome, criado_por").eq("id", id).maybeSingle();
  const atual = item as { nome: string; criado_por: string | null } | null;
  // Gerente e líder excluem qualquer item; o colaborador, só o que ele mesmo criou.
  if (!lideranca && atual?.criado_por !== user.id) return { erro: "Você só pode excluir os itens que você mesmo criou." };

  const { error } = await admin.from("calendario_conteudo").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir." };
  await registrarAcao(user.id, "Excluiu item do calendário", atual?.nome ?? null, "/operacional/calendario");
  revalidatePath("/operacional/calendario");
  revalidatePath("/executivo");
  return { ok: true };
}
