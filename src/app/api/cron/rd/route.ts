import { NextResponse, type NextRequest } from "next/server";
import { servicoDisponivel } from "@/lib/supabase/admin";
import { conexaoRD, rdConfigurado } from "@/lib/rd";
import { sincronizarEmailsRD } from "@/features/relatorios/rd-sync";
import { hojeSP, somarDias } from "@/features/divulgacao/tipos";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Todo dia de manhã (Authorization: Bearer CRON_SECRET): atualiza os e-mails dos últimos 14 dias. */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  if (!servicoDisponivel()) return NextResponse.json({ erro: "serviço indisponível" }, { status: 503 });
  if (!rdConfigurado() || !(await conexaoRD())) return NextResponse.json({ ok: true, ignorado: "RD Station não conectado" });
  try {
    const hoje = hojeSP();
    return NextResponse.json({ ok: true, ...(await sincronizarEmailsRD(somarDias(hoje, -14), somarDias(hoje, -1))) });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "falha" }, { status: 502 });
  }
}
