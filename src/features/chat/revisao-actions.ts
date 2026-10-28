"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { registrarAcao } from "@/features/atividade/registro";
import { avisarNovaMensagem } from "./aviso";
import { MAX_MARCACOES, type MarcacaoRevisao, type RevisaoPeca, type VereditoRevisao } from "./revisao-tipos";

const MAX_BYTES = 8 * 1024 * 1024;
const TIPOS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const pct = (n: unknown) => Math.min(100, Math.max(0, Math.round(Number(n) * 100) / 100 || 0));

/**
 * Envia uma peça para revisão na conversa: guarda a imagem (já reduzida pelo navegador, como data URL)
 * e cria a mensagem com os apontamentos marcados.
 */
export async function enviarRevisao(
  conversaId: string,
  dados: { imagem: string; nome: string; veredito: VereditoRevisao; marcacoes: MarcacaoRevisao[]; comentario: string; respostaA?: string | null }
): Promise<{ ok?: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  if (!servicoDisponivel()) return { erro: "Envio de imagens indisponível no momento." };

  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dados.imagem.trim());
  if (!m) return { erro: "Use uma imagem PNG, JPG ou WebP." };
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_BYTES) return { erro: "A imagem pode ter no máximo 8 MB." };

  const marcacoes = (dados.marcacoes ?? []).slice(0, MAX_MARCACOES).map((x, i) => ({
    n: i + 1,
    x: pct(x.x),
    y: pct(x.y),
    w: pct(x.w),
    h: pct(x.h),
    texto: String(x.texto ?? "").trim().slice(0, 500),
  }));
  const comentario = (dados.comentario ?? "").trim().slice(0, 1500);
  const veredito: VereditoRevisao = dados.veredito === "aprovada" ? "aprovada" : "ajustes";
  if (marcacoes.length === 0 && !comentario && veredito !== "aprovada") return { erro: "Marque o que precisa ser corrigido ou escreva um comentário." };

  // Só entra na conversa quem pode vê-la (a leitura passa pela regra de acesso).
  const { data: conv } = await supabase.from("chat_conversas").select("id").eq("id", conversaId).maybeSingle();
  if (!conv) return { erro: "Conversa não encontrada." };

  const admin = criarClienteAdmin();
  const caminho = `chat-revisao/${conversaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${TIPOS[m[1]]}`;
  const { error: errUp } = await admin.storage.from("referencias").upload(caminho, bytes, { contentType: m[1], upsert: false });
  if (errUp) return { erro: "Não foi possível enviar a imagem. Tente novamente." };
  const imagem = admin.storage.from("referencias").getPublicUrl(caminho).data.publicUrl;

  const revisao: RevisaoPeca = { imagem, nome: String(dados.nome ?? "peça").slice(0, 120), veredito, marcacoes };
  const texto =
    comentario ||
    (veredito === "aprovada"
      ? "Peça aprovada ✅"
      : `Revisão da peça: ${marcacoes.length} ${marcacoes.length === 1 ? "apontamento" : "apontamentos"}`);

  const linha: Record<string, unknown> = { conversa_id: conversaId, autor_id: user.id, texto, revisao };
  if (dados.respostaA) linha.resposta_a = dados.respostaA;
  let { error } = await supabase.from("chat_mensagens").insert(linha);
  if (error && dados.respostaA && (error.code === "42703" || error.code === "PGRST204")) {
    delete linha.resposta_a;
    ({ error } = await supabase.from("chat_mensagens").insert(linha));
  }
  if (error) {
    return {
      erro:
        error.code === "42703" || error.code === "PGRST204"
          ? "A revisão de peças ainda não foi ativada no banco (migration 0081)."
          : "Não foi possível enviar. Tente novamente.",
    };
  }

  await avisarNovaMensagem(supabase, user.id, conversaId, `🖼️ ${texto}`);
  await registrarAcao(user.id, "Enviou peça para revisão no chat", null, "/chat");
  revalidatePath("/chat");
  return { ok: true };
}
