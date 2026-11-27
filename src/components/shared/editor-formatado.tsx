"use client";

import { useEffect, useRef } from "react";
import { temFormatacao, textoDaColagem } from "@/lib/colagem-formatada";
import { htmlParaMarkdown, markdownParaHtml } from "@/lib/markdown-editor";
import { cn } from "@/lib/utils";

/**
 * Campo de texto que mostra a formatação (negrito, listas, títulos, links, tabelas) como foi copiada.
 * O valor gravado é Markdown; o HTML colado nunca entra direto no documento.
 */
export function EditorFormatado({
  id,
  rotulo,
  value,
  onChange,
  placeholder,
  className,
}: {
  id?: string;
  rotulo: string;
  value: string;
  onChange: (texto: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const campo = useRef<HTMLDivElement>(null);
  const emitido = useRef<string | null>(null);

  // Só redesenha quando o valor vem de fora; enquanto a pessoa digita, o cursor não pode pular.
  useEffect(() => {
    if (!campo.current || value === emitido.current) return;
    emitido.current = value;
    campo.current.innerHTML = markdownParaHtml(value);
  }, [value]);

  function emitir() {
    if (!campo.current) return;
    const texto = htmlParaMarkdown(campo.current.innerHTML);
    emitido.current = texto;
    onChange(texto);
  }

  function colar(e: React.ClipboardEvent<HTMLDivElement>) {
    const plano = e.clipboardData.getData("text/plain");
    e.preventDefault();
    if (!plano) return; // imagem pura: o formulário em volta decide o que fazer
    e.stopPropagation();
    const html = e.clipboardData.getData("text/html");
    const formatado = temFormatacao(html) ? htmlParaMarkdown(html) : textoDaColagem(e.clipboardData);
    if (formatado !== null) document.execCommand("insertHTML", false, markdownParaHtml(formatado));
    else document.execCommand("insertText", false, plano);
    emitir();
  }

  return (
    <div className="relative">
      <div
        id={id}
        ref={campo}
        role="textbox"
        aria-multiline="true"
        aria-label={rotulo}
        contentEditable
        suppressContentEditableWarning
        onInput={emitir}
        onPaste={colar}
        onDrop={(e) => e.preventDefault()}
        className={cn(
          "max-h-80 min-h-24 w-full overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25",
          "[&_a]:text-primary [&_a]:underline [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
          "[&_ol]:whitespace-normal [&_ul]:whitespace-normal [&_p+p]:mt-2 [&_p+ul]:mt-2 [&_ul+p]:mt-2 [&_table]:border-collapse [&_td]:border [&_td]:px-2 [&_th]:border [&_th]:px-2",
          className
        )}
      />
      {!value && placeholder ? <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">{placeholder}</span> : null}
    </div>
  );
}
