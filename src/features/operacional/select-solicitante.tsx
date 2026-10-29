"use client";

import { Select } from "@/components/ui/select";
import { SOLICITANTES_ORDENADOS } from "./solicitantes";

/** Escolha de quem solicitou a tarefa, com os nomes do organograma (e busca). Um nome antigo fora da lista continua aparecendo. */
export function SelectSolicitante({ id, value, onChange }: { id?: string; value: string; onChange: (nome: string) => void }) {
  const foraDaLista = value && !SOLICITANTES_ORDENADOS.some((s) => s.nome === value);
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Solicitante">
      <option value="">Não informado</option>
      {foraDaLista ? <option value={value}>{value}</option> : null}
      {SOLICITANTES_ORDENADOS.map((s) => (
        <option key={s.nome} value={s.nome}>
          {s.nome} — {s.cargo}
        </option>
      ))}
    </Select>
  );
}
