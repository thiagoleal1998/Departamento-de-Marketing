"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { criarClienteServidor } from "@/lib/supabase/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

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

  // Letras das unidades de rede (X:, Y:…), gravadas à parte: sem a migration 0069 o restante do perfil salva igual.
  if (formData.has("unidade_corporativo")) {
    const letras: Record<string, string> = {};
    for (const raiz of ["corporativo", "publico", "hd"]) {
      const l = String(formData.get("unidade_" + raiz) ?? "").trim().toUpperCase();
      if (!/^[A-Z]$/.test(l)) return { erro: "Use uma única letra para cada unidade (ex.: X)." };
      letras[raiz] = l;
    }
    const { error: errUnidades } = await supabase.from("profiles").update({ pasta_unidades: letras }).eq("id", user.id);
    if (errUnidades) return { erro: "Perfil salvo, mas as unidades não: falta rodar a migration 0069 no Supabase." };
  }

  revalidatePath("/perfil");
  revalidatePath("/", "layout");
  return { ok: true };
}

export type EstadoSenha = { ok?: boolean; erro?: string };

/** Troca a própria senha, exigindo a senha atual. */
export async function alterarMinhaSenha(
  _prev: EstadoSenha,
  formData: FormData
): Promise<EstadoSenha> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  const atual = String(formData.get("senha_atual") ?? "");
  const nova = String(formData.get("senha_nova") ?? "");
  const confirma = String(formData.get("senha_confirma") ?? "");

  if (!atual || !nova || !confirma) {
    return { erro: "Preencha todos os campos." };
  }
  if (nova.length < 6) {
    return { erro: "A nova senha deve ter ao menos 6 caracteres." };
  }
  if (nova !== confirma) {
    return { erro: "A confirmação não confere com a nova senha." };
  }
  if (nova === atual) {
    return { erro: "A nova senha deve ser diferente da atual." };
  }

  // Confere a senha atual com um client isolado (não altera a sessão).
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { erro: "Sistema não configurado." };
  }
  const verificador = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: erroAtual } = await verificador.auth.signInWithPassword({
    email: user.email,
    password: atual,
  });
  if (erroAtual) return { erro: "A senha atual está incorreta." };

  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) {
    return { erro: "Não foi possível alterar a senha. Tente novamente." };
  }
  return { ok: true };
}
