"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { avisarNovaMensagem } from "./aviso";
import { registrarAcao } from "@/features/atividade/registro";

/** Envia uma mensagem (a entrega em tempo real vem do Supabase Realtime). */
export async function enviarMensagem(
  conversaId: string,
  texto: string,
  respostaA: string | null = null
): Promise<{ ok?: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const limpo = texto.trim();
  if (!limpo) return { erro: "Digite uma mensagem." };
  if (limpo.length > 2000) return { erro: "Mensagem muito longa (máx. 2000)." };

  // Resposta a uma mensagem: precisa ser da mesma conversa (a leitura já passa pela regra de acesso).
  let original: { id: string; texto: string } | null = null;
  if (respostaA) {
    const { data: o } = await supabase.from("chat_mensagens").select("id, texto").eq("id", respostaA).eq("conversa_id", conversaId).maybeSingle();
    original = (o as { id: string; texto: string } | null) ?? null;
  }

  const base: { conversa_id: string; autor_id: string; texto: string; resposta_a?: string } = { conversa_id: conversaId, autor_id: user.id, texto: limpo };
  let { error } = await supabase.from("chat_mensagens").insert(original ? { ...base, resposta_a: original.id } : base);
  // Antes da migration 0075 a coluna não existe: envia sem a citação.
  if (error && original && (error.code === "42703" || error.code === "PGRST204")) {
    ({ error } = await supabase.from("chat_mensagens").insert(base));
  }
  if (error) {
    return {
      erro:
        error.code === "42P01" || error.code === "PGRST205"
          ? "O chat ainda não foi ativado no banco (migration 0020)."
          : "Não foi possível enviar. Tente novamente.",
    };
  }
  await avisarNovaMensagem(supabase, user.id, conversaId, original ? `↪ “${original.texto.slice(0, 40)}${original.texto.length > 40 ? "…" : ""}” — ${limpo}` : limpo);

  await registrarAcao(user.id, "Enviou mensagem no chat", null, "/chat");
  return { ok: true };
}

/** Marca a conversa como lida (zera o contador). */
export async function marcarConversaLida(conversaId: string) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const agora = new Date().toISOString();

  // Quais mensagens dos outros esta pessoa está vendo agora pela primeira vez (confirmação de leitura).
  const { data: anterior } = await supabase
    .from("chat_membros")
    .select("ultima_leitura")
    .eq("conversa_id", conversaId)
    .eq("usuario_id", user.id)
    .maybeSingle();
  const desde = (anterior as { ultima_leitura: string } | null)?.ultima_leitura;
  let novas = supabase
    .from("chat_mensagens")
    .select("id")
    .eq("conversa_id", conversaId)
    .neq("autor_id", user.id)
    .order("created_at", { ascending: false })
    .limit(150);
  if (desde) novas = novas.gt("created_at", desde);
  const { data: lidas } = await novas;
  if (lidas && lidas.length > 0) {
    // Antes da migration 0081 a tabela não existe: o erro é ignorado e o resto segue igual.
    await supabase
      .from("chat_leituras")
      .upsert(
        (lidas as { id: string }[]).map((m) => ({ mensagem_id: m.id, conversa_id: conversaId, usuario_id: user.id, lida_em: agora })),
        { onConflict: "mensagem_id,usuario_id", ignoreDuplicates: true }
      );
  }

  // Conversa direta: a linha de membro já existe -> só atualiza.
  // (Um upsert passaria pela regra de INSERT, que só vale para a sala geral.)
  const { data: atualizadas } = await supabase
    .from("chat_membros")
    .update({ ultima_leitura: agora })
    .eq("conversa_id", conversaId)
    .eq("usuario_id", user.id)
    .select("conversa_id");

  // Sala geral: na primeira vez ainda não há linha -> cria.
  if (!atualizadas || atualizadas.length === 0) {
    await supabase.from("chat_membros").insert({
      conversa_id: conversaId,
      usuario_id: user.id,
      ultima_leitura: agora,
    });
  }

  revalidatePath("/", "layout");
}

/** Abre (ou cria) a conversa direta com outra pessoa e vai até ela. */
export async function abrirConversaDireta(formData: FormData) {
  const outro = String(formData.get("usuario_id") ?? "");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("chat_abrir_direta", {
    p_outro: outro,
  });
  if (error || !data) redirect("/chat");
  redirect(`/chat?c=${data as string}`);
}
