"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { Textarea } from "@/components/ui/textarea";
import { textoDaColagem } from "@/lib/colagem-formatada";

/** Preserva a estrutura colada no mesmo campo usado para enviar o formulário. */
export const TextareaFormatada = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextareaFormatada(
  { onPaste, ...props }, ref
) {
  return <Textarea {...props} ref={ref} autoAjustar onPaste={(e) => {
    onPaste?.(e);
    if (e.defaultPrevented) return;
    const texto = textoDaColagem(e.clipboardData);
    if (texto === null) return;
    e.preventDefault();
    const campo = e.currentTarget;
    const espaco = campo.maxLength < 0 ? texto.length : Math.max(0, campo.maxLength - campo.value.length + campo.selectionEnd - campo.selectionStart);
    const inserir = texto.slice(0, espaco);
    // Usa a edição nativa para manter desfazer/refazer quando disponível.
    let inserido = false;
    try {
      inserido = typeof document.execCommand === "function" && document.execCommand("insertText", false, inserir);
    } catch {
      // Alguns navegadores desabilitam essa API mesmo quando ela existe.
    }
    if (!inserido) {
      campo.setRangeText(inserir, campo.selectionStart, campo.selectionEnd, "end");
      campo.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }} />;
});
