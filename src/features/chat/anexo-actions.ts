"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { registrarAcao } from "@/features/atividade/registro";
import { avisarNovaMensagem } from "./aviso";
import { BUCKET_ANEXOS, MAX_BYTES_ANEXO, MAX_SEGUNDOS_GRAVACAO, TIPOS_AUDIO, TIPOS_IMAGEM, type AnexoChat } from "./anexo-tipos";

const EXTENSAO: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/aac": "aac",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
};

/** Envia uma imagem ou um áudio para a conversa (com legenda opcional). Campos: arquivo, legenda, resposta_a, duracao. */
export async function enviarAnexo(conversaId: string, formData: FormData): Promise<{ ok?: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  if (!servicoDisponivel()) return { erro: "Envio de arquivos indisponível no momento." };

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha uma imagem ou um áudio." };
  if (arquivo.size > MAX_BYTES_ANEXO) return { erro: "O arquivo pode ter no máximo 15 MB." };
  const tipoMime = arquivo.type.split(";")[0].trim().toLowerCase();
  const ehImagem = TIPOS_IMAGEM.includes(tipoMime);
  const ehAudio = TIPOS_AUDIO.includes(tipoMime);
  if (!ehImagem && !ehAudio) return { erro: "Use uma imagem (PNG, JPG, WebP, GIF) ou um áudio (WebM, OGG, M4A, MP3, WAV)." };

  const legenda = String(formData.get("legenda") ?? "").trim().slice(0, 1500);
  const respostaA = String(formData.get("resposta_a") ?? "") || null;
  const duracaoBruta = Number(formData.get("duracao"));
  const duracao = ehAudio && duracaoBruta > 0 ? Math.min(Math.round(duracaoBruta), MAX_SEGUNDOS_GRAVACAO * 2) : undefined;

  // Só quem enxerga a conversa pode enviar nela (a leitura passa pela regra de acesso).
  const { data: conv } = await supabase.from("chat_conversas").select("id").eq("id", conversaId).maybeSingle();
  if (!conv) return { erro: "Conversa não encontrada." };

  const admin = criarClienteAdmin();
  const caminho = `${conversaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXTENSAO[tipoMime]}`;
  const { error: errUp } = await admin.storage.from(BUCKET_ANEXOS).upload(caminho, Buffer.from(await arquivo.arrayBuffer()), { contentType: tipoMime, upsert: false });
  if (errUp) {
    return { erro: /bucket/i.test(errUp.message) ? "O envio de imagem e áudio ainda não foi ativado no banco (migration 0082)." : "Não foi possível enviar o arquivo. Tente novamente." };
  }
  const url = admin.storage.from(BUCKET_ANEXOS).getPublicUrl(caminho).data.publicUrl;

  const anexo: AnexoChat = { tipo: ehImagem ? "imagem" : "audio", url, nome: (arquivo.name || (ehImagem ? "imagem" : "audio")).slice(0, 120), ...(duracao ? { duracao } : {}) };
  const texto = legenda || (ehImagem ? "📷 Imagem" : duracao ? "🎤 Mensagem de voz" : "🎵 Áudio");

  const linha: Record<string, unknown> = { conversa_id: conversaId, autor_id: user.id, texto, anexo };
  if (respostaA) linha.resposta_a = respostaA;
  let { error } = await supabase.from("chat_mensagens").insert(linha);
  if (error && respostaA && (error.code === "42703" || error.code === "PGRST204")) {
    delete linha.resposta_a;
    ({ error } = await supabase.from("chat_mensagens").insert(linha));
  }
  if (error) {
    return { erro: error.code === "42703" || error.code === "PGRST204" ? "O envio de imagem e áudio ainda não foi ativado no banco (migration 0082)." : "Não foi possível enviar. Tente novamente." };
  }

  await avisarNovaMensagem(supabase, user.id, conversaId, texto);
  await registrarAcao(user.id, ehImagem ? "Enviou imagem no chat" : "Enviou áudio no chat", null, "/chat");
  revalidatePath("/chat");
  return { ok: true };
}
