"use client";

import { useTransition } from "react";
import { atualizarStatusProjeto } from "./actions";
import { Select } from "@/components/ui/select";
import { PROJETO_STATUS_META, type ProjetoStatus } from "@/types";

export function ProjetoStatusControl({
  projetoId,
  status,
}: {
  projetoId: string;
  status: ProjetoStatus;
}) {
  const [pendente, startTransition] = useTransition();
  return (
    <Select
      value={status}
      disabled={pendente}
      onChange={(e) =>
        startTransition(async () => {
          await atualizarStatusProjeto(
            projetoId,
            e.target.value as ProjetoStatus
          );
        })
      }
      className="h-9 w-44"
    >
      {(Object.keys(PROJETO_STATUS_META) as ProjetoStatus[]).map((s) => (
        <option key={s} value={s}>
          {PROJETO_STATUS_META[s].label}
        </option>
      ))}
    </Select>
  );
}
