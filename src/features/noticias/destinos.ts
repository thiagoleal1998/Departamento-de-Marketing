import type { Oferta } from "@/features/divulgacao/tipos";
import { blocosNacional } from "@/features/divulgacao/tipos";
import { semAcento } from "./classificar";

export interface DestinoMonitorado {
  /** Nome para mostrar. */
  nome: string;
  /** Termo que precisa aparecer na notícia (evita resultado de outro lugar). */
  termo: string;
  /** Termo usado na busca. */
  busca: string;
  tipo: "nacional" | "internacional";
}

export interface LpLocal {
  nome: string;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
}

const limparLinha = (t: string | null) =>
  (t ?? "")
    .split("\n")
    .map((x) => x.trim())
    .find(Boolean)
    ?.replace(/\*.*$/, "")
    .replace(/Locais de refer[êe]ncia.*$/i, "")
    .replace(/Nome do Destino/i, "")
    .trim() ?? "";

/** Cidades/lugares citados depois de ":" (ex.: "Fly and Drive: Nashville, Memphis e New Orleans"). */
function lugaresDoTitulo(linha: string): string[] {
  const depois = linha.includes(":") ? linha.split(":").slice(1).join(":") : linha;
  const partes = depois
    .split(/,| e |\/| - | – /i)
    .map((p) => p.replace(/\(.*?\)/g, "").replace(/\.$/, "").trim())
    .filter((p) => p.length >= 3 && p.split(" ").length <= 4);
  return partes.slice(0, 3);
}

const compacto = (t: string) => semAcento(t).replace(/[^a-z0-9]/g, "");

/** Destinos das ofertas de hoje: cidade da landing page (nacional) ou o destino citado (internacional). */
export function destinosDasOfertas(ofertas: Oferta[], lps: LpLocal[], opcoes: { soSeguro?: boolean } = {}): DestinoMonitorado[] {
  const mapa = new Map<string, DestinoMonitorado>();
  const adicionar = (d: DestinoMonitorado) => {
    const k = semAcento(d.termo);
    if (k.length >= 3 && !mapa.has(k)) mapa.set(k, d);
  };

  for (const o of ofertas) {
    if (o.tipo === "nacional") {
      for (const b of blocosNacional(o)) {
        const prod = limparLinha(b.produto);
        if (!prod) continue;
        const p = compacto(prod);
        const lp = lps.find((l) => compacto(l.nome) === p) ?? lps.find((l) => compacto(l.nome).includes(p) || p.includes(compacto(l.nome)));
        if (lp?.cidade) {
          adicionar({ nome: `${lp.cidade}${lp.estado ? ` (${lp.estado})` : ""}`, termo: lp.cidade, busca: `${lp.cidade} ${lp.estado ?? ""}`.trim(), tipo: "nacional" });
        } else if (!opcoes.soSeguro) {
          const curto = prod.split(" ").slice(0, 2).join(" ");
          adicionar({ nome: prod, termo: curto, busca: curto, tipo: "nacional" });
        }
      }
    } else if (!opcoes.soSeguro) {
      const linha = limparLinha(o.produto);
      if (!linha) continue;
      const lugares = linha.length > 28 || linha.includes(":") ? lugaresDoTitulo(linha) : [linha];
      for (const l of lugares) adicionar({ nome: l, termo: l, busca: l, tipo: "internacional" });
      // O descritivo costuma listar as paradas: "02 noites em Lisboa".
      for (const m of (o.vantagem ?? "").matchAll(/noites?\s+(?:em|no|na)\s+([^\n,.(]{3,40})/gi)) {
        const l = m[1].trim();
        adicionar({ nome: l, termo: l, busca: l, tipo: "internacional" });
      }
    }
  }
  return Array.from(mapa.values());
}
