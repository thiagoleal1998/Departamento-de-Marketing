import { NextResponse, type NextRequest } from "next/server";
import { servicoDisponivel } from "@/lib/supabase/admin";
import { executarCobrancaAtas } from "@/features/atas/cobranca";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Chamada diária pelo agendador da Vercel (Authorization: Bearer CRON_SECRET). */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  if (!servicoDisponivel()) {
    return NextResponse.json({ erro: "serviço indisponível" }, { status: 503 });
  }
  const resultado = await executarCobrancaAtas();
  return NextResponse.json(resultado);
}
