import { obterConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Serve a logo da marca (a estrela enviada em Configurações) como favicon.
 * A extensão .png no caminho mantém a rota fora do middleware de autenticação.
 */
export async function GET() {
  const { logo } = await obterConfig();
  if (!logo) return new Response(null, { status: 404 });

  if (logo.startsWith("data:")) {
    const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(logo);
    if (!m) return new Response(null, { status: 404 });
    const tipo = m[1];
    const corpo = m[2]
      ? Buffer.from(m[3], "base64")
      : Buffer.from(decodeURIComponent(m[3]));
    return new Response(new Uint8Array(corpo), {
      headers: {
        "Content-Type": tipo,
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  return Response.redirect(logo, 302);
}
