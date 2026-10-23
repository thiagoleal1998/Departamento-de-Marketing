import * as XLSX from "xlsx";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/** Planilha de divulgação diária (precisa continuar compartilhada por link para leitura). */
const PLANILHA_ID = "1UfErzCvSG9bbhYk-hYsW3O3KD_8XFwS31OpCFpru0Ng";
const URL_XLSX = `https://docs.google.com/spreadsheets/d/${PLANILHA_ID}/export?format=xlsx`;

const IGNORAR_ABAS = ["Condições", "Plan1", "Vila Galé", "stories inter"];
const CAMPOS = ["data", "tipo", "canal", "produto", "temporada", "vantagem", "aereo", "periodo_viagem", "oferta_dia", "conc_lv", "conc_concorrente", "conc_diferenca", "observacao"] as const;

export interface OfertaPlanilha {
  data: string;
  tipo: "nacional" | "internacional";
  canal: string | null;
  produto: string | null;
  temporada: string | null;
  vantagem: string | null;
  aereo: string | null;
  periodo_viagem: string | null;
  oferta_dia: string | null;
  conc_lv: number | null;
  conc_concorrente: number | null;
  conc_diferenca: number | null;
  observacao: string | null;
  aba_origem: string;
  linha_origem: number;
}

export interface ResultadoSincronizacao {
  naPlanilha: number;
  inseridas: number;
  atualizadas: number;
  removidas: number;
  preservadas: number;
}

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const limpo = (v: unknown): string | null => {
  const t = String(v ?? "").replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return t === "" || t === "-" ? null : t;
};
const eData = (v: unknown): v is Date => v instanceof Date && !isNaN(v.getTime()) && v.getUTCFullYear() >= 2020 && v.getUTCFullYear() <= 2030;
function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const t = String(v ?? "").replace(/R\$|\s/g, "");
  if (!t || t === "-" || t.startsWith("#")) return null;
  const n = Number(t.replace(/,/g, "")); // formato 1,234.56 da planilha
  return Number.isFinite(n) ? n : null;
}

/** Lê todas as abas semanais (nacional e internacional) e devolve uma linha por oferta. */
export function lerOfertas(wb: XLSX.WorkBook): OfertaPlanilha[] {
  const ofertas: OfertaPlanilha[] = [];

  for (const aba of wb.SheetNames) {
    if (IGNORAR_ABAS.includes(aba)) continue;
    const ws = wb.Sheets[aba];
    if (!ws || !ws["!ref"]) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "", blankrows: true });

    let h = -1;
    for (let i = 0; i < Math.min(rows.length, 8); i++) {
      if (rows[i].some((c) => norm(c) === "dia da semana")) {
        h = i;
        break;
      }
    }
    if (h < 0) continue;

    const cab = rows[h].map(norm);
    const iDia = cab.indexOf("dia da semana");
    const iData = iDia - 1;
    const idx = (...nomes: string[]) => {
      for (const n of nomes) {
        const i = cab.findIndex((c) => c === n);
        if (i >= 0) return i;
      }
      return -1;
    };
    const iTipo = idx("tipo de divulgação", "tipo de divulgacao");
    const formatoInter = iTipo >= 0;
    const tipo: OfertaPlanilha["tipo"] = formatoInter || /inter/i.test(aba) ? "internacional" : "nacional";

    const iProduto = idx("produto", "produtos", "destinos");
    const iTemp = idx("temporada");
    const iVant = idx("vantagem", "composição", "descritivo", "componentes", "oferta", "c");
    const iAereo = idx("aéreo", "aereo");
    const iViagem = formatoInter ? -1 : cab.findIndex((c, i) => c === "data" && i > iDia);
    const iOferta = idx("oferta do dia");
    const iIncentivos = idx("incentivos");
    const iImagens = idx("sugestão de imagens", "imagem sugerida", "imagens inspiração", "referências");
    const iTipoPublico = formatoInter ? idx("tipo") : -1;

    let iLv = -1;
    if (formatoInter) {
      const sub = rows[h + 1] ?? [];
      iLv = sub.findIndex((c) => norm(c) === "lv");
      if (iLv < 0) {
        const iConc = cab.findIndex((c) => c === "concorrência" || c === "concorrencia");
        iLv = iConc >= 0 ? iConc : -1;
      }
    }

    let atual: string | null = null;
    let tipoAtual: string | null = null;
    const primeira = formatoInter ? h + 2 : h + 1;
    for (let r = primeira; r < rows.length; r++) {
      const linha = rows[r];
      const d = linha[iData];
      if (eData(d)) {
        atual = d.toISOString().slice(0, 10);
        tipoAtual = null;
      }
      if (!atual) continue;

      const get = (i: number) => (i >= 0 ? limpo(linha[i]) : null);
      const produto = get(iProduto);
      const temporada = get(iTemp);
      const vantagem = get(iVant);
      const aereo = get(iAereo);
      const periodo = get(iViagem);
      const oferta = get(iOferta);
      let canal = get(iTipo);
      if (canal) tipoAtual = canal;
      else if (formatoInter && !eData(d)) canal = tipoAtual;
      const obs: string[] = [];
      const inc = get(iIncentivos);
      if (inc) obs.push("Incentivos: " + inc);
      const img = get(iImagens);
      if (img) obs.push("Imagens: " + img);
      const pub = get(iTipoPublico);
      if (pub) obs.push("Público: " + pub);

      let lv: number | null = null;
      let book: number | null = null;
      let dif: number | null = null;
      if (formatoInter && iLv >= 0) {
        lv = num(linha[iLv]);
        book = num(linha[iLv + 1]);
        dif = num(linha[iLv + 2]);
        const extra = limpo(linha[iLv + 3]);
        if (extra && !extra.startsWith("#")) obs.push(extra);
      }

      const temConteudo = produto || temporada || vantagem || oferta || periodo || aereo || (formatoInter && canal && eData(d));
      if (!temConteudo) continue;
      ofertas.push({
        data: atual,
        tipo,
        canal: formatoInter ? canal : null,
        produto,
        temporada,
        vantagem,
        aereo,
        periodo_viagem: periodo,
        oferta_dia: oferta,
        conc_lv: lv,
        conc_concorrente: book,
        conc_diferenca: dif,
        observacao: obs.length ? obs.join("\n") : null,
        aba_origem: aba.trim(),
        linha_origem: r + 1,
      });
    }
  }
  return ofertas;
}

type Linha = Record<string, unknown> & { id: string; aba_origem: string; linha_origem: number; created_at: string; updated_at: string };

const assinatura = (r: Record<string, unknown>) =>
  JSON.stringify(
    CAMPOS.map((c) => {
      const v = r[c];
      if (v === undefined || v === null || v === "") return null;
      return c.startsWith("conc_") ? Number(v) : String(v).replace(/\r/g, "");
    })
  );

/**
 * Baixa a planilha e atualiza a Divulgação diária: insere o que é novo, atualiza o que mudou na planilha,
 * remove o que saiu dela e preserva o que alguém editou à mão no painel.
 */
export async function sincronizarDivulgacao(origem: "agendado" | "manual"): Promise<ResultadoSincronizacao> {
  const admin = criarClienteAdmin();

  const r = await fetch(URL_XLSX, { signal: AbortSignal.timeout(45_000), cache: "no-store" });
  if (!r.ok) throw new Error(`Não foi possível baixar a planilha (${r.status}). Ela continua compartilhada por link?`);
  const wb = XLSX.read(Buffer.from(await r.arrayBuffer()), { type: "buffer", cellDates: true });
  const novas = lerOfertas(wb);
  if (novas.length < 500) throw new Error("A planilha veio com poucas ofertas; a atualização foi cancelada por segurança.");

  const antigas: Linha[] = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await admin
      .from("divulgacao_ofertas")
      .select(`id, aba_origem, linha_origem, created_at, updated_at, ${CAMPOS.join(",")}`)
      .not("aba_origem", "is", null)
      .order("id")
      .range(i, i + 999);
    if (error) throw new Error(error.message);
    const lote = (data ?? []) as unknown as Linha[];
    antigas.push(...lote);
    if (lote.length < 1000) break;
  }

  const porChave = new Map(antigas.map((o) => [`${o.aba_origem}|${o.linha_origem}`, o]));
  const chavesNovas = new Set(novas.map((o) => `${o.aba_origem}|${o.linha_origem}`));
  const editada = (o: Linha) => new Date(o.updated_at).getTime() - new Date(o.created_at).getTime() > 5000;

  const inserir: OfertaPlanilha[] = [];
  let atualizadas = 0;
  let preservadas = 0;
  for (const n of novas) {
    const a = porChave.get(`${n.aba_origem}|${n.linha_origem}`);
    if (!a) {
      inserir.push(n);
      continue;
    }
    if (editada(a)) {
      preservadas++;
      continue;
    }
    if (assinatura(a) === assinatura(n as unknown as Record<string, unknown>)) continue;
    const corpo: Record<string, unknown> = {};
    for (const c of CAMPOS) corpo[c] = (n as unknown as Record<string, unknown>)[c] ?? null;
    // updated_at = created_at: a linha continua "não editada à mão".
    const { error } = await admin.from("divulgacao_ofertas").update({ ...corpo, updated_at: a.created_at }).eq("id", a.id);
    if (!error) atualizadas++;
  }
  for (let i = 0; i < inserir.length; i += 250) {
    const { error } = await admin.from("divulgacao_ofertas").insert(inserir.slice(i, i + 250));
    if (error) throw new Error(error.message);
  }
  const sobrando = antigas.filter((a) => !chavesNovas.has(`${a.aba_origem}|${a.linha_origem}`) && !editada(a)).map((a) => a.id);
  for (let i = 0; i < sobrando.length; i += 200) {
    await admin.from("divulgacao_ofertas").delete().in("id", sobrando.slice(i, i + 200));
  }

  const resultado = { naPlanilha: novas.length, inseridas: inserir.length, atualizadas, removidas: sobrando.length, preservadas };
  // Registro da última atualização (complementar: some se a migration 0065 ainda não foi aplicada).
  await admin.from("divulgacao_sync").upsert({ id: 1, sincronizado_em: new Date().toISOString(), origem, ...resultado, erro: null });
  return resultado;
}
