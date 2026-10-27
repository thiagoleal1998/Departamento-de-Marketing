import { presencaAgora } from "./batimento-actions";
import { PresencaOnlineCliente } from "./presenca-online-cliente";

/** Indicação de quem está online agora, para o painel de gerente e líder. */
export async function PresencaOnline({ euId }: { euId: string }) {
  const inicial = await presencaAgora().catch(() => []);
  return <PresencaOnlineCliente inicial={inicial} euId={euId} />;
}
