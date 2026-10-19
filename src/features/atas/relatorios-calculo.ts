import {
  CATEGORIA_LABEL,
  MOTIVO_LABEL,
  inferirCategoria,
  itemAberto,
  type CategoriaDemanda,
  type ItemAta,
  type MotivoAlteracao,
  type Reuniao,
} from "./tipos";

const FUSO = "America/Sao_Paulo";
const DIA_MS = 86_400_000;

const diaBR = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: FUSO });
const diasEntre = (a: string, b: string) =>
  Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / DIA_MS);

export interface Frequencia {
  nome: string;
  presente: number;
  ausente: number;
  dispensado: number;
  /** % de presença sobre as reuniões em que era esperado (presente ÷ presente+ausente). */
  pct: number | null;
  /** Ausências por atestado, licença ou afastamento. */
  afastamento: number;
  motivosAusencia: [string, number][];
}

export interface ItemAdiado {
  titulo: string;
  responsavel: string;
  adiamentos: number;
  diasAdiados: number;
  reunioes: number;
  situacao: "aberto" | "concluido" | "cancelado";
}

export interface Relatorio {
  reunioes: number;
  frequencia: Frequencia[];
  demandas: {
    total: number;
    concluidas: number;
    canceladas: number;
    abertas: number;
    comAdiamento: number;
    adiamentos: number;
    mediaDiasAdiados: number;
    mediaReunioesAteConcluir: number | null;
  };
  maisAdiados: ItemAdiado[];
  adiamentosPorPessoa: [string, number][];
  porTipo: { tipo: string; total: number; adiamentos: number; concluidas: number }[];
  motivos: [string, number][];
  adiamentosSemMotivo: number;
}

/** Calcula frequência, alterações de demanda e motivos a partir das atas. */
export function calcularRelatorio(
  reunioes: Reuniao[],
  itens: ItemAta[],
  nomeDe: (it: ItemAta) => string
): Relatorio {
  const ordem = reunioes.slice().sort((a, b) => a.data.localeCompare(b.data));
  const dataDe = new Map(ordem.map((r) => [r.id, r.data]));

  // ---- Frequência ----
  const mapa = new Map<string, Frequencia>();
  const motivos = new Map<string, Map<string, number>>();
  for (const r of ordem) {
    if (r.estado !== "realizada") continue; // reunião em andamento ainda não conta
    for (const p of r.presencas) {
      const f =
        mapa.get(p.nome) ??
        { nome: p.nome, presente: 0, ausente: 0, dispensado: 0, pct: null, afastamento: 0, motivosAusencia: [] };
      const v = p.presenca.toLowerCase();
      if (v.startsWith("presente")) f.presente++;
      else if (v.startsWith("ausente") || v.startsWith("precisou")) {
        f.ausente++;
        if (/atestado|afastad|licen[cç]a/i.test(p.obs)) f.afastamento++;
        const obs = p.obs.trim() || "Sem motivo informado";
        const m = motivos.get(p.nome) ?? new Map<string, number>();
        m.set(obs, (m.get(obs) ?? 0) + 1);
        motivos.set(p.nome, m);
      } else if (v.startsWith("dispensado")) f.dispensado++;
      mapa.set(p.nome, f);
    }
  }
  const frequencia = Array.from(mapa.values())
    .map((f) => ({
      ...f,
      pct: f.presente + f.ausente > 0 ? (f.presente / (f.presente + f.ausente)) * 100 : null,
      motivosAusencia: Array.from(motivos.get(f.nome)?.entries() ?? []).sort((a, b) => b[1] - a[1]),
    }))
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || a.nome.localeCompare(b.nome, "pt-BR"));

  // ---- Alterações de demanda (por assunto/série, só itens da ata) ----
  const series = new Map<string, ItemAta[]>();
  for (const it of itens) {
    if (it.secao !== "ata") continue;
    const l = series.get(it.serie) ?? [];
    l.push(it);
    series.set(it.serie, l);
  }

  let adiamentos = 0;
  let comAdiamento = 0;
  let somaDias = 0;
  let semMotivo = 0;
  let concluidas = 0;
  let canceladas = 0;
  let abertas = 0;
  const reunioesAteConcluir: number[] = [];
  const porPessoa = new Map<string, number>();
  const motivoCont = new Map<MotivoAlteracao, number>();
  const tipoCont = new Map<CategoriaDemanda, { total: number; adiamentos: number; concluidas: number }>();
  const lista: ItemAdiado[] = [];

  for (const ocorrencias of series.values()) {
    const seq = ocorrencias
      .slice()
      .sort((a, b) => (dataDe.get(a.reuniao_id) ?? "").localeCompare(dataDe.get(b.reuniao_id) ?? ""));
    const ultimo = seq[seq.length - 1];
    const situacao = ultimo.status === "concluido" ? "concluido" : ultimo.status === "cancelado" ? "cancelado" : "aberto";
    if (situacao === "concluido") concluidas++;
    else if (situacao === "cancelado") canceladas++;
    else abertas++;

    const idxConcl = seq.findIndex((o) => o.status === "concluido");
    if (idxConcl >= 0) reunioesAteConcluir.push(idxConcl + 1);

    let adSerie = 0;
    let diasSerie = 0;
    for (let i = 1; i < seq.length; i++) {
      const ant = seq[i - 1];
      const atual = seq[i];
      if (!ant.prazo || !atual.prazo) continue;
      const dif = diasEntre(diaBR(ant.prazo), diaBR(atual.prazo));
      if (dif > 0) {
        adSerie++;
        diasSerie += dif;
        if (!atual.motivo) semMotivo++;
      }
    }
    for (const o of seq) if (o.motivo) motivoCont.set(o.motivo, (motivoCont.get(o.motivo) ?? 0) + 1);

    adiamentos += adSerie;
    somaDias += diasSerie;
    if (adSerie > 0) comAdiamento++;

    const resp = nomeDe(ultimo);
    if (adSerie > 0) porPessoa.set(resp, (porPessoa.get(resp) ?? 0) + adSerie);

    const tipo = ultimo.categoria ?? inferirCategoria(ultimo.titulo);
    const t = tipoCont.get(tipo) ?? { total: 0, adiamentos: 0, concluidas: 0 };
    t.total++;
    t.adiamentos += adSerie;
    if (situacao === "concluido") t.concluidas++;
    tipoCont.set(tipo, t);

    if (adSerie > 0 || seq.length >= 4) {
      lista.push({
        titulo: ultimo.titulo,
        responsavel: resp,
        adiamentos: adSerie,
        diasAdiados: diasSerie,
        reunioes: seq.length,
        situacao,
      });
    }
  }

  const media = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : null);

  return {
    reunioes: ordem.filter((r) => r.estado === "realizada").length,
    frequencia,
    demandas: {
      total: series.size,
      concluidas,
      canceladas,
      abertas,
      comAdiamento,
      adiamentos,
      mediaDiasAdiados: adiamentos > 0 ? somaDias / adiamentos : 0,
      mediaReunioesAteConcluir: media(reunioesAteConcluir),
    },
    maisAdiados: lista
      .sort((a, b) => b.adiamentos - a.adiamentos || b.diasAdiados - a.diasAdiados || b.reunioes - a.reunioes)
      .slice(0, 12),
    adiamentosPorPessoa: Array.from(porPessoa.entries()).sort((a, b) => b[1] - a[1]),
    porTipo: Array.from(tipoCont.entries())
      .map(([k, v]) => ({ tipo: CATEGORIA_LABEL[k], ...v }))
      .sort((a, b) => b.total - a.total),
    motivos: Array.from(motivoCont.entries())
      .map(([k, v]) => [MOTIVO_LABEL[k], v] as [string, number])
      .sort((a, b) => b[1] - a[1]),
    adiamentosSemMotivo: semMotivo,
  };
}

export { itemAberto };
