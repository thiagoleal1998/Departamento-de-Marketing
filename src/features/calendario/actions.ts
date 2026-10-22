"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";

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
  if (papel !== "gerente" && papel !== "lider") return { erro: "Só a liderança exclui itens do calendário." };
  if (!servicoDisponivel()) return { erro: "Exclusão indisponível no momento." };

  const { error } = await criarClienteAdmin().from("calendario_conteudo").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir." };
  revalidatePath("/operacional/calendario");
  revalidatePath("/executivo");
  return { ok: true };
}
