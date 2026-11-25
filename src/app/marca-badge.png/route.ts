import sharp from "sharp";
import { obterConfig } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Bytes da logo configurada (data URL ou endereço externo). */
async function lerLogo(logo: string): Promise<Buffer | null> {
  if (logo.startsWith("data:")) {
    const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(logo);
    if (!m) return null;
    return m[2] ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]));
  }
  const r = await fetch(logo);
  return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
}

/**
 * Ícone pequeno das notificações (Android): uma silhueta BRANCA da estrela da marca, sobre fundo transparente.
 * O Android pinta esse ícone só pelo canal de transparência; a logo colorida viraria um quadrado branco.
 * A extensão .png no caminho mantém a rota fora do middleware de autenticação.
 */
export async function GET() {
  try {
    const { logo } = await obterConfig();
    if (!logo) return new Response(null, { status: 404 });
    const bytes = await lerLogo(logo);
    if (!bytes) return new Response(null, { status: 404 });

    const lado = 96;
    const { data, info } = await sharp(bytes)
      .resize(lado, lado, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Tudo que se afasta do branco (e não é transparente) vira silhueta branca.
    const saida = Buffer.alloc(info.width * info.height * 4);
    for (let i = 0; i < info.width * info.height; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      const a = data[i * 4 + 3] / 255;
      const distancia = Math.max(255 - r, 255 - g, 255 - b) / 255;
      saida[i * 4] = 255;
      saida[i * 4 + 1] = 255;
      saida[i * 4 + 2] = 255;
      saida[i * 4 + 3] = Math.round(Math.min(1, a * distancia * 4) * 255);
    }
    const png = await sharp(saida, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
    return new Response(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
