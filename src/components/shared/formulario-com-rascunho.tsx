"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface Rascunho {
  valores: Record<string, string>;
  quando: string;
  /** O formulário foi enviado: se a pessoa voltar depois, o rascunho já não vale. */
  enviado?: boolean;
}

const CHAVE = (c: string) => `rascunho:${c}`;
const TIPOS_TEXTO = ["text", "email", "tel", "url", "search", "textarea"];

function ler(chave: string): Rascunho | null {
  try {
    const raw = localStorage.getItem(CHAVE(chave));
    return raw ? (JSON.parse(raw) as Rascunho) : null;
  } catch {
    return null;
  }
}

/** Apaga o rascunho (use depois de o envio dar certo). */
export function limparRascunhoFormulario(chave: string) {
  try {
    localStorage.removeItem(CHAVE(chave));
  } catch {
    // sem acesso ao armazenamento
  }
}

/** O envio falhou: o rascunho volta a valer (não foi enviado de fato). */
export function reativarRascunhoFormulario(chave: string) {
  const r = ler(chave);
  if (!r?.enviado) return;
  try {
    localStorage.setItem(CHAVE(chave), JSON.stringify({ valores: r.valores, quando: r.quando }));
  } catch {
    // ignora
  }
}

/** Escreve num campo já renderizado de um jeito que o React perceba (campos controlados). */
function preencher(el: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, valor);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Formulário que guarda um rascunho do que a pessoa digita (campos de texto), no próprio navegador,
 * para não perder o texto se a página recarregar, a sessão cair ou ela sair sem querer.
 * Ao voltar, oferece restaurar ou descartar.
 */
export function FormularioComRascunho({
  chave,
  className,
  action,
  children,
}: {
  chave: string;
  className?: string;
  action: string | ((formData: FormData) => void | Promise<void>);
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [encontrado, setEncontrado] = useState<Rascunho | null>(null);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);

  // Ao abrir: há rascunho de uma vez anterior?
  useEffect(() => {
    const r = ler(chave);
    if (!r) return;
    if (r.enviado) {
      limparRascunhoFormulario(chave); // já foi enviado
      return;
    }
    if (Object.values(r.valores).some((v) => v.trim())) setEncontrado(r);
  }, [chave]);

  // Guarda enquanto digita (com pequena espera para não gravar a cada tecla).
  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function coletar(): Record<string, string> {
      const valores: Record<string, string> = {};
      for (const el of Array.from(form!.elements)) {
        if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) continue;
        if (!el.name || !TIPOS_TEXTO.includes(el.type) || !el.value.trim()) continue;
        valores[el.name] = el.value;
      }
      return valores;
    }

    function gravar() {
      const valores = coletar();
      try {
        if (Object.keys(valores).length === 0) {
          localStorage.removeItem(CHAVE(chave));
          setSalvoEm(null);
        } else {
          const quando = new Date().toISOString();
          localStorage.setItem(CHAVE(chave), JSON.stringify({ valores, quando } satisfies Rascunho));
          setSalvoEm(quando);
        }
      } catch {
        // sem acesso ao armazenamento: segue sem rascunho
      }
    }

    function aoDigitar() {
      clearTimeout(timer);
      timer = setTimeout(gravar, 500);
    }

    // Se o envio falhar e a pessoa continuar editando, o rascunho volta a valer.
    function aoEnviar() {
      clearTimeout(timer);
      gravar(); // garante que o que foi digitado por último está guardado
      const r = ler(chave);
      if (r) {
        try {
          localStorage.setItem(CHAVE(chave), JSON.stringify({ ...r, enviado: true }));
        } catch {
          // ignora
        }
      }
    }

    form.addEventListener("input", aoDigitar);
    form.addEventListener("submit", aoEnviar);
    return () => {
      clearTimeout(timer);
      form.removeEventListener("input", aoDigitar);
      form.removeEventListener("submit", aoEnviar);
    };
  }, [chave]);

  function restaurar() {
    const form = ref.current;
    if (!form || !encontrado) return;
    for (const [nome, valor] of Object.entries(encontrado.valores)) {
      const el = form.elements.namedItem(nome);
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) preencher(el, valor);
    }
    setEncontrado(null);
  }

  function descartar() {
    limparRascunhoFormulario(chave);
    setEncontrado(null);
  }

  const hora = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-3">
      {encontrado ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <span>
            Você tem um <strong>rascunho salvo</strong> ({hora(encontrado.quando)}). Quer continuar de onde parou?
          </span>
          <span className="flex gap-2">
            <Button type="button" size="sm" onClick={restaurar}>
              Restaurar rascunho
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={descartar}>
              Descartar
            </Button>
          </span>
        </div>
      ) : null}

      <form ref={ref} action={action} className={className}>
        {children}
      </form>

      {salvoEm ? (
        <p className="text-right text-[11px] text-muted-foreground">Rascunho salvo automaticamente às {hora(salvoEm)}</p>
      ) : null}
    </div>
  );
}
