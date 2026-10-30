"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ajustarAlturaTextarea } from "./textarea-altura";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  autoAjustar?: boolean;
};

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(({ className, autoAjustar = false, onInput, value, defaultValue, rows, ...props }, ref) => {
  const campoRef = React.useRef<HTMLTextAreaElement | null>(null);
  const juntarRef = React.useCallback((campo: HTMLTextAreaElement | null) => {
    campoRef.current = campo;
    if (typeof ref === "function") ref(campo);
    else if (ref) ref.current = campo;
  }, [ref]);

  React.useLayoutEffect(() => {
    const campo = campoRef.current;
    if (!autoAjustar || !campo) return;
    ajustarAlturaTextarea(campo);
  }, [autoAjustar, value, defaultValue, rows]);

  React.useLayoutEffect(() => {
    const campo = campoRef.current;
    if (!autoAjustar || !campo) return;
    // A largura muda ao redimensionar a janela ou revelar uma etapa do roteiro.
    let largura = campo.clientWidth;
    const observer = new ResizeObserver(() => {
      const novaLargura = campo.clientWidth;
      if (novaLargura !== largura) {
        largura = novaLargura;
        ajustarAlturaTextarea(campo);
      }
    });
    observer.observe(campo);
    return () => observer.disconnect();
  }, [autoAjustar]);

  return (
    <textarea
      className={cn(
        "flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        autoAjustar && "resize-none overflow-y-hidden",
        className
      )}
      ref={juntarRef}
      value={value}
      defaultValue={defaultValue}
      rows={rows}
      onInput={(e) => {
        onInput?.(e);
        if (autoAjustar) ajustarAlturaTextarea(e.currentTarget);
      }}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
