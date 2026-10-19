import { NextResponse, type NextRequest } from "next/server";
import { servicoDisponivel } from "@/lib/supabase/admin";
import { sincronizarComercial } from "@/features/comercial/sincronizar";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Sincronização diária da planilha Comercial (Authorization: Bearer CRON_SECRET). */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  if (!servicoDisponivel()) {
    return NextResponse.json({ erro: "serviço indisponível" }, { status: 503 });
  }
  try {
    return NextResponse.json(await sincronizarComercial("agendado"));
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "falha" },
      { status: 502 }
    );
  }
}
