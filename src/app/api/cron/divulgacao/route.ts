import { NextResponse, type NextRequest } from "next/server";
import { servicoDisponivel } from "@/lib/supabase/admin";
import { sincronizarDivulgacao } from "@/features/divulgacao/sincronizar";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Todo dia às 10:30 (horário de Brasília), pelo agendador da Vercel (Authorization: Bearer CRON_SECRET). */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  if (!servicoDisponivel()) {
    return NextResponse.json({ erro: "serviço indisponível" }, { status: 503 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await sincronizarDivulgacao("agendado")) });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "falha" }, { status: 502 });
  }
}
