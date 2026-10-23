import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { sincronizarComercial } from "@/features/comercial/sincronizar";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function segredoValido(recebido: string | null): boolean {
  const esperado = process.env.COMERCIAL_SYNC_SECRET;
  if (!esperado || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Chamado pelo Apps Script da planilha quando ela é editada
 * (cabeçalho x-sync-secret). Atualiza o sistema na hora.
 */
export async function POST(req: NextRequest) {
  if (!segredoValido(req.headers.get("x-sync-secret"))) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  if (!servicoDisponivel()) {
    return NextResponse.json({ erro: "serviço indisponível" }, { status: 503 });
  }

  // Evita rajadas (cada edição da planilha chama aqui): ignora se sincronizou há menos de 2 minutos.
  // Os horários automáticos e o botão "Sincronizar" pegam o que ficar de fora.
  const { data } = await criarClienteAdmin()
    .from("comercial_sync")
    .select("sincronizado_em, erro")
    .eq("id", 1)
    .maybeSingle();
  const ultimo = data?.sincronizado_em ? new Date(data.sincronizado_em).getTime() : 0;
  if (!data?.erro && Date.now() - ultimo < 120_000) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  try {
    const r = await sincronizarComercial("planilha");
    revalidatePath("/comercial");
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "falha" },
      { status: 502 }
    );
  }
}
