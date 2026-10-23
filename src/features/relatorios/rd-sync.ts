import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { buscarEmailsRD } from "@/lib/rd";
import { hojeSP, somarDias } from "@/features/divulgacao/tipos";

/**
 * Busca no RD Station os e-mails enviados no período e guarda no banco (assim as telas não consultam o RD
 * a cada abertura: a API tem limite por hora). Os dados do RD vão até ontem (D-1, em UTC).
 */
export async function sincronizarEmailsRD(de: string, ateSolicitado: string): Promise<{ emails: number; de: string; ate: string }> {
  const ontem = somarDias(hojeSP(), -1);
  const ate = ateSolicitado > ontem ? ontem : ateSolicitado;
  if (de > ate) throw new Error("O período precisa terminar até ontem (o RD consolida os dados no dia seguinte).");

  const admin = criarClienteAdmin();
  try {
    const emails = await buscarEmailsRD(de, ate);
    const agora = new Date().toISOString();
    const linhas = emails.map((e) => ({
      campaign_id: e.campaign_id,
      nome: e.campaign_name,
      enviado_em: e.send_at,
      contatos: e.contacts_count,
      entregues: e.email_delivered_count,
      descartados: e.email_dropped_count,
      rejeitados: e.email_bounced_count,
      abertos: e.email_opened_count,
      cliques: e.email_clicked_count,
      descadastros: e.email_unsubscribed_count,
      spam: e.email_spam_reported_count,
      taxa_entrega: e.email_delivered_rate,
      taxa_abertura: e.email_opened_rate,
      taxa_clique: e.email_clicked_rate,
      taxa_spam: e.email_spam_reported_rate,
      atualizado_em: agora,
    }));
    for (let i = 0; i < linhas.length; i += 200) {
      const { error } = await admin.from("rd_emails").upsert(linhas.slice(i, i + 200));
      if (error) throw new Error(error.message);
    }
    await admin.from("rd_sync").upsert({ id: 1, sincronizado_em: agora, de, ate, emails: linhas.length, erro: null });
    return { emails: linhas.length, de, ate };
  } catch (e) {
    await admin.from("rd_sync").upsert({ id: 1, sincronizado_em: new Date().toISOString(), de, ate, emails: 0, erro: e instanceof Error ? e.message : "falha" });
    throw e;
  }
}
