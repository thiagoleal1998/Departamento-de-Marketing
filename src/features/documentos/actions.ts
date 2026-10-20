"use server";

import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function adicionarDocumento(formData: FormData): Promise<void> {
  const usuario = await exigirUsuario();
  if (!ehLideranca(usuario.role)) return;

  const nome = String(formData.get("nome") ?? "").trim().slice(0, 200);
  const categoria = String(formData.get("categoria") ?? "Outros").trim().slice(0, 60) || "Outros";
  let url = String(formData.get("url") ?? "").trim().slice(0, 1000);
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (!nome || !url) return;

  const supabase = await criarClienteServidor();
  await supabase.from("central_documentos").insert({ nome, categoria, url, criado_por: usuario.id });
  revalidatePath("/documentos");
}

export async function removerDocumento(id: string): Promise<void> {
  const usuario = await exigirUsuario();
  if (!ehLideranca(usuario.role)) return;
  const supabase = await criarClienteServidor();
  await supabase.from("central_documentos").delete().eq("id", id);
  revalidatePath("/documentos");
}
