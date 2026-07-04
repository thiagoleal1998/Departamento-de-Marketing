import { redirect } from "next/navigation";
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Timer,
  Stamp,
} from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { pode } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { mapaDePerfis } from "@/features/chamados/data";
import { PageHeader } from "@/components/shared/page-header";
import { DataCard } from "@/components/shared/data-card";
import { BarChartH, type BarraDado } from "@/components/shared/bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CHAMADO_STATUS_META,
  CHAMADO_TIPO_LABEL,
  type ChamadoStatus,
  type ChamadoTipo,
} from "@/types";
import type { Chamado, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

/** Conta ocorrências por rótulo, ordena desc e agrupa a cauda em "Outros". */
function contarPor(
  chamados: Chamado[],
  chave: (c: Chamado) => string | null | undefined,
  limite = 8
): BarraDado[] {
  const mapa = new Map<string, number>();
  for (const c of chamados) {
    const k = chave(c);
    if (!k) continue;
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  const ordenado = [...mapa.entries()]
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor);
  if (ordenado.length <= limite) return ordenado;
  const top = ordenado.slice(0, limite);
  const resto = ordenado.slice(limite).reduce((s, d) => s + d.valor, 0);
  return [...top, { label: "Outros", valor: resto }];
}

export default async function GestaoPage() {
  const usuario = await exigirUsuario();
  if (!pode(usuario.role, "ver_relatorios_gerais")) redirect("/dashboard");

  const supabase = await criarClienteServidor();
  const [{ data }, perfis] = await Promise.all([
    supabase.from("chamados").select("*"),
    mapaDePerfis(),
  ]);
  const chamados = (data as Chamado[] | null) ?? [];

  const finalizados = chamados.filter(
    (c) => c.status === "resolvido" || c.status === "fechado"
  );
  const abertos = chamados.filter(
    (c) => c.status !== "resolvido" && c.status !== "fechado"
  );
  const emAndamento = chamados.filter((c) => c.status === "em_andamento");
  const atrasados = abertos.filter(
    (c) => c.prazo_sla && new Date(c.prazo_sla).getTime() < Date.now()
  );
  const aguardandoAprovacao = chamados.filter(
    (c) => (c.aprovacao ?? "pendente") === "pendente"
  );

  // Tempo médio de resolução (dias) usando updated_at como proxy de conclusão.
  const tempos = finalizados
    .map(
      (c) =>
        (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) /
        86_400_000
    )
    .filter((d) => d >= 0);
  const tempoMedio =
    tempos.length > 0
      ? (tempos.reduce((s, d) => s + d, 0) / tempos.length).toFixed(1)
      : "—";

  const porStatus: BarraDado[] = (
    Object.keys(CHAMADO_STATUS_META) as ChamadoStatus[]
  )
    .map((s) => ({
      label: CHAMADO_STATUS_META[s].label,
      valor: chamados.filter((c) => c.status === s).length,
    }))
    .filter((d) => d.valor > 0);

  const porTipo = contarPor(
    chamados,
    (c) => CHAMADO_TIPO_LABEL[c.tipo as ChamadoTipo] ?? c.tipo
  );
  const porCanal = contarPor(chamados, (c) => c.categoria);
  const porDepartamento = contarPor(chamados, (c) => c.departamento);
  const porSegmento = contarPor(chamados, (c) => c.segmento);
  const porResponsavel = contarPor(chamados, (c) =>
    c.responsavel_id
      ? (perfis.get(c.responsavel_id) as Profile | undefined)?.nome ?? null
      : "Sem responsável"
  );

  const graficos: { titulo: string; dados: BarraDado[] }[] = [
    { titulo: "Por status", dados: porStatus },
    { titulo: "Por canal", dados: porCanal },
    { titulo: "Por departamento", dados: porDepartamento },
    { titulo: "Por segmento", dados: porSegmento },
    { titulo: "Por tipo", dados: porTipo },
    { titulo: "Por responsável", dados: porResponsavel },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Gestão"
        descricao="Indicadores e performance dos chamados de marketing."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <DataCard titulo="Total de chamados" valor={chamados.length} icone={Ticket} />
        <DataCard titulo="Em aberto" valor={abertos.length} icone={Clock} />
        <DataCard titulo="Em andamento" valor={emAndamento.length} icone={Timer} />
        <DataCard
          titulo="Resolvidos"
          valor={finalizados.length}
          icone={CheckCircle2}
        />
        <DataCard
          titulo="Atrasados"
          valor={atrasados.length}
          icone={AlertTriangle}
          descricao="Abertos após o prazo"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DataCard
          titulo="Aguardando aprovação"
          valor={aguardandoAprovacao.length}
          icone={Stamp}
          descricao="Pendentes do gerente"
          href="/chamados"
        />
        <DataCard
          titulo="Tempo médio de resolução"
          valor={tempoMedio === "—" ? "—" : `${tempoMedio} dias`}
          icone={Timer}
          descricao="Da abertura à conclusão"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {graficos.map((g) => (
          <Card key={g.titulo}>
            <CardHeader>
              <CardTitle className="text-base">{g.titulo}</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChartH dados={g.dados} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
