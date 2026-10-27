"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/env";
import { registrarLogin } from "@/features/atividade/registro";

export type EstadoLogin = { erro?: string };

export async function entrar(
  _prev: EstadoLogin,
  formData: FormData
): Promise<EstadoLogin> {
  if (!supabaseConfigurado()) {
    return { erro: "Supabase ainda não configurado. Preencha o .env.local." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { erro: "Informe e-mail e senha." };
  }

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    return { erro: "E-mail ou senha inválidos." };
  }

  if (data.user) await registrarLogin(data.user.id, "login");
  redirect("/dashboard");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await registrarLogin(user.id, "logout");
  await supabase.auth.signOut();
  redirect("/login");
}
