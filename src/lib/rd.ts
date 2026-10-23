import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { cifrar, decifrar } from "@/lib/canva";

/** RD Station Marketing (API v2, OAuth 2.0). Tokens ficam criptografados no banco; só o servidor lê. */
const RD_API = "https://api.rd.services";
export const RD_AUTORIZAR = `${RD_API}/auth/dialog`;

export function rdConfigurado(): boolean {
  return Boolean(process.env.RD_CLIENT_ID && process.env.RD_CLIENT_SECRET);
}

interface RespostaToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function pedirToken(url: string, corpo: Record<string, string>): Promise<RespostaToken> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.RD_CLIENT_ID, client_secret: process.env.RD_CLIENT_SECRET, ...corpo }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`O RD Station recusou o acesso (${res.status}).`);
  return (await res.json()) as RespostaToken;
}

async function salvar(t: RespostaToken, userId?: string) {
  const linha: Record<string, unknown> = {
    id: 1,
    access_cifrado: cifrar(t.access_token),
    refresh_cifrado: cifrar(t.refresh_token),
    expira_em: new Date(Date.now() + (t.expires_in - 120) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (userId) linha.conectado_por = userId;
  const { error } = await criarClienteAdmin().from("rd_conexao").upsert(linha);
  if (error) throw new Error(error.message);
}

/** Troca o código recebido no retorno do RD por tokens e guarda a conexão. */
export async function concluirConexaoRD(code: string, userId: string) {
  const t = await pedirToken(`${RD_API}/auth/token?token_by=code`, { code });
  await salvar(t, userId);
}

export async function conexaoRD(): Promise<{ conectadoEm: string } | null> {
  const { data } = await criarClienteAdmin().from("rd_conexao").select("created_at").eq("id", 1).maybeSingle();
  return data ? { conectadoEm: (data as { created_at: string }).created_at } : null;
}

export async function removerConexaoRD() {
  await criarClienteAdmin().from("rd_conexao").delete().eq("id", 1);
}

/** Token de acesso válido (renova sozinho com o refresh_token quando passa de 24 horas). */
async function tokenValido(): Promise<string | null> {
  const admin = criarClienteAdmin();
  const { data } = await admin.from("rd_conexao").select("access_cifrado, refresh_cifrado, expira_em").eq("id", 1).maybeSingle();
  if (!data) return null;
  const c = data as { access_cifrado: string; refresh_cifrado: string; expira_em: string };
  if (new Date(c.expira_em).getTime() > Date.now()) return decifrar(c.access_cifrado);
  const t = await pedirToken(`${RD_API}/auth/token`, { refresh_token: decifrar(c.refresh_cifrado) });
  await salvar({ ...t, refresh_token: t.refresh_token || decifrar(c.refresh_cifrado) });
  return t.access_token;
}

export interface EmailRD {
  campaign_id: number;
  campaign_name: string;
  send_at: string | null;
  contacts_count: number | null;
  email_dropped_count: number | null;
  email_delivered_count: number | null;
  email_bounced_count: number | null;
  email_opened_count: number | null;
  email_clicked_count: number | null;
  email_unsubscribed_count: number | null;
  email_spam_reported_count: number | null;
  email_delivered_rate: number | null;
  email_opened_rate: number | null;
  email_clicked_rate: number | null;
  email_spam_reported_rate: number | null;
}

/** Estatísticas dos e-mails enviados no período (plano Advanced: sem limite de datas; dados até ontem, em UTC). */
export async function buscarEmailsRD(de: string, ate: string): Promise<EmailRD[]> {
  const token = await tokenValido();
  if (!token) throw new Error("O RD Station ainda não está conectado.");
  const url = `${RD_API}/platform/analytics/emails?start_date=${de}&end_date=${ate}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (res.status === 429) throw new Error("O RD Station limitou as consultas por agora (cerca de 60 por hora). Tente de novo mais tarde.");
  if (res.status === 401 || res.status === 403) throw new Error("O RD Station negou o acesso aos relatórios de e-mail (confira o plano e as permissões do aplicativo).");
  if (!res.ok) throw new Error(`O RD Station respondeu com erro (${res.status}).`);
  const j = (await res.json()) as { emails?: EmailRD[] };
  return j.emails ?? [];
}
