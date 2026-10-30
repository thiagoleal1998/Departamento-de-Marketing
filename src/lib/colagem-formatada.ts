import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { tabelasDoTexto } from "./texto-formatado";

let conversor: TurndownService | null = null;
function obterConversor(): TurndownService {
  if (conversor) return conversor;
  const c = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", strongDelimiter: "**" });
  c.use(gfm);
  c.remove((node) => ["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG", "IMG", "META", "LINK"].includes(node.nodeName));
  c.addRule("estilosTexto", {
    filter: (node) => node.nodeName === "SPAN" && (/^(bold|[6-9]00)$/i.test(node.style.fontWeight) || node.style.fontStyle === "italic"),
    replacement: (conteudo, node) => {
      let texto = conteudo.trim();
      if (!texto) return "";
      if (/^(bold|[6-9]00)$/i.test(node.style.fontWeight)) texto = `**${texto}**`;
      if (node.style.fontStyle === "italic") texto = `_${texto}_`;
      return (conteudo.match(/^\s*/)?.[0] ?? "") + texto + (conteudo.match(/\s*$/)?.[0] ?? "");
    },
  });
  c.addRule("tabelas", {
    filter: "table",
    replacement: (_conteudo, node) => {
      const rows = Array.from((node as HTMLTableElement).rows);
      const celulas = rows.map((r) => Array.from(r.cells).map((cell) => c.turndown(cell.innerHTML).replace(/\n+/g, " ").replace(/\|/g, "\\|")));
      const n = Math.max(0, ...celulas.map((r) => r.length));
      if (!n) return "";
      const linha = (r: string[]) => "| " + Array.from({ length: n }, (_, i) => r[i] ?? "").join(" | ") + " |";
      const temCabecalho = Array.from(rows[0].cells).some((cell) => cell.nodeName === "TH");
      const cabecalho = temCabecalho ? celulas.shift()! : Array(n).fill("");
      return "\n\n" + [linha(cabecalho), linha(Array(n).fill("---")), ...celulas.map(linha)].join("\n") + "\n\n";
    },
  });
  conversor = c;
  return c;
}

/** Converte formatação semântica da colagem; nunca insere HTML no documento. */
export function textoDaColagem(dados: Pick<DataTransfer, "getData">): string | null {
  const html = dados.getData("text/html");
  const texto = dados.getData("text/plain");
  if (/<(?:strong|b|em|i|ul|ol|table|h[1-6]|blockquote|pre|s|del)\b|font-weight\s*:\s*(?:bold|[6-9]00)|font-style\s*:\s*italic/i.test(html)) {
    try {
      const convertido = obterConversor().turndown(html);
      if (convertido.trim()) return convertido;
    } catch {
      // HTML incompatível não impede a colagem de texto comum.
    }
  }
  if (!texto.includes("\t")) return null;
  const comTabelas = tabelasDoTexto(texto);
  return comTabelas !== texto ? comTabelas : null;
}
