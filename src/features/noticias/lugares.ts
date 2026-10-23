import "server-only";
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { MODELO_IA, obterClienteIA } from "@/lib/ai/gemini";
import { blocosNacional, type Oferta } from "@/features/divulgacao/tipos";
import type { DestinoMonitorado, LpLocal } from "./destinos";
import { destinosDasOfertas } from "./destinos";

export interface Lugar {
  lugar: string;
  regiao: string;
}

const PROMPT = (texto: string) =>
  `Você ajuda uma operadora de turismo. Leia esta oferta e liste os LUGARES onde o turista ficará ou que visitará ` +
  `(cidades, ilhas ou regiões — nunca nomes de hotel, resort, fornecedor ou companhia). ` +
  `Se for um hotel ou resort, informe a cidade e o estado/país onde ele fica. No máximo 4 lugares, do mais importante ao menos.\n` +
  `Responda somente JSON: [{"lugar":"...","regiao":"estado ou país"}]\n\nOFERTA:\n${texto}`;

async function perguntarIA(texto: string): Promise<Lugar[]> {
  const ia = obterClienteIA();
  if (!ia) throw new Error("IA indisponível");
  let ultimo: unknown;
  // O modelo gratuito às vezes responde "alta demanda": tenta de novo antes de desistir.
  for (let t = 0; t < 3; t++) {
    try {
      const r = await ia.models.generateContent({
        model: MODELO_IA,
        contents: PROMPT(texto),
        config: { responseMimeType: "application/json", temperature: 0 },
      });
      const lista = JSON.parse(r.text ?? "[]") as { lugar?: string; regiao?: string }[];
      return lista
        .filter((l) => l.lugar && l.lugar.trim().length >= 3)
        .slice(0, 4)
        .map((l) => ({ lugar: l.lugar!.trim(), regiao: (l.regiao ?? "").trim() }));
    } catch (e) {
      ultimo = e;
      await new Promise((ok) => setTimeout(ok, 1500 * (t + 1)));
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error("falha na IA");
}

/** Lugares de uma oferta (cada texto é interpretado uma vez e guardado por 7 dias; falha não fica guardada). */
async function lugaresDoTexto(texto: string): Promise<Lugar[] | null> {
  const chave = createHash("sha1").update(texto).digest("hex").slice(0, 24);
  try {
    return await unstable_cache(() => perguntarIA(texto), ["lugares-oferta", chave], { revalidate: 7 * 24 * 3600 })();
  } catch {
    return null; // sem IA agora: o chamador usa o método simples
  }
}

/** Recorta o texto da oferta que interessa para descobrir o lugar. */
const resumoDaOferta = (partes: (string | null)[]) => partes.filter(Boolean).join("\n").slice(0, 2000);

/**
 * Destinos das ofertas de hoje para a busca de notícias. A IA lê cada oferta (nacional: um produto por vez;
 * internacional: cada linha) e diz o lugar real (cidade/região e estado/país). Sem IA, cai no método simples.
 */
export async function destinosDeHoje(ofertas: Oferta[], lps: LpLocal[], opcoes: { usarIA?: boolean } = {}): Promise<DestinoMonitorado[]> {
  const usarIA = opcoes.usarIA !== false;
  const textos: { tipo: DestinoMonitorado["tipo"]; texto: string }[] = [];
  for (const o of ofertas) {
    if (o.tipo === "nacional") {
      for (const b of blocosNacional(o).slice(0, 5)) {
        if (b.produto) textos.push({ tipo: "nacional", texto: resumoDaOferta([b.produto, b.temporada, b.vantagem && b.vantagem.slice(0, 500)]) });
      }
    } else if (o.produto) {
      textos.push({ tipo: "internacional", texto: resumoDaOferta([o.produto, o.vantagem]) });
    }
  }
  const unicos = Array.from(new Map(textos.map((t) => [t.texto, t])).values()).slice(0, 8);

  // Poucas consultas ao mesmo tempo: o plano gratuito da IA limita as chamadas por minuto.
  const resolvidos: { t: (typeof unicos)[number]; lugares: Lugar[] | null }[] = [];
  for (let i = 0; i < unicos.length; i += 3) {
    const lote = unicos.slice(i, i + 3);
    resolvidos.push(...(await Promise.all(lote.map(async (t) => ({ t, lugares: usarIA ? await lugaresDoTexto(t.texto) : null })))));
  }

  const mapa = new Map<string, DestinoMonitorado>();
  for (const { t, lugares } of resolvidos) {
    if (!lugares || lugares.length === 0) continue;
    for (const l of lugares) {
      const k = l.lugar.toLowerCase();
      if (!mapa.has(k)) {
        mapa.set(k, {
          nome: l.regiao ? `${l.lugar} (${l.regiao})` : l.lugar,
          termo: l.lugar,
          busca: `${l.lugar} ${l.regiao}`.trim(),
          tipo: t.tipo,
        });
      }
    }
  }
  // Se a IA ficou indisponível para alguma oferta, completa com o método simples (nome do produto, landing page, "noites em …").
  if (resolvidos.some((r) => r.lugares === null)) {
    for (const d of destinosDasOfertas(ofertas, lps)) {
      const k = d.termo.toLowerCase();
      if (!mapa.has(k)) mapa.set(k, d);
    }
  }
  return Array.from(mapa.values());
}
