"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/env";

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
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    return { erro: "E-mail ou senha inválidos." };
  }

  redirect("/dashboard");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
