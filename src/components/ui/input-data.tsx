"use client";

import { useState, type ChangeEvent } from "react";
import { SeletorData } from "@/components/ui/seletor-data";

/**
 * Campo de data no padrão do painel, com a mesma forma de uso do `<Input type="date">` (value/defaultValue, name,
 * required, min, disabled, onChange com `e.target.value`), mas com o calendário próprio no lugar do nativo do navegador.
 * O valor é sempre AAAA-MM-DD. Com `name`, vai junto no envio do formulário.
 */
export function InputData({
  id,
  name,
  value,
  defaultValue,
  onChange,
  required,
  min,
  disabled,
  className,
  placeholder,
  "aria-label": ariaLabel,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  min?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const controlado = value !== undefined;
  const [interno, setInterno] = useState(defaultValue ?? "");
  const atual = controlado ? (value as string) : interno;

  return (
    <>
      {name ? <input type="hidden" name={name} value={atual} /> : null}
      <SeletorData
        id={id}
        value={atual}
        onChange={(d) => {
          if (!controlado) setInterno(d);
          onChange?.({ target: { value: d } } as ChangeEvent<HTMLInputElement>);
        }}
        className={className}
        placeholder={placeholder}
        limpavel={!required}
        min={min}
        disabled={disabled}
        ariaLabel={ariaLabel}
      />
      {/* Campo obrigatório: um campo invisível faz o navegador avisar se o formulário for enviado sem data. */}
      {required ? <input tabIndex={-1} aria-hidden required value={atual} onChange={() => undefined} className="pointer-events-none absolute h-0 w-0 opacity-0" /> : null}
    </>
  );
}
