"use server";

import { criarClienteServidor } from "@/lib/supabase/server";

const MAX_BYTES = 1_500_000;

/** Pega o id do arquivo em um link do Google Drive (…/file/d/ID/view, …open?id=ID, …uc?id=ID). */
function idDoDrive(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (!/(^|\.)(drive|docs)\.google\.com$/.test(u.hostname)) return null;
  const porCaminho = /\/d\/([\w-]{10,})/.exec(u.pathname)?.[1];
  const id = porCaminho ?? u.searchParams.get("id");
  return id && /^[\w-]{10,}$/.test(id) ? id : null;
}

/**
 * Busca a foto de um link do Google Drive (miniatura de 800 px) para a pessoa enquadrar no editor de foto.
 * O arquivo precisa estar compartilhado como "Qualquer pessoa com o link". Só o endereço de miniatura do
 * próprio Drive é consultado, montado a partir do id do arquivo.
 */
export async function puxarFotoDoDrive(url: string): Promise<{ foto?: string; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const id = idDoDrive(url);
  if (!id) return { erro: "Cole o link de compartilhamento do arquivo no Google Drive." };

  const naoAcessivel = "Não consegui abrir a imagem. No Drive, compartilhe o arquivo como “Qualquer pessoa com o link” e tente de novo.";
  try {
    const r = await fetch(`https://drive.google.com/thumbnail?id=${id}&sz=w800`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const tipo = r.headers.get("content-type") ?? "";
    if (!r.ok || !tipo.startsWith("image/")) return { erro: naoAcessivel };
    const bytes = Buffer.from(await r.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_BYTES) return { erro: "A imagem é muito grande. Use uma foto menor." };
    return { foto: `data:${tipo.split(";")[0]};base64,${bytes.toString("base64")}` };
  } catch {
    return { erro: naoAcessivel };
  }
}
