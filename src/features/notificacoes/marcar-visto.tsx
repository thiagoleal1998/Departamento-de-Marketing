import { criarClienteServidor } from "@/lib/supabase/server";
import { MarcarVistoClient } from "./marcar-visto-client";

/**
 * Ao abrir uma página, marca como lidas as notificações ligadas a ela
 * (zera o contador do menu). Só renderiza algo se houver pendências.
 */
export async function MarcarVisto({
  prefixo,
  exato = false,
}: {
  prefixo: string;
  exato?: boolean;
}) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const filtro = exato
    ? `link.eq.${prefixo},link.like.${prefixo}?%`
    : `link.eq.${prefixo},link.like.${prefixo}?%,link.like.${prefixo}/%`;

  const { count } = await supabase
    .from("notificacoes")
    .select("id", { count: "exact", head: true })
    .eq("destinatario_id", user.id)
    .eq("lida", false)
    .or(filtro);

  if (!count) return null;
  return <MarcarVistoClient prefixo={prefixo} exato={exato} />;
}
