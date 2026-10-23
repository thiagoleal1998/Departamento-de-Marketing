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

const PROMPT = (itens: string[]) =>
  `Você ajuda uma operadora de turismo. Abaixo há ofertas numeradas. Para CADA oferta, liste os LUGARES onde o turista ficará ou que visitará ` +
  `(cidades, ilhas ou regiões — nunca nomes de hotel, resort, fornecedor, companhia ou o nome comercial do roteiro). ` +
  `Se for um hotel ou resort, informe a cidade e o estado/país onde ele fica. Circuitos: uma entrada por cidade principal. ` +
  `No máximo 4 lugares por oferta, do mais importante ao menos.\n` +
  `Responda somente JSON, neste formato: [{"n":1,"lugares":[{"lugar":"...","regiao":"estado ou país"}]}]\n\n` +
  itens.map((t, i) => `OFERTA ${i + 1}:\n${t}`).join("\n\n");

/** Modelos em ordem: o "lite" é o mais leve e barato (tem cota própria); se falhar, tenta os outros. */
const MODELOS = ["gemini-flash-lite-latest", MODELO_IA, "gemini-flash-latest"];

type RespostaIA = { n?: number; lugares?: { lugar?: string; regiao?: string }[] }[];

/** Pergunta à IA (com novas tentativas: o plano gratuito às vezes responde "alta demanda"). */
async function perguntarIA(itens: string[], prazoFinal: number): Promise<Lugar[][]> {
  const ia = obterClienteIA();
  if (!ia) throw new Error("IA indisponível");
  let ultimo: unknown;
  for (let t = 0; t < 2; t++) {
    for (const modelo of MODELOS) {
      if (Date.now() > prazoFinal) break;
      try {
        const r = await ia.models.generateContent({
          model: modelo,
          contents: PROMPT(itens),
          config: { responseMimeType: "application/json", temperature: 0 },
        });
        const lista = JSON.parse(r.text ?? "[]") as RespostaIA;
        const saida: Lugar[][] = itens.map(() => []);
        for (const item of lista) {
          const i = (item.n ?? 0) - 1;
          if (i < 0 || i >= itens.length) continue;
          saida[i] = (item.lugares ?? [])
            .filter((l) => l.lugar && l.lugar.trim().length >= 3)
            .slice(0, 4)
            .map((l) => ({ lugar: l.lugar!.trim(), regiao: (l.regiao ?? "").trim() }));
        }
        return saida;
      } catch (e) {
        ultimo = e; // alta demanda ou cota deste modelo: tenta o próximo
      }
    }
    await new Promise((ok) => setTimeout(ok, 2000));
  }
  throw ultimo instanceof Error ? ultimo : new Error("falha na IA");
}

/** Lugares de várias ofertas numa chamada só; o resultado de cada conjunto de textos fica guardado 7 dias (falha não fica). */
async function lugaresDosTextos(itens: string[], prazoFinal: number): Promise<Lugar[][] | null> {
  const chave = createHash("sha1").update(itens.join("\u0001")).digest("hex").slice(0, 24);
  try {
    return await unstable_cache(() => perguntarIA(itens, prazoFinal), ["lugares-do-dia", chave], { revalidate: 7 * 24 * 3600 })();
  } catch {
    return null;
  }
}

const recorte = (partes: (string | null)[]) => partes.filter(Boolean).join("\n").slice(0, 900);

export interface DestinosDoDia {
  destinos: DestinoMonitorado[];
  /** A IA não pôde ler alguma oferta agora: a lista pode estar incompleta. */
  pendente: boolean;
}

/**
 * Destinos de um dia, para a busca de notícias. A IA lê as ofertas do dia (nacional: um produto por vez;
 * internacional: cada linha) e diz o lugar real. A mesma regra vale para hoje e para qualquer dia da semana.
 * Se a IA estiver indisponível, só entram lugares confiáveis (cidade da landing page); nunca títulos soltos.
 */
export async function destinosDoDia(ofertas: Oferta[], lps: LpLocal[], prazoFinal: number): Promise<DestinosDoDia> {
  const textos: { tipo: DestinoMonitorado["tipo"]; texto: string }[] = [];
  for (const o of ofertas) {
    if (o.tipo === "nacional") {
      for (const b of blocosNacional(o).slice(0, 6)) {
        if (b.produto) textos.push({ tipo: "nacional", texto: recorte([b.produto, b.temporada, b.vantagem && b.vantagem.slice(0, 400)]) });
      }
    } else if (o.produto) {
      textos.push({ tipo: "internacional", texto: recorte([o.produto, o.vantagem]) });
    }
  }
  const unicos = Array.from(new Map(textos.map((t) => [t.texto, t])).values()).slice(0, 14);
  if (unicos.length === 0) return { destinos: [], pendente: false };

  const lugares = await lugaresDosTextos(
    unicos.map((u) => u.texto),
    prazoFinal
  );

  const mapa = new Map<string, DestinoMonitorado>();
  if (lugares) {
    unicos.forEach((u, i) => {
      for (const l of lugares[i] ?? []) {
        const k = l.lugar.toLowerCase();
        if (!mapa.has(k)) {
          mapa.set(k, { nome: l.regiao ? `${l.lugar} (${l.regiao})` : l.lugar, termo: l.lugar, busca: `${l.lugar} ${l.regiao}`.trim(), tipo: u.tipo });
        }
      }
    });
    return { destinos: Array.from(mapa.values()), pendente: false };
  }

  // IA indisponível agora: só o que é seguro (nacional com landing page cadastrada).
  for (const d of destinosDasOfertas(
    ofertas.filter((o) => o.tipo === "nacional"),
    lps,
    { soSeguro: true }
  )) {
    mapa.set(d.termo.toLowerCase(), d);
  }
  return { destinos: Array.from(mapa.values()), pendente: true };
}
