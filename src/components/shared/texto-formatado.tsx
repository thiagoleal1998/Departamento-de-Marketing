import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { tabelasDoTexto } from "@/lib/texto-formatado";

/** Exibe formatação sem executar HTML colado nem carregar imagens externas. */
export function TextoFormatado({ texto }: { texto: string }) {
  return (
    <div className="min-w-0 space-y-2 text-sm text-foreground/90">
      <Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
        p: ({ children }) => <p className="whitespace-pre-wrap break-words">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children, start }) => <ol start={start} className="list-decimal space-y-1 pl-5">{children}</ol>,
        h1: ({ children }) => <h3 className="font-semibold text-foreground">{children}</h3>,
        h2: ({ children }) => <h3 className="font-semibold text-foreground">{children}</h3>,
        h3: ({ children }) => <h4 className="font-semibold text-foreground">{children}</h4>,
        table: ({ children }) => <div className="max-w-full overflow-x-auto"><table className="w-full border-collapse text-left">{children}</table></div>,
        th: ({ children }) => <th className="border bg-muted/50 px-3 py-2 align-top font-semibold">{children}</th>,
        td: ({ children }) => <td className="border px-3 py-2 align-top">{children}</td>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{children}</a>,
        img: () => null,
      }}>{tabelasDoTexto(texto)}</Markdown>
    </div>
  );
}
