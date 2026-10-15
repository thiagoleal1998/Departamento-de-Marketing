"use server";

import { criarClienteServidor } from "@/lib/supabase/server";
import { canvaFetch } from "@/lib/canva";

export type Job = {
  tipo: "generations" | "autofills" | "exports" | "resizes";
  id: string;
};

export type ResultadoJob = {
  status: "in_progress" | "success" | "failed";
  design?: { id: string; titulo: string; url: string };
  urls?: string[];
  erro?: string;
};

async function usuarioId() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Formatos de design em branco (px) e os que a IA do Canva gera (doc/apresentação). */
const MEDIDAS: Record<string, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  feed: { w: 1080, h: 1350 },
  quadrado: { w: 1080, h: 1080 },
  banner: { w: 1920, h: 600 },
  email: { w: 600, h: 1200 },
};

function montarBriefing(f: FormData): string {
  const v = (k: string) => String(f.get(k) ?? "").trim();
  const partes = [
    v("campanha") && `Campanha: ${v("campanha")}`,
    v("publico") && `Público: ${v("publico")}`,
    v("tom") && `Tom de voz: ${v("tom")}`,
    v("oferta") && `Oferta / mensagem principal: ${v("oferta")}`,
    v("texto") && `Textos obrigatórios (usar exatamente): ${v("texto")}`,
    v("visual") && `Direção visual: ${v("visual")}`,
  ].filter(Boolean);
  return partes.join("\n").slice(0, 5000);
}

type DesignApi = {
  id: string;
  title?: string;
  url?: string;
  urls?: { edit_url?: string; view_url?: string };
};

const linkDesign = (d: DesignApi) => d.urls?.edit_url ?? d.url ?? "";

/** Inicia a criação conforme o formato escolhido no briefing. */
export async function iniciarCriacao(
  form: FormData
): Promise<{ job?: Job; design?: ResultadoJob["design"]; erro?: string }> {
  const id = await usuarioId();
  if (!id) return { erro: "Sessão expirada. Entre novamente." };

  const formato = String(form.get("formato") ?? "");
  const titulo =
    String(form.get("titulo") ?? "").trim().slice(0, 255) ||
    String(form.get("campanha") ?? "").trim().slice(0, 255) ||
    "Peça Marketing LV";
  const briefing = montarBriefing(form);

  // IA do Canva: documentos e apresentações (a API só gera esses dois tipos).
  if (formato === "doc" || formato === "presentation") {
    if (!briefing) return { erro: "Preencha ao menos um campo do briefing." };
    const r = await canvaFetch<{ job: { id: string } }>(id, "/generations", {
      method: "POST",
      body: JSON.stringify({
        brief: briefing,
        design_type: { type: "preset", name: formato },
      }),
    });
    if (r.erro || !r.dados) return { erro: r.erro ?? "Falha ao gerar." };
    return { job: { tipo: "generations", id: r.dados.job.id } };
  }

  // Demais formatos: design em branco no tamanho certo.
  const m = MEDIDAS[formato];
  if (!m) return { erro: "Escolha um formato." };
  const r = await canvaFetch<{ design: DesignApi }>(id, "/designs", {
    method: "POST",
    body: JSON.stringify({
      design_type: { type: "custom", width: m.w, height: m.h },
      title: titulo,
    }),
  });
  if (r.erro || !r.dados) return { erro: r.erro ?? "Falha ao criar o design." };
  const d = r.dados.design;
  return {
    design: { id: d.id, titulo: d.title ?? titulo, url: linkDesign(d) },
  };
}

/** Consulta o andamento de um job do Canva. */
export async function statusJob(job: Job): Promise<ResultadoJob> {
  const id = await usuarioId();
  if (!id) return { status: "failed", erro: "Sessão expirada." };
  const r = await canvaFetch<{
    job: {
      status: "in_progress" | "success" | "failed";
      result?: { design?: DesignApi };
      urls?: string[];
      error?: { message?: string };
    };
  }>(id, `/${job.tipo}/${encodeURIComponent(job.id)}`);
  if (r.erro || !r.dados) return { status: "failed", erro: r.erro };
  const j = r.dados.job;
  if (j.status === "failed") {
    return { status: "failed", erro: j.error?.message ?? "O Canva não concluiu." };
  }
  if (j.status !== "success") return { status: "in_progress" };
  const d = j.result?.design;
  return {
    status: "success",
    design: d
      ? { id: d.id, titulo: d.title ?? "", url: linkDesign(d) }
      : undefined,
    urls: j.urls,
  };
}

/** Guarda o design numa pasta com o nome da campanha (cria se não existir). */
export async function organizarEmPasta(
  designId: string,
  campanha: string
): Promise<{ ok?: boolean; erro?: string }> {
  const id = await usuarioId();
  if (!id) return { erro: "Sessão expirada." };
  const nome = campanha.trim().slice(0, 255);
  if (!nome) return { ok: true };

  const lista = await canvaFetch<{
    items: { type: string; folder?: { id: string; name: string } }[];
  }>(id, "/folders/root/items?item_types=folder&limit=100");
  if (lista.erro) return { erro: lista.erro };
  let pastaId = lista.dados?.items.find(
    (i) => i.type === "folder" && i.folder?.name === nome
  )?.folder?.id;

  if (!pastaId) {
    const nova = await canvaFetch<{ folder: { id: string } }>(id, "/folders", {
      method: "POST",
      body: JSON.stringify({ name: nome, parent_folder_id: "root" }),
    });
    if (nova.erro || !nova.dados) return { erro: nova.erro };
    pastaId = nova.dados.folder.id;
  }
  const mover = await canvaFetch<unknown>(id, "/folders/move", {
    method: "POST",
    body: JSON.stringify({ item_id: designId, to_folder_id: pastaId }),
  });
  return mover.erro ? { erro: mover.erro } : { ok: true };
}

export interface ModeloMarca {
  id: string;
  titulo: string;
  campos: { nome: string; tipo: string }[];
}

/** Modelos de marca da pessoa e seus campos preenchíveis. */
export async function listarModelos(): Promise<{
  modelos?: ModeloMarca[];
  erro?: string;
}> {
  const id = await usuarioId();
  if (!id) return { erro: "Sessão expirada." };
  const r = await canvaFetch<{ items: { id: string; title: string }[] }>(
    id,
    "/brand-templates?limit=20"
  );
  if (r.erro || !r.dados) return { erro: r.erro };
  const modelos: ModeloMarca[] = [];
  for (const t of r.dados.items) {
    const ds = await canvaFetch<{ dataset?: Record<string, { type: string }> }>(
      id,
      `/brand-templates/${t.id}/dataset`
    );
    const campos = Object.entries(ds.dados?.dataset ?? {}).map(([nome, c]) => ({
      nome,
      tipo: c.type,
    }));
    modelos.push({ id: t.id, titulo: t.title, campos });
  }
  return { modelos };
}

/** Preenche um modelo de marca com os textos informados (autofill). */
export async function preencherModelo(
  modeloId: string,
  titulo: string,
  valores: Record<string, string>
): Promise<{ job?: Job; erro?: string }> {
  const id = await usuarioId();
  if (!id) return { erro: "Sessão expirada." };
  const data: Record<string, { type: "text"; text: string }> = {};
  for (const [k, v] of Object.entries(valores)) {
    if (v.trim()) data[k] = { type: "text", text: v.trim() };
  }
  const r = await canvaFetch<{ job: { id: string } }>(id, "/autofills", {
    method: "POST",
    body: JSON.stringify({
      brand_template_id: modeloId,
      title: titulo.trim().slice(0, 255) || undefined,
      data,
    }),
  });
  if (r.erro || !r.dados) return { erro: r.erro };
  return { job: { tipo: "autofills", id: r.dados.job.id } };
}

/** Exporta o design em PNG ou PDF. */
export async function exportarDesign(
  designId: string,
  formato: "png" | "pdf"
): Promise<{ job?: Job; erro?: string }> {
  const id = await usuarioId();
  if (!id) return { erro: "Sessão expirada." };
  const r = await canvaFetch<{ job: { id: string } }>(id, "/exports", {
    method: "POST",
    body: JSON.stringify({ design_id: designId, format: { type: formato } }),
  });
  if (r.erro || !r.dados) return { erro: r.erro };
  return { job: { tipo: "exports", id: r.dados.job.id } };
}

/** Cria uma cópia redimensionada (exige plano com recursos premium). */
export async function redimensionarDesign(
  designId: string,
  formato: string
): Promise<{ job?: Job; erro?: string }> {
  const id = await usuarioId();
  if (!id) return { erro: "Sessão expirada." };
  const m = MEDIDAS[formato];
  if (!m) return { erro: "Escolha um formato." };
  const r = await canvaFetch<{ job: { id: string } }>(id, "/resizes", {
    method: "POST",
    body: JSON.stringify({
      design_id: designId,
      design_type: { type: "custom", width: m.w, height: m.h },
    }),
  });
  if (r.erro || !r.dados) return { erro: r.erro };
  return { job: { tipo: "resizes", id: r.dados.job.id } };
}
