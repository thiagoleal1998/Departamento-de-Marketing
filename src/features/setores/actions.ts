"use server";

import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { lerMembros, type MembroSetor } from "./tipos";

/** Grava a descrição e as pessoas de um setor (somente gerente; a RLS confirma no banco). */
export async function salvarSetor(id: string, descricao: string, membros: MembroSetor[]): Promise<{ erro?: string }> {
  const usuario = await exigirUsuario();
  if (usuario.role !== "gerente") return { erro: "Apenas o gerente pode editar os setores." };
  const limpos = lerMembros(membros)
    .filter((m) => m.profile_id)
    .map((m) => ({ profile_id: m.profile_id, funcao: m.funcao.trim().slice(0, 600) }));
  if (new Set(limpos.map((m) => m.profile_id)).size !== limpos.length) return { erro: "A mesma pessoa aparece duas vezes neste setor." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("setores")
    .update({ descricao: descricao.trim().slice(0, 1500), membros: limpos, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) return { erro: error.message };
  if (!data?.length) return { erro: "Não foi possível salvar este setor." };

  revalidatePath("/gestao/setores");
  revalidatePath("/");
  return {};
}
