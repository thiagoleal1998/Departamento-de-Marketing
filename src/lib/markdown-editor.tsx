import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type TurndownService from "turndown";
import { criarConversor } from "./colagem-formatada";

type No = { type: string; value?: string; children?: No[] };

/** No editor, cada quebra de linha simples continua sendo uma quebra (o Markdown as juntaria). */
function quebrasDeLinha() {
  const andar = (no: No) => {
    if (!no.children) return;
    no.children = no.children.flatMap((f) => {
      if (f.type !== "text" || !f.value?.includes("\n")) {
        andar(f);
        return [f];
      }
      return f.value.split("\n").flatMap((v, i) => (i ? [{ type: "break" }, { type: "text", value: v }] : [{ type: "text", value: v }]));
    });
  };
  return andar;
}

/** Markdown guardado → HTML seguro para o editor (sem HTML bruto nem imagens). */
export function markdownParaHtml(texto: string): string {
  return renderToStaticMarkup(
    <Markdown remarkPlugins={[remarkGfm, quebrasDeLinha]} skipHtml components={{ img: () => null }}>
      {texto}
    </Markdown>
  ).replace(/<br\/>\n/g, "<br/>");
}

let conversor: TurndownService | null = null;

/** Conteúdo do editor → Markdown, que é o que fica gravado. */
export function htmlParaMarkdown(html: string): string {
  if (!conversor) {
    conversor = criarConversor();
    // Sem barras invertidas no meio do texto (quebrariam links e apareceriam nos resumos).
    conversor.escape = (s) => s.replace(/</g, "\\<");
  }
  return conversor
    .turndown(html)
    .replace(/^(\s*(?:-|\d+\.)) {2,}/gm, "$1 ")
    .replace(/ {2}\n/g, "\n")
    .replace(/\[(https?:\/\/[^\]\s]+)\]\(\1\)/g, "$1") // endereço solto continua solto
    .trim();
}
