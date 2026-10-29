import "server-only";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";
import { diaBrasilia } from "@/lib/utils";
import { areaDoSolicitante } from "@/features/operacional/solicitantes";
import { carregarAtas, carregarMembros, itemAberto, type ItemAta } from "@/features/atas/data";
import { calcularRelatorio, type Relatorio } from "@/features/atas/relatorios-calculo";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotuloMes = (m: string) => `${MESES[Number(m.slice(5)) - 1]}/${m.slice(2, 4)}`;
const rotuloDia = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`;
const DIA_MS = 86_400_000;
const diasEntre = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / DIA_MS);

export const ROTULO_STATUS_TAREFA: Record<string, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  aprovacao_marco: "Em aprovação (Marco)",
  aprovacao_gustavo: "Em aprovação (Gustavo)",
  aprovacao_thiago: "Em aprovação (Thiago)",
  alteracoes: "Alterações",
  revisao: "Em revisão",
  concluida: "Concluída",
};

export interface PontoReuniao {
  data: string;
  rotulo: string;
  /** Itens da ata naquela reunião. */
  total: number;
  abertos: number;
  novos: number;
  concluidos: number;
  adiados: number;
  pctConcluidos: number;
  pctAdiados: number;
}

export interface PontoMes {
  mes: string;
  rotulo: string;
  criadas: number;
  concluidas: number;
  pctConcluidas: number;
  /** Média de dias entre a criação e o prazo combinado. */
  prazoMedioDias: number | null;
}

export interface TarefaAtrasada {
  titulo: string;
  responsavel: string;
  dias: number;
  status: string;
}

export interface DadosOperacional {
  geradoEm: string;
  kpis: {
    tarefasAbertas: number;
    atrasadas: number;
    emAprovacao: number;
    mediaReunioesAteConcluir: number | null;
    pctConcluidosUltima: number | null;
    pctAdiadosUltimas4: number | null;
  };
  reunioes: PontoReuniao[];
  meses: PontoMes[];
  statusAtual: { rotulo: string; valor: number }[];
  /** Quem pede as tarefas (campo Solicitante). */
  solicitantes: {
    /** Tarefas com solicitante informado, e o total de tarefas. */
    comDado: number;
    total: number;
    porPessoa: { rotulo: string; valor: number; detalhe: string }[];
    porArea: { rotulo: string; valor: number; detalhe: string }[];
    /** Uma linha por tarefa com solicitante (o filtro de mês e o gráfico por mês são feitos na tela). */
    linhas: { mes: string; solicitante: string; area: string; aberta: boolean }[];
    /** Campo ainda não existe no banco (migration 0086 não rodada). */
    semColuna: boolean;
  };
  atrasadas: TarefaAtrasada[];
  atrasadasPorPessoa: [string, number][];
  paradasEmAprovacao: { titulo: string; etapa: string; responsavel: string; dias: number }[];
  /** Quem está com a aprovação (Marco, Gustavo, Thiago) e quantas tarefas voltaram para alterações. */
  aprovacaoPorPessoa: { rotulo: string; valor: number }[];
  relatorioAtas: Relatorio | null;
  insights: { tom: "bom" | "atencao" | "neutro"; texto: string }[];
}

interface TarefaLinha {
  titulo: string;
  status: string;
  prazo: string | null;
  responsavel_id: string | null;
  responsaveis_notion: string | null;
  created_at: string;
  solicitante?: string | null;
}

const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

/** Reúne tarefas e atas para mostrar como o operacional evolui e onde corrigir. */
export async function dadosOperacional(): Promise<DadosOperacional> {
  const hoje = diaBrasilia(new Date());
  const cliente = servicoDisponivel() ? criarClienteAdmin() : await criarClienteServidor();

  const [{ data: tarefasData, error: tarefasErro }, { data: perfisData }, atas, membros] = await Promise.all([
    cliente.from("tarefas").select("titulo, status, prazo, responsavel_id, responsaveis_notion, created_at, solicitante").limit(5000),
    cliente.from("profiles").select("id, nome"),
    carregarAtas().catch(() => ({ reunioes: [], itens: [] as ItemAta[] })),
    carregarMembros().catch(() => []),
  ]);
  let tarefas = (tarefasData as TarefaLinha[] | null) ?? [];
  // Sem a migration 0086 a coluna "solicitante" não existe e a consulta inteira falharia: repete sem ela.
  let semColunaSolicitante = false;
  if (tarefasErro) {
    semColunaSolicitante = true;
    const { data: de } = await cliente.from("tarefas").select("titulo, status, prazo, responsavel_id, responsaveis_notion, created_at").limit(5000);
    tarefas = (de as TarefaLinha[] | null) ?? [];
  }
  const nomes = new Map(((perfisData as { id: string; nome: string }[] | null) ?? []).map((p) => [p.id, p.nome.split(" ")[0]]));
  const quem = (t: TarefaLinha) => (t.responsavel_id ? nomes.get(t.responsavel_id) : null) ?? t.responsaveis_notion?.split(/[,;]/)[0]?.trim().split(" ")[0] ?? "Sem responsável";

  // ---- Tarefas: por mês de criação ----
  const porMes = new Map<string, { criadas: number; concluidas: number; prazos: number[] }>();
  for (const t of tarefas) {
    const m = diaBrasilia(t.created_at).slice(0, 7);
    const x = porMes.get(m) ?? { criadas: 0, concluidas: 0, prazos: [] };
    x.criadas++;
    if (t.status === "concluida") x.concluidas++;
    if (t.prazo) {
      const d = diasEntre(diaBrasilia(t.created_at), diaBrasilia(t.prazo));
      if (d >= 0 && d <= 180) x.prazos.push(d);
    }
    porMes.set(m, x);
  }
  const meses: PontoMes[] = Array.from(porMes.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([mes, x]) => ({
      mes,
      rotulo: rotuloMes(mes),
      criadas: x.criadas,
      concluidas: x.concluidas,
      pctConcluidas: x.criadas ? (x.concluidas / x.criadas) * 100 : 0,
      prazoMedioDias: x.prazos.length >= 3 ? media(x.prazos) : null,
    }));

  // ---- Tarefas: situação de hoje ----
  const abertas = tarefas.filter((t) => t.status !== "concluida");
  const contStatus = new Map<string, number>();
  for (const t of abertas) contStatus.set(t.status, (contStatus.get(t.status) ?? 0) + 1);
  const statusAtual = Array.from(contStatus.entries())
    .map(([s, valor]) => ({ rotulo: ROTULO_STATUS_TAREFA[s] ?? s, valor }))
    .sort((a, b) => b.valor - a.valor);

  const atrasadas: TarefaAtrasada[] = abertas
    .filter((t) => t.prazo && diaBrasilia(t.prazo) < hoje)
    .map((t) => ({ titulo: t.titulo, responsavel: quem(t), dias: diasEntre(diaBrasilia(t.prazo as string), hoje), status: ROTULO_STATUS_TAREFA[t.status] ?? t.status }))
    .sort((a, b) => b.dias - a.dias);
  const porPessoa = new Map<string, number>();
  for (const a of atrasadas) porPessoa.set(a.responsavel, (porPessoa.get(a.responsavel) ?? 0) + 1);
  const atrasadasPorPessoa = Array.from(porPessoa.entries()).sort((a, b) => b[1] - a[1]);

  const paradasEmAprovacao = abertas
    .filter((t) => t.status.startsWith("aprovacao_") || t.status === "alteracoes")
    .map((t) => ({ titulo: t.titulo, etapa: ROTULO_STATUS_TAREFA[t.status] ?? t.status, responsavel: quem(t), dias: diasEntre(diaBrasilia(t.created_at), hoje), status: t.status }))
    .sort((a, b) => b.dias - a.dias);
  const ROTULO_APROVADOR: Record<string, string> = {
    aprovacao_marco: "Aprovação do Marco",
    aprovacao_gustavo: "Aprovação do Gustavo",
    aprovacao_thiago: "Aprovação do Thiago",
    alteracoes: "Alterações (voltaram para o time)",
  };
  const contAprov = new Map<string, number>();
  for (const t of paradasEmAprovacao) contAprov.set(t.status, (contAprov.get(t.status) ?? 0) + 1);
  const aprovacaoPorPessoa = Array.from(contAprov.entries())
    .map(([s, valor]) => ({ rotulo: ROTULO_APROVADOR[s] ?? ROTULO_STATUS_TAREFA[s] ?? s, valor }))
    .sort((a, b) => b.valor - a.valor);

  // ---- Quem solicita (campo Solicitante das tarefas) ----
  const porSolic = new Map<string, { total: number; abertas: number }>();
  const porAreaMapa = new Map<string, { total: number; abertas: number }>();
  let comSolicitante = 0;
  const linhasSolic: { mes: string; solicitante: string; area: string; aberta: boolean }[] = [];
  for (const t of tarefas) {
    const nome = t.solicitante?.trim();
    if (!nome) continue;
    comSolicitante++;
    linhasSolic.push({ mes: diaBrasilia(t.created_at).slice(0, 7), solicitante: nome, area: areaDoSolicitante(nome), aberta: t.status !== "concluida" });
    const aberta = t.status !== "concluida" ? 1 : 0;
    const a = porSolic.get(nome) ?? { total: 0, abertas: 0 };
    a.total++;
    a.abertas += aberta;
    porSolic.set(nome, a);
    const area = areaDoSolicitante(nome);
    const b = porAreaMapa.get(area) ?? { total: 0, abertas: 0 };
    b.total++;
    b.abertas += aberta;
    porAreaMapa.set(area, b);
  }
  const ordenar = (m: Map<string, { total: number; abertas: number }>, max: number) =>
    Array.from(m.entries())
      .sort((x, y) => y[1].total - x[1].total || x[0].localeCompare(y[0], "pt-BR"))
      .slice(0, max)
      .map(([rotulo, v]) => ({ rotulo, valor: v.total, detalhe: `${v.abertas} aberta(s)` }));
  const solicitantes = { comDado: comSolicitante, total: tarefas.length, porPessoa: ordenar(porSolic, 10), porArea: ordenar(porAreaMapa, 8), linhas: linhasSolic, semColuna: semColunaSolicitante };

  // ---- Atas: por reunião ----
  const ordem = atas.reunioes.filter((r) => r.estado === "realizada").sort((a, b) => a.data.localeCompare(b.data));
  const porReuniao = new Map<string, ItemAta[]>();
  for (const it of atas.itens) {
    if (it.secao !== "ata") continue;
    const l = porReuniao.get(it.reuniao_id) ?? [];
    l.push(it);
    porReuniao.set(it.reuniao_id, l);
  }
  const vistas = new Set<string>();
  const ultimoPrazo = new Map<string, string>();
  const reunioesTodas: PontoReuniao[] = [];
  for (const r of ordem) {
    const itens = porReuniao.get(r.id) ?? [];
    if (itens.length === 0) continue;
    let novos = 0;
    let adiados = 0;
    for (const it of itens) {
      if (!vistas.has(it.serie)) novos++;
      const antes = ultimoPrazo.get(it.serie);
      const agora = it.prazo ? diaBrasilia(it.prazo) : null;
      if (antes && agora && agora > antes && itemAberto(it.status)) adiados++;
      if (agora) ultimoPrazo.set(it.serie, agora);
      vistas.add(it.serie);
    }
    const concluidos = itens.filter((i) => i.status === "concluido").length;
    reunioesTodas.push({
      data: r.data,
      rotulo: rotuloDia(r.data),
      total: itens.length,
      abertos: itens.filter((i) => itemAberto(i.status)).length,
      novos,
      concluidos,
      adiados,
      pctConcluidos: (concluidos / itens.length) * 100,
      pctAdiados: (adiados / itens.length) * 100,
    });
  }
  const reunioes = reunioesTodas.slice(-20);

  let relatorioAtas: Relatorio | null = null;
  try {
    const nomeIt = (it: ItemAta) => (it.responsavel_id ? nomes.get(it.responsavel_id) : null) ?? it.responsaveis_texto?.split(" ")[0] ?? "Sem responsável";
    relatorioAtas = calcularRelatorio(atas.reunioes, atas.itens, nomeIt, membros);
  } catch {
    relatorioAtas = null;
  }

  // ---- KPIs e leituras automáticas ----
  const ult = reunioes[reunioes.length - 1];
  const ult4 = reunioes.slice(-4);
  const ant4 = reunioes.slice(-8, -4);
  const kpis = {
    tarefasAbertas: abertas.length,
    atrasadas: atrasadas.length,
    emAprovacao: paradasEmAprovacao.length,
    mediaReunioesAteConcluir: relatorioAtas?.demandas.mediaReunioesAteConcluir ?? null,
    pctConcluidosUltima: ult ? ult.pctConcluidos : null,
    pctAdiadosUltimas4: ult4.length ? media(ult4.map((r) => r.pctAdiados)) : null,
  };

  const insights: DadosOperacional["insights"] = [];
  if (ult4.length >= 2 && ant4.length >= 2) {
    const a = media(ult4.map((r) => r.abertos));
    const b = media(ant4.map((r) => r.abertos));
    if (b > 0) {
      const v = ((a - b) / b) * 100;
      insights.push({
        tom: v <= -5 ? "bom" : v >= 5 ? "atencao" : "neutro",
        texto: `Itens em aberto por reunião: média de ${a.toFixed(1).replace(".", ",")} nas últimas 4 reuniões, contra ${b.toFixed(1).replace(".", ",")} nas 4 anteriores (${v > 0 ? "+" : ""}${v.toFixed(0)}%).`,
      });
    }
    const c = media(ult4.map((r) => r.pctConcluidos));
    const d = media(ant4.map((r) => r.pctConcluidos));
    insights.push({
      tom: c - d >= 3 ? "bom" : c - d <= -3 ? "atencao" : "neutro",
      texto: `Itens concluídos por reunião: ${c.toFixed(0)}% nas últimas 4, contra ${d.toFixed(0)}% nas 4 anteriores.`,
    });
    const e = media(ult4.map((r) => r.pctAdiados));
    const f = media(ant4.map((r) => r.pctAdiados));
    insights.push({
      tom: e - f <= -2 ? "bom" : e - f >= 2 ? "atencao" : "neutro",
      texto: `Itens com prazo adiado: ${e.toFixed(0)}% nas últimas 4 reuniões, contra ${f.toFixed(0)}% nas 4 anteriores.`,
    });
  }
  const mp = meses.filter((m) => m.prazoMedioDias !== null);
  if (mp.length >= 2) {
    const a = mp[mp.length - 1];
    const b = mp[mp.length - 2];
    insights.push({
      tom: "neutro",
      texto: `Prazo médio combinado nas tarefas: ${(a.prazoMedioDias as number).toFixed(0)} dias em ${a.rotulo}, contra ${(b.prazoMedioDias as number).toFixed(0)} em ${b.rotulo}.`,
    });
  }
  if (atrasadas.length > 0) {
    const [p, n] = atrasadasPorPessoa[0];
    insights.push({ tom: "atencao", texto: `${atrasadas.length} tarefa(s) atrasada(s) hoje; a maior fila está com ${p} (${n}). A mais antiga venceu há ${atrasadas[0].dias} dia(s).` });
  } else {
    insights.push({ tom: "bom", texto: "Nenhuma tarefa atrasada hoje." });
  }
  if (paradasEmAprovacao.length > 0) {
    const detalhe = aprovacaoPorPessoa.map((x) => `${x.rotulo.replace("Aprovação do ", "")} ${x.valor}`).join(", ");
    insights.push({ tom: "atencao", texto: `${paradasEmAprovacao.length} tarefa(s) esperando aprovação ou alteração (${detalhe}); a mais antiga foi criada há ${paradasEmAprovacao[0].dias} dia(s).` });
  }
  if (solicitantes.porPessoa.length > 0) {
    const top = solicitantes.porPessoa[0];
    const area = solicitantes.porArea[0];
    insights.push({
      tom: "neutro",
      texto: `Quem mais pede tarefas: ${top.rotulo} (${top.valor} de ${solicitantes.comDado} com solicitante informado)${area ? `; a área que mais pede é ${area.rotulo} (${area.valor})` : ""}.`,
    });
  }
  const motivo = relatorioAtas?.motivos[0];
  if (motivo) insights.push({ tom: "atencao", texto: `Principal motivo de adiamento nas atas: ${motivo[0]} (${motivo[1]} ocorrência(s)).` });
  const tipo = relatorioAtas?.porTipo.filter((t) => t.total >= 5).sort((a, b) => b.adiamentos / b.total - a.adiamentos / a.total)[0];
  if (tipo && tipo.adiamentos > 0) insights.push({ tom: "atencao", texto: `Tipo de demanda que mais atrasa: ${tipo.tipo} (${tipo.adiamentos} adiamento(s) em ${tipo.total} item(ns)).` });

  return { geradoEm: new Date().toISOString(), kpis, reunioes, meses, statusAtual, atrasadas, atrasadasPorPessoa, solicitantes, paradasEmAprovacao: paradasEmAprovacao.map(({ status: _s, ...resto }) => resto), aprovacaoPorPessoa, relatorioAtas, insights };
}
