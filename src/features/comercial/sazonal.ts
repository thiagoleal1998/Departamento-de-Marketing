import "server-only";
import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push";
import {
  PERIODOS_SAZONAIS,
  chaveHotel,
  type CampoSazonal,
  type PeriodoSazonal,
} from "./sazonal-tipos";

const CAMPOS: CampoSazonal[] = ["status", "condicao", "vendas", "hospedagens", "observacao"];

interface LinhaLida {
  chave: string;
  hotel: string;
  ordem: number;
  status: string;
  condicao: string;
  vendas: string;
  hospedagens: string;
  observacao: string;
}

const limpa = (v: unknown) => String(v ?? "").replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
const semAcento = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");

async function baixar(p: PeriodoSazonal): Promise<Buffer> {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${p.planilhaId}/export?format=xlsx`, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Não foi possível ler a planilha de ${p.nome} (HTTP ${res.status}). Ela precisa estar compartilhada por link.`);
  return Buffer.from(await res.arrayBuffer());
}

/** Lê a primeira aba: acha a linha de cabeçalho (HOTEL, STATUS, CONDIÇÃO…) e devolve um hotel por linha. */
export function lerHoteis(arquivo: Buffer): LinhaLida[] {
  const wb = XLSX.read(arquivo, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const linhas = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  const cab = linhas.findIndex((r) => r.some((c) => semAcento(String(c)) === "hotel"));
  if (cab < 0) throw new Error('Cabeçalho "HOTEL" não encontrado na planilha do período.');
  const col: Record<string, number> = {};
  linhas[cab].forEach((c, i) => {
    const k = semAcento(String(c));
    if (k && !(k in col)) col[k] = i;
  });
  const pega = (r: unknown[], k: string) => (k in col ? limpa(r[col[k]]) : "");

  const vistos = new Set<string>();
  const out: LinhaLida[] = [];
  for (const r of linhas.slice(cab + 1)) {
    const hotel = pega(r, "hotel");
    if (!hotel) continue;
    const chave = chaveHotel(hotel);
    if (!chave || vistos.has(chave)) continue;
    vistos.add(chave);
    out.push({
      chave,
      hotel,
      ordem: out.length,
      status: pega(r, "status"),
      condicao: pega(r, "condicao"),
      vendas: pega(r, "vendas"),
      hospedagens: pega(r, "hospedagens"),
      observacao: pega(r, "observacao"),
    });
  }
  return out;
}

const hashDe = (l: LinhaLida) => createHash("sha1").update(JSON.stringify([l.hotel, ...CAMPOS.map((c) => l[c])])).digest("hex");

interface Existente {
  chave: string;
  hotel: string;
  ordem: number;
  hash: string;
  status: string;
  condicao: string;
  vendas: string;
  hospedagens: string;
  observacao: string;
}

async function avisarEquipe(admin: ReturnType<typeof criarClienteAdmin>, p: PeriodoSazonal, hoteis: string[]) {
  const { data } = await admin.from("profiles").select("id").eq("ativo", true);
  const ids = ((data as { id: string }[] | null) ?? []).map((x) => x.id);
  if (ids.length === 0 || hoteis.length === 0) return;
  const titulo = hoteis.length === 1 ? `${p.nome}: ${hoteis[0]} atualizado` : `${p.nome}: ${hoteis.length} hotéis atualizados`;
  const corpo = hoteis.slice(0, 5).join(", ") + (hoteis.length > 5 ? ` e mais ${hoteis.length - 5}` : "");
  const link = "/comercial?aba=" + encodeURIComponent("Períodos sazonais");
  await admin.from("notificacoes").insert(ids.map((destinatario_id) => ({ destinatario_id, tipo: "comercial", titulo, link })));
  await enviarPush(ids, { titulo, corpo, url: link });
}

export interface ResultadoSazonal {
  periodo: string;
  hoteis: number;
  alterados: number;
}

/** Lê a planilha do período, compara com o que estava gravado e atualiza só o que mudou (avisando a equipe). */
export async function sincronizarPeriodo(p: PeriodoSazonal, origem: string): Promise<ResultadoSazonal> {
  const admin = criarClienteAdmin();
  try {
    const hoteis = lerHoteis(await baixar(p));
    if (hoteis.length === 0) throw new Error(`Nenhum hotel encontrado na planilha de ${p.nome}.`);

    const { data, error: errLer } = await admin
      .from("comercial_sazonal")
      .select("chave, hotel, ordem, hash, status, condicao, vendas, hospedagens, observacao")
      .eq("periodo", p.id);
    if (errLer) throw new Error(errLer.message);
    const existentes = (data as Existente[] | null) ?? [];
    const primeiraCarga = existentes.length === 0;
    const antigos = new Map(existentes.map((e) => [e.chave, e]));

    const agora = new Date().toISOString();
    const gravar: Record<string, unknown>[] = [];
    const mudados: string[] = [];
    for (const l of hoteis) {
      const hash = hashDe(l);
      const ant = antigos.get(l.chave);
      if (ant && ant.hash === hash) {
        if (ant.ordem !== l.ordem) await admin.from("comercial_sazonal").update({ ordem: l.ordem }).eq("periodo", p.id).eq("chave", l.chave);
        continue;
      }
      const base = { periodo: p.id, chave: l.chave, hotel: l.hotel, ordem: l.ordem, status: l.status, condicao: l.condicao, vendas: l.vendas, hospedagens: l.hospedagens, observacao: l.observacao, hash, atualizado_em: agora };
      if (primeiraCarga) {
        gravar.push({ ...base, anterior: null, alterado_em: null });
      } else if (!ant) {
        gravar.push({ ...base, anterior: null, alterado_em: agora });
        mudados.push(l.hotel);
      } else {
        const anterior: Record<string, string> = {};
        for (const c of CAMPOS) if (ant[c] !== l[c]) anterior[c] = ant[c];
        gravar.push({ ...base, anterior, alterado_em: Object.keys(anterior).length > 0 || ant.hotel !== l.hotel ? agora : null });
        if (Object.keys(anterior).length > 0) mudados.push(l.hotel);
      }
    }
    for (let i = 0; i < gravar.length; i += 50) {
      const { error } = await admin.from("comercial_sazonal").upsert(gravar.slice(i, i + 50));
      if (error) throw new Error(error.message);
    }

    // Hotéis que saíram da planilha.
    const atuais = new Set(hoteis.map((h) => h.chave));
    const sumiram = existentes.filter((e) => !atuais.has(e.chave)).map((e) => e.chave);
    if (sumiram.length > 0) await admin.from("comercial_sazonal").delete().eq("periodo", p.id).in("chave", sumiram);

    if (mudados.length > 0) await avisarEquipe(admin, p, mudados);

    await admin.from("comercial_sazonal_sync").upsert({ periodo: p.id, sincronizado_em: agora, origem, total: hoteis.length, erro: null });
    return { periodo: p.id, hoteis: hoteis.length, alterados: mudados.length };
  } catch (e) {
    const erro = e instanceof Error ? e.message : "Falha na sincronização.";
    await admin.from("comercial_sazonal_sync").upsert({ periodo: p.id, origem, erro });
    throw e;
  }
}

/** Sincroniza todos os períodos; um com erro não impede os outros. */
export async function sincronizarSazonais(origem: string): Promise<{ resultados: ResultadoSazonal[]; erros: string[] }> {
  const resultados: ResultadoSazonal[] = [];
  const erros: string[] = [];
  for (const p of PERIODOS_SAZONAIS) {
    try {
      resultados.push(await sincronizarPeriodo(p, origem));
    } catch (e) {
      erros.push(e instanceof Error ? e.message : "Falha na sincronização.");
    }
  }
  return { resultados, erros };
}
