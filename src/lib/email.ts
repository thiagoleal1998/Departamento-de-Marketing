/**
 * Envio de e-mail pelo Resend (https://resend.com). Só funciona com RESEND_API_KEY configurada;
 * EMAIL_REMETENTE define o remetente (ex.: "Painel de Marketing <painel@seudominio.com.br>").
 * Silencioso em caso de falha: o e-mail é um complemento do aviso no app.
 */
export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE);
}

export async function enviarEmail(para: string, assunto: string, html: string, texto?: string): Promise<boolean> {
  if (!emailConfigurado()) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_REMETENTE, to: [para], subject: assunto, html, text: texto }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
