import { BLOCOS, type DadosFluxo, type NoFluxo, type Pendencia, type Processo } from "./tipos";

/** Etapas na ordem em que o fluxo as percorre (a partir do Início, seguindo as ligações); as soltas vão ao final, por posição. */
export function ordenarEtapas(fluxo: DadosFluxo): NoFluxo[] {
  const porId = new Map(fluxo.nodes.map((n) => [n.id, n]));
  const saidas = new Map<string, string[]>();
  for (const e of fluxo.edges) saidas.set(e.source, [...(saidas.get(e.source) ?? []), e.target]);

  const visto = new Set<string>();
  const ordem: NoFluxo[] = [];
  const inicios = fluxo.nodes.filter((n) => n.data.tipo === "inicio").sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
  const fila = inicios.map((n) => n.id);
  while (fila.length > 0) {
    const id = fila.shift() as string;
    if (visto.has(id)) continue;
    const no = porId.get(id);
    if (!no) continue;
    visto.add(id);
    ordem.push(no);
    // Caminho "feliz" primeiro: ligações sem rótulo ou "Sim" antes das demais.
    const alvos = (saidas.get(id) ?? [])
      .map((t) => ({ t, e: fluxo.edges.find((e) => e.source === id && e.target === t) }))
      .sort((a, b) => peso(a.e?.label) - peso(b.e?.label))
      .map((x) => x.t);
    fila.unshift(...alvos.filter((t) => !visto.has(t)));
  }
  const soltas = fluxo.nodes.filter((n) => !visto.has(n.id)).sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
  return [...ordem, ...soltas];
}

const peso = (label?: string) => (!label ? 0 : /^sim$/i.test(label.trim()) ? 0 : /^n[ãa]o$/i.test(label.trim()) ? 2 : 1);

/** Etapas agrupadas por responsável (raias), na ordem em que cada responsável aparece pela primeira vez. */
export function agruparPorResponsavel(fluxo: DadosFluxo): { responsavel: string; etapas: NoFluxo[] }[] {
  const grupos = new Map<string, NoFluxo[]>();
  for (const n of ordenarEtapas(fluxo)) {
    // Início, decisões e fim não têm "executor": ficam numa raia própria e não contam como falta de responsável.
    const r = n.data.responsavel?.trim() || (n.data.tipo === "atividade" || n.data.tipo === "aprovacao" ? "Sem responsável definido" : "Marcos e decisões");
    grupos.set(r, [...(grupos.get(r) ?? []), n]);
  }
  return Array.from(grupos.entries()).map(([responsavel, etapas]) => ({ responsavel, etapas }));
}

/** Checagens do fluxo: erros impedem a publicação; avisos orientam. Rascunhos incompletos podem ser salvos sempre. */
export function pendenciasDoFluxo(fluxo: DadosFluxo): Pendencia[] {
  const p: Pendencia[] = [];
  if (fluxo.nodes.length === 0) {
    p.push({ nivel: "erro", texto: "O fluxo ainda não tem etapas." });
    return p;
  }
  const nome = (n: NoFluxo) => n.data.nome?.trim() || BLOCOS[n.data.tipo].rotulo;
  if (!fluxo.nodes.some((n) => n.data.tipo === "inicio")) p.push({ nivel: "erro", texto: "O fluxo precisa de um bloco de Início." });
  if (!fluxo.nodes.some((n) => n.data.tipo === "fim")) p.push({ nivel: "erro", texto: "O fluxo precisa de um bloco de Fim." });

  for (const n of fluxo.nodes) {
    const t = n.data.tipo;
    const saidas = fluxo.edges.filter((e) => e.source === n.id);
    const entradas = fluxo.edges.filter((e) => e.target === n.id);
    if ((t === "atividade" || t === "aprovacao") && !n.data.responsavel?.trim()) {
      p.push({ nivel: "erro", texto: `A etapa "${nome(n)}" está sem responsável.`, noId: n.id });
    }
    if (t === "aprovacao" && !n.data.criterio?.trim()) {
      p.push({ nivel: "erro", texto: `A aprovação "${nome(n)}" não diz quem aprova e o que é validado (critério).`, noId: n.id });
    }
    if (t === "decisao") {
      if (saidas.length < 2) p.push({ nivel: "erro", texto: `A decisão "${nome(n)}" precisa de pelo menos dois caminhos.`, noId: n.id });
      else if (saidas.some((e) => !e.label?.trim())) p.push({ nivel: "erro", texto: `Os caminhos da decisão "${nome(n)}" precisam de nome (ex.: Sim / Não).`, noId: n.id });
    }
    if (t !== "fim" && t !== "decisao" && saidas.length === 0) p.push({ nivel: "aviso", texto: `A etapa "${nome(n)}" não leva a nenhuma outra.`, noId: n.id });
    if (t !== "inicio" && entradas.length === 0) p.push({ nivel: "aviso", texto: `A etapa "${nome(n)}" não recebe nenhuma ligação.`, noId: n.id });
    if (!n.data.nome?.trim()) p.push({ nivel: "aviso", texto: "Há uma etapa sem nome.", noId: n.id });
  }
  return p;
}

/** Cadastro: o que falta para publicar o processo. */
export function pendenciasDoCadastro(processo: Pick<Processo, "objetivo" | "saidas" | "responsavel_id" | "macroprocesso_id" | "gatilho">): Pendencia[] {
  const p: Pendencia[] = [];
  if (!processo.objetivo?.trim()) p.push({ nivel: "erro", texto: "Falta o objetivo do processo." });
  if (!processo.saidas?.trim()) p.push({ nivel: "erro", texto: "Falta a entrega final (saídas esperadas)." });
  if (!processo.responsavel_id) p.push({ nivel: "erro", texto: "O processo precisa de um responsável (dono)." });
  if (!processo.macroprocesso_id) p.push({ nivel: "aviso", texto: "O processo não está em nenhum macroprocesso." });
  if (!processo.gatilho?.trim()) p.push({ nivel: "aviso", texto: "Falta dizer o que inicia o processo." });
  return p;
}

/** Etapas de atividade ainda sem procedimento descrito ou ligado. */
export function etapasSemProcedimento(fluxo: DadosFluxo): number {
  return fluxo.nodes.filter((n) => n.data.tipo === "atividade" && !n.data.procedimentos?.trim() && !n.data.instrucoes?.trim()).length;
}

/** Posiciona as etapas em camadas (de cima para baixo) seguindo as ligações. Não altera os dados, só as posições. */
export function organizarAutomaticamente(fluxo: DadosFluxo): DadosFluxo {
  const nivel = new Map<string, number>();
  const ordem = ordenarEtapas(fluxo);
  const entradasDe = (id: string) => fluxo.edges.filter((e) => e.target === id).map((e) => e.source);
  // Camada = maior caminho a partir do início, ignorando ligações de volta (retrabalho) para não criar ciclos.
  const idx = new Map(ordem.map((n, i) => [n.id, i]));
  for (const n of ordem) {
    const anteriores = entradasDe(n.id).filter((s) => (idx.get(s) ?? 0) < (idx.get(n.id) ?? 0));
    nivel.set(n.id, anteriores.length ? Math.max(...anteriores.map((s) => nivel.get(s) ?? 0)) + 1 : 0);
  }
  const porNivel = new Map<number, string[]>();
  for (const n of ordem) porNivel.set(nivel.get(n.id) ?? 0, [...(porNivel.get(nivel.get(n.id) ?? 0) ?? []), n.id]);
  const pos = new Map<string, { x: number; y: number }>();
  for (const [lvl, ids] of porNivel) {
    ids.forEach((id, i) => pos.set(id, { x: 260 * (i - (ids.length - 1) / 2) + 260, y: lvl * 130 }));
  }
  return { ...fluxo, nodes: fluxo.nodes.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position })) };
}
