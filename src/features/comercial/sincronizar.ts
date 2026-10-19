import "server-only";
import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import {
  PLANILHA_ID,
  type CelulaComercial,
  type DadosAbaComercial,
} from "./tipos";

const EXPORTACAO = `https://docs.google.com/spreadsheets/d/${PLANILHA_ID}/export?format=xlsx`;

async function baixarPlanilha(): Promise<Buffer> {
  const res = await fetch(EXPORTACAO, { cache: "no-store", redirect: "follow" });
  if (!res.ok) {
    throw new Error(
      `Não foi possível ler a planilha (HTTP ${res.status}). Ela precisa estar compartilhada por link.`
    );
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Converte uma aba do Excel em células esparsas (texto + cor de fundo). */
function lerAba(ws: XLSX.WorkSheet): DadosAbaComercial {
  const celulas: CelulaComercial[] = [];
  let maxR = 0;
  let maxC = 0;
  let cabecalho: number | null = null;

  for (const chave of Object.keys(ws)) {
    if (chave[0] === "!") continue;
    const cel = ws[chave] as XLSX.CellObject & {
      w?: string;
      s?: { patternType?: string; fgColor?: { rgb?: string } };
    };
    const { r, c } = XLSX.utils.decode_cell(chave);
    const texto = (cel.w ?? (cel.v === undefined || cel.v === null ? "" : String(cel.v)))
      .replace(/\r/g, "")
      .trim();
    const rgb =
      cel.s?.patternType === "solid" ? cel.s.fgColor?.rgb?.toUpperCase() : undefined;
    const bg = rgb && rgb !== "FFFFFF" && /^[0-9A-F]{6}$/.test(rgb) ? `#${rgb}` : undefined;
    if (!texto && !bg) continue;

    const item: CelulaComercial = { r, c };
    if (texto) item.v = texto;
    if (bg) item.bg = bg;
    celulas.push(item);
    if (texto || bg) {
      maxR = Math.max(maxR, r);
      maxC = Math.max(maxC, c);
    }
    if (cabecalho === null && /^hot[eé]is$/i.test(texto)) cabecalho = r;
  }

  celulas.sort((a, b) => a.r - b.r || a.c - b.c);

  const mesclagens = ((ws["!merges"] ?? []) as XLSX.Range[])
    .map((m) => ({ r1: m.s.r, c1: m.s.c, r2: m.e.r, c2: m.e.c }))
    .filter((m) => m.r1 <= maxR && m.c1 <= maxC)
    .map((m) => ({ ...m, r2: Math.min(m.r2, maxR), c2: Math.min(m.c2, maxC) }));

  const colunas = maxC + 1;
  const cols = (ws["!cols"] ?? []) as { wpx?: number; wch?: number }[];
  const larguras = Array.from({ length: colunas }, (_, i) => {
    const w = cols[i]?.wpx ?? (cols[i]?.wch ? cols[i].wch! * 7 : 100);
    return Math.max(24, Math.min(420, Math.round(w)));
  });

  return { linhas: maxR + 1, colunas, celulas, mesclagens, larguras, cabecalho };
}

export interface ResultadoSync {
  abas: number;
  alteradas: number;
}

/** Baixa a planilha e atualiza apenas as abas que mudaram. */
export async function sincronizarComercial(origem: string): Promise<ResultadoSync> {
  const admin = criarClienteAdmin();
  try {
    const wb = XLSX.read(await baixarPlanilha(), { type: "buffer", cellStyles: true });

    const { data: existentes } = await admin.from("comercial_abas").select("nome, hash");
    const hashAtual = new Map(
      ((existentes as { nome: string; hash: string }[] | null) ?? []).map((a) => [a.nome, a.hash])
    );

    let alteradas = 0;
    const nomes: string[] = [];
    for (const [ordem, nome] of wb.SheetNames.entries()) {
      nomes.push(nome);
      const dados = lerAba(wb.Sheets[nome]);
      const hash = createHash("sha1").update(JSON.stringify(dados)).digest("hex");
      if (hashAtual.get(nome) === hash) continue;
      const { error } = await admin.from("comercial_abas").upsert({
        nome,
        ordem,
        dados,
        hash,
        atualizado_em: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      alteradas++;
    }

    // Remove abas que não existem mais na planilha.
    const sumiram = [...hashAtual.keys()].filter((n) => !nomes.includes(n));
    if (sumiram.length > 0) {
      await admin.from("comercial_abas").delete().in("nome", sumiram);
      alteradas += sumiram.length;
    }

    await admin.from("comercial_sync").upsert({
      id: 1,
      sincronizado_em: new Date().toISOString(),
      origem,
      abas: nomes.length,
      alteradas,
      erro: null,
    });
    return { abas: nomes.length, alteradas };
  } catch (e) {
    const erro = e instanceof Error ? e.message : "Falha na sincronização.";
    // Mantém o horário da última sincronização bem-sucedida.
    await admin.from("comercial_sync").upsert({ id: 1, origem, erro });
    throw e;
  }
}
