import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";

const MAX_BYTES = 6 * 1024 * 1024;
const TIPOS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/**
 * Envia uma imagem (vinda do navegador já reduzida, como data URL) para o bucket público `referencias`
 * e devolve o endereço público. Devolve null se não houver imagem válida.
 */
export async function enviarImagemProjeto(dataUrl: string, prefixo: "capa" | "logo"): Promise<string | null> {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!m || !servicoDisponivel()) return null;
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_BYTES) return null;

  const admin = criarClienteAdmin();
  const caminho = `projetos/${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${TIPOS[m[1]]}`;
  const { error } = await admin.storage.from("referencias").upload(caminho, bytes, { contentType: m[1], upsert: false });
  if (error) return null;
  return admin.storage.from("referencias").getPublicUrl(caminho).data.publicUrl;
}
