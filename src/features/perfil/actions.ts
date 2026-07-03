"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoPerfil = { ok?: boolean; erro?: string };

/** Limite defensivo para o tamanho do avatar (data URL) — ~700 KB. */
const MAX_AVATAR = 700_000;

/** Atualiza o próprio perfil: nome, cargo e foto (avatar_url). */
export async function atualizarMeuPerfil(
  _prev: EstadoPerfil,
  formData: FormData
): Promise<EstadoPerfil> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nome = String(formData.get("nome") ?? "").trim();
  const cargo = String(formData.get("cargo") ?? "").trim() || null;
  const avatarRaw = String(formData.get("avatar_url") ?? "");

  if (!nome) return { erro: "Informe seu nome." };

  let avatar_url: string | null = null;
  if (avatarRaw === "__remover__") {
    avatar_url = null;
  } else if (avatarRaw) {
    const valido =
      avatarRaw.startsWith("data:image/") || avatarRaw.startsWith("http");
    if (!valido) return { erro: "Imagem inválida." };
    if (avatarRaw.length > MAX_AVATAR) {
      return { erro: "A imagem é muito grande. Tente uma foto menor." };
    }
    avatar_url = avatarRaw;
  } else {
    // Campo vazio: mantém o avatar atual.
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single();
    avatar_url = data?.avatar_url ?? null;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ nome, cargo, avatar_url })
    .eq("id", user.id);

  if (error) return { erro: "Não foi possível salvar. Tente novamente." };

  revalidatePath("/perfil");
  revalidatePath("/", "layout");
  return { ok: true };
}
