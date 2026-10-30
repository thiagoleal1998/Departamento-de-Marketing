"use client";

import { Select } from "@/components/ui/select";
import { SOLICITANTES_ORDENADOS } from "./solicitantes";

/** Escolha de quem (ou de qual reunião) veio a tarefa: reuniões primeiro, depois os nomes do organograma, com busca. Um nome antigo fora da lista continua aparecendo. */
export function SelectSolicitante({ id, value, onChange, required = false }: { id?: string; value: string; onChange: (nome: string) => void; required?: boolean }) {
  const foraDaLista = value && !SOLICITANTES_ORDENADOS.some((s) => s.nome === value);
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Solicitante" required={required}>
      <option value="" disabled={required}>{required ? "Selecione o solicitante" : "Não informado"}</option>
      {foraDaLista ? <option value={value}>{value}</option> : null}
      {SOLICITANTES_ORDENADOS.map((s) => (
        <option key={s.nome} value={s.nome}>
          {s.cargo ? `${s.nome} — ${s.cargo}` : s.nome}
        </option>
      ))}
    </Select>
  );
}
