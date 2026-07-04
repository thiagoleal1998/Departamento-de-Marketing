"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

/** dd/mm/aaaa -> yyyy-mm-dd (ISO) ou "" se incompleto/ inválido. */
function paraISO(texto: string): string {
  const d = texto.replace(/\D/g, "");
  if (d.length !== 8) return "";
  const dia = d.slice(0, 2);
  const mes = d.slice(2, 4);
  const ano = d.slice(4, 8);
  if (+dia < 1 || +dia > 31 || +mes < 1 || +mes > 12) return "";
  return `${ano}-${mes}-${dia}`;
}

/** Aplica a máscara dd/mm/aaaa enquanto digita. */
function mascara(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  let out = d.slice(0, 2);
  if (d.length >= 3) out += "/" + d.slice(2, 4);
  if (d.length >= 5) out += "/" + d.slice(4, 8);
  return out;
}

/**
 * Campo de data no formato brasileiro (dd/mm/aaaa). Submete o valor em ISO
 * (yyyy-mm-dd) num input oculto sob `name`, para o servidor gravar direto.
 */
export function DateInputBR({
  name,
  id,
  required = false,
  defaultValue = "",
  className,
}: {
  name: string;
  id?: string;
  required?: boolean;
  defaultValue?: string;
  className?: string;
}) {
  const inicial = /^\d{4}-\d{2}-\d{2}/.test(defaultValue)
    ? `${defaultValue.slice(8, 10)}/${defaultValue.slice(5, 7)}/${defaultValue.slice(0, 4)}`
    : "";
  const [texto, setTexto] = useState(inicial);
  const iso = paraISO(texto);

  return (
    <>
      <input type="hidden" name={name} value={iso} />
      <Input
        required={required && !iso}
        id={id}
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        value={texto}
        onChange={(e) => setTexto(mascara(e.target.value))}
        aria-invalid={texto.length > 0 && !iso}
        className={className}
      />
    </>
  );
}
