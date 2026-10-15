"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { idsPorPapel, notificar } from "@/features/notificacoes/enviar";

export type EstadoComunicado = { ok?: boolean; erro?: string };

async function usuarioLideranca() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, erro: "Sessão expirada." };
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (data?.role !== "gerente" && data?.role !== "lider") {
    return { supabase, user, erro: "Apenas gerentes e líderes publicam comunicados." };
  }
  return { supabase, user, erro: null as string | null };
}

/** Publica um comunicado e avisa todo o time (notificação com contador). */
export async function publicarComunicado(
  _prev: EstadoComunicado,
  formData: FormData
): Promise<EstadoComunicado> {
  const { supabase, user, erro } = await usuarioLideranca();
  if (erro || !user) return { erro: erro ?? "Sessão expirada." };

  const titulo = String(formData.get("titulo") ?? "").trim();
  const corpo = String(formData.get("corpo") ?? "").trim();
  const fixado = formData.get("fixado") === "on";
  if (!titulo) return { erro: "Informe o título do comunicado." };
  if (!corpo) return { erro: "Escreva o texto do comunicado." };
  if (titulo.length > 160) return { erro: "O título está muito longo." };

  const { error } = await supabase
    .from("comunicados")
    .insert({ titulo, corpo, fixado, autor_id: user.id });
  if (error) {
    return {
      erro:
        error.code === "42P01" || error.code === "PGRST205"
          ? "Comunicados ainda não foram ativados no banco (migration 0020)."
          : "Não foi possível publicar. Tente novamente.",
    };
  }

  const todos = await idsPorPapel(["gerente", "lider", "colaborador"], user.id);
  await notificar(todos, {
    tipo: "comunicado",
    titulo: `Novo comunicado: ${titulo}`,
    corpo: corpo.length > 140 ? `${corpo.slice(0, 137)}…` : corpo,
    link: "/comunicados",
  });

  revalidatePath("/comunicados");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function alternarFixado(id: string, fixado: boolean) {
  const { supabase, erro } = await usuarioLideranca();
  if (erro) return { erro };
  const { error } = await supabase
    .from("comunicados")
    .update({ fixado })
    .eq("id", id);
  if (error) return { erro: "Não foi possível atualizar." };
  revalidatePath("/comunicados");
  return { ok: true };
}

export async function excluirComunicado(id: string) {
  const { supabase, erro } = await usuarioLideranca();
  if (erro) return { erro };
  const { error } = await supabase.from("comunicados").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir." };
  revalidatePath("/comunicados");
  return { ok: true };
}
