"use server";

import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  BUCKET_FEEDBACK,
  MAX_BYTES_ANEXO,
  TIPOS_ANEXO,
} from "./anexos";

/**
 * Gera um endereço de envio assinado: o arquivo vai direto do navegador para o
 * armazenamento (vídeos grandes não passam pelo servidor).
 */
export async function prepararEnvioAnexo(
  nome: string,
  tipo: string,
  tamanho: number
): Promise<{ caminho?: string; token?: string; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  if (!servicoDisponivel()) return { erro: "Envio de arquivos indisponível." };

  if (!TIPOS_ANEXO.includes(tipo)) {
    return { erro: "Use imagens (PNG, JPG, GIF, WebP) ou vídeos (MP4, MOV, WebM)." };
  }
  if (tamanho > MAX_BYTES_ANEXO) {
    return { erro: "Cada arquivo pode ter no máximo 50 MB." };
  }

  const seguro = nome.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const caminho = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${seguro}`;
  const { data, error } = await criarClienteAdmin()
    .storage.from(BUCKET_FEEDBACK)
    .createSignedUploadUrl(caminho);
  if (error || !data) {
    return { erro: "Não foi possível preparar o envio. Tente novamente." };
  }
  return { caminho, token: data.token };
}
