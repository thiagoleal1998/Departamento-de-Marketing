import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { pode } from "@/lib/permissions";
import type { Papel } from "@/types";
import { divulgacoesDoPeriodo, lerFiltro } from "@/features/relatorios/dados";
import { itensDaLinha } from "@/features/relatorios/agregar";

export const dynamic = "force-dynamic";

const celula = (v: string | number | null | undefined) => {
  const t = String(v ?? "").replace(/\r?\n/g, " ").trim();
  return /[";]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/** Baixa o relatório de divulgação (uma linha por produto divulgado) em CSV para o Excel. */
export async function GET(req: NextRequest) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  const { data: eu } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!pode((eu as { role: Papel } | null)?.role, "ver_relatorios_gerais")) {
    return NextResponse.json({ erro: "sem permissão" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const f = lerFiltro({
    de: sp.get("de") ?? undefined,
    ate: sp.get("ate") ?? undefined,
    tipo: sp.get("tipo") ?? undefined,
    q: sp.get("q") ?? undefined,
    periodo: sp.get("periodo") ?? undefined,
    regime: sp.get("regime") ?? undefined,
  });
  const { linhas } = await divulgacoesDoPeriodo(f);

  const saida = ["Data;Origem;Tipo de divulgação;Produto / destino;Período;Temporada;Regime"];
  for (const l of linhas) {
    for (const i of itensDaLinha(l).filter((x) => (!f.periodo || x.grupoPeriodo === f.periodo) && (!f.regime || x.regime === f.regime))) {
      saida.push(
        [i.data.split("-").reverse().join("/"), i.tipo === "nacional" ? "Nacional" : "Internacional", i.tipoDivulgacao, i.produto, i.grupoPeriodo, i.temporada, i.regime]
          .map(celula)
          .join(";")
      );
    }
  }
  // BOM para o Excel abrir os acentos corretamente.
  return new NextResponse("﻿" + saida.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-divulgacao-${f.de}_a_${f.ate}.csv"`,
    },
  });
}
