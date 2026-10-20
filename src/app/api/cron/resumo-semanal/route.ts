import { NextResponse, type NextRequest } from "next/server";
import { servicoDisponivel } from "@/lib/supabase/admin";
import { executarResumoSemanal } from "@/features/executivo/resumo";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Toda segunda de manhã, pelo agendador da Vercel (Authorization: Bearer CRON_SECRET). */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  if (!servicoDisponivel()) {
    return NextResponse.json({ erro: "serviço indisponível" }, { status: 503 });
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get("host") ?? "departamento-de-marketing.vercel.app"}`;
  return NextResponse.json(await executarResumoSemanal(base));
}
