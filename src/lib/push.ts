import webpush from "web-push";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";

export interface PayloadPush {
  titulo: string;
  corpo?: string;
  url: string;
  /** Agrupa avisos do mesmo assunto (ex.: uma conversa do chat). */
  tag?: string;
}

let configurado = false;

function configurar(): boolean {
  if (configurado) return true;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  const assunto = process.env.VAPID_SUBJECT;
  if (!publica || !privada || !assunto) return false;
  webpush.setVapidDetails(assunto, publica, privada);
  configurado = true;
  return true;
}

/**
 * Envia uma notificação push do navegador para os usuários informados.
 * Silencioso em caso de falha: o push é um complemento da ação principal.
 */
export async function enviarPush(
  usuarios: string[],
  payload: PayloadPush
): Promise<void> {
  const ids = Array.from(new Set(usuarios.filter(Boolean)));
  if (ids.length === 0) return;
  if (!servicoDisponivel() || !configurar()) return;

  try {
    const admin = criarClienteAdmin();
    const { data } = await admin
      .from("push_assinaturas")
      .select("id, endpoint, p256dh, auth")
      .in("usuario_id", ids);

    const assinaturas =
      (data as
        | { id: string; endpoint: string; p256dh: string; auth: string }[]
        | null) ?? [];
    if (assinaturas.length === 0) return;

    const corpo = JSON.stringify({
      titulo: payload.titulo,
      corpo: payload.corpo ?? "",
      url: payload.url,
      tag: payload.tag,
    });

    const expiradas: string[] = [];
    await Promise.allSettled(
      assinaturas.map(async (a) => {
        try {
          await webpush.sendNotification(
            { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
            corpo,
            { TTL: 60 * 60 * 24 }
          );
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) expiradas.push(a.id);
        }
      })
    );

    if (expiradas.length > 0) {
      await admin.from("push_assinaturas").delete().in("id", expiradas);
    }
  } catch {
    // ignora
  }
}
