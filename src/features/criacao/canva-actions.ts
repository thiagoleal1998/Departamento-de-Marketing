"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { canvaFetch, removerConexao } from "@/lib/canva";

export type EstadoCanva = { erro?: string; url?: string };

/** Formatos com medidas em pixels (Canva aceita 40–8000). */
const FORMATOS: Record<string, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  feed: { w: 1080, h: 1350 },
  quadrado: { w: 1080, h: 1080 },
  banner: { w: 1920, h: 600 },
  email: { w: 600, h: 1200 },
};

async function usuarioId() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function criarDesignCanva(
  _anterior: EstadoCanva,
  form: FormData
): Promise<EstadoCanva> {
  const id = await usuarioId();
  if (!id) return { erro: "Sessão expirada. Entre novamente." };
  const f = FORMATOS[String(form.get("formato"))];
  if (!f) return { erro: "Escolha um formato." };
  const titulo =
    String(form.get("titulo") ?? "").trim().slice(0, 255) || "Peça Marketing LV";

  const r = await canvaFetch<{ design: { urls: { edit_url: string } } }>(
    id,
    "/designs",
    {
      method: "POST",
      body: JSON.stringify({
        design_type: { type: "custom", width: f.w, height: f.h },
        title: titulo,
      }),
    }
  );
  if (r.erro || !r.dados) return { erro: r.erro ?? "Falha ao criar o design." };
  return { url: r.dados.design.urls.edit_url };
}

export async function desconectarCanva() {
  const id = await usuarioId();
  if (id) await removerConexao(id);
  revalidatePath("/criacao");
}
