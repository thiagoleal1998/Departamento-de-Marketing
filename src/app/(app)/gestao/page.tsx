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
import { GestaoAbas } from "@/features/perfis/gestao-abas";
import { feriadosDoAno } from "@/features/feriados/calendario";
import { hojeSP } from "@/features/divulgacao/tipos";
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
  const hoje = hojeSP();
  const ano = Number(hoje.slice(0, 4));
  const [{ data }, perfis, escalaR, extrasR, avisosR, pessoasR, histR] = await Promise.all([
    supabase.from("chamados").select("*"),
    mapaDePerfis(),
    supabase.from("escala_feriados").select("data, profile_id").gte("data", `${ano}-01-01`).lte("data", `${ano}-12-31`),
    supabase.from("feriados_extras").select("data").gte("data", `${ano}-01-01`).lte("data", `${ano}-12-31`),
    supabase.from("escala_avisos").select("data").gte("data", `${ano}-01-01`).lte("data", `${ano}-12-31`),
    supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome", { ascending: true }),
    supabase.from("chamado_historico").select("chamado_id, para, created_at").eq("campo", "status").order("created_at", { ascending: true }),
  ]);
  const chamados = (data as Chamado[] | null) ?? [];

  // Feriados do ano: só entram na conta os que já têm escala montada (ou folga avisada), para não contar como
  // "folga" os que passaram antes de a escala existir.
  const escala = (escalaR.data as { data: string; profile_id: string }[] | null) ?? [];
  const datasFeriado = new Set([...feriadosDoAno(ano).map((f) => f.data), ...((extrasR.data as { data: string }[] | null) ?? []).map((e) => e.data)]);
  const registradas = new Set([...escala.map((e) => e.data), ...((avisosR.data as { data: string }[] | null) ?? []).map((a) => a.data)]);
  const contados = [...registradas].filter((d) => datasFeriado.has(d) && d <= hoje);
  const proximos = [...registradas].filter((d) => datasFeriado.has(d) && d > hoje);
  const feriadosPorPessoa = ((pessoasR.data as { id: string; nome: string }[] | null) ?? []).map((p) => {
    const trabalhou = contados.filter((d) => escala.some((e) => e.data === d && e.profile_id === p.id)).length;
    const escalado = proximos.filter((d) => escala.some((e) => e.data === d && e.profile_id === p.id)).length;
    return { nome: p.nome, trabalhou, folgou: contados.length - trabalhou, escalado, folgaProx: proximos.length - escalado };
  });

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

  // Tempo médio de resolução (dias) = média de (data da conclusão − data da abertura) dos chamados Resolvidos/Fechados.
  // A data da conclusão é a da ÚLTIMA mudança de status para Resolvido/Fechado no histórico do chamado; se o chamado
  // não tiver esse registro, usa a última atualização (updated_at), que é só uma aproximação.
  const concluidoEm = new Map<string, string>();
  for (const h of (histR.data as { chamado_id: string; para: string | null; created_at: string }[] | null) ?? []) {
    if (/^(resolvido|fechado)$/i.test((h.para ?? "").trim())) concluidoEm.set(h.chamado_id, h.created_at);
  }
  const tempos = finalizados
    .map((c) => (new Date(concluidoEm.get(c.id) ?? c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86_400_000)
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
        descricao="Indicadores dos chamados da Central de Solicitações, escala de feriados, fluxos e processos, perfis e férias."
      />
      <GestaoAbas ativa="indicadores" />

      <section className="space-y-1">
        <h2 className="text-base font-semibold">Chamados (Central de Solicitações)</h2>
        <p className="text-xs text-muted-foreground">
          Os números abaixo contam <strong>apenas os chamados</strong> abertos pela Central de Solicitações. Não incluem as tarefas do quadro nem os itens das atas — para o andamento delas, veja <strong>Relatórios → Evolução do operacional</strong>.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <DataCard titulo="Total de chamados" valor={chamados.length} icone={Ticket} href="/chamados" />
        <DataCard titulo="Chamados em aberto" valor={abertos.length} icone={Clock} />
        <DataCard titulo="Chamados em andamento" valor={emAndamento.length} icone={Timer} />
        <DataCard
          titulo="Chamados resolvidos"
          valor={finalizados.length}
          icone={CheckCircle2}
          descricao="Resolvidos ou fechados"
        />
        <DataCard
          titulo="Chamados atrasados"
          valor={atrasados.length}
          icone={AlertTriangle}
          descricao="Abertos após o prazo"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DataCard
          titulo="Chamados aguardando aprovação"
          valor={aguardandoAprovacao.length}
          icone={Stamp}
          descricao="Pendentes do gerente"
          href="/chamados"
        />
        <DataCard
          titulo="Tempo médio de resolução dos chamados"
          valor={tempoMedio === "—" ? "—" : `${tempoMedio} dias`}
          icone={Timer}
          descricao={`Da abertura à conclusão · média de ${tempos.length} chamado(s) concluído(s)`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feriados em {ano}: quem trabalhou e quem folgou</CardTitle>
        </CardHeader>
        <CardContent>
          {contados.length === 0 && proximos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma escala de feriado montada em {ano}. Monte em Escala de feriados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Pessoa</th>
                    <th className="px-3 py-2 text-center font-medium">Trabalhou</th>
                    <th className="px-3 py-2 text-center font-medium">Folgou</th>
                    <th className="px-3 py-2 text-center font-medium">Escalado (próximos)</th>
                    <th className="px-3 py-2 text-center font-medium">De folga (próximos)</th>
                  </tr>
                </thead>
                <tbody>
                  {feriadosPorPessoa.map((p) => (
                    <tr key={p.nome} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{p.nome}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{p.trabalhou}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{p.folgou}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{p.escalado}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{p.folgaProx}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground">
                Conta os feriados que já aconteceram e têm escala registrada ({contados.length}) e os próximos já escalados ({proximos.length}).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-1">
        <h2 className="text-base font-semibold">Chamados: distribuição</h2>
        <p className="text-xs text-muted-foreground">Como os chamados se dividem por status, canal, departamento, segmento e responsável.</p>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        {graficos.map((g) => (
          <Card key={g.titulo}>
            <CardHeader>
              <CardTitle className="text-base">Chamados {g.titulo.charAt(0).toLowerCase() + g.titulo.slice(1)}</CardTitle>
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
