import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";

/**
 * Faz upload do arquivo de referência para o bucket público `referencias`
 * (via service role, no servidor) e retorna a URL pública. Retorna null se
 * não houver arquivo ou o serviço não estiver disponível.
 */
export async function uploadReferencia(
  file: File | null
): Promise<{ url: string; nome: string } | null> {
  if (!file || file.size === 0) return null;
  if (!servicoDisponivel()) return null;

  const admin = criarClienteAdmin();
  const seguro = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  const caminho = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${seguro}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await admin.storage
    .from("referencias")
    .upload(caminho, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (error) return null;

  const { data } = admin.storage.from("referencias").getPublicUrl(caminho);
  return { url: data.publicUrl, nome: file.name };
}
