"use client";

import { useTransition } from "react";
import { atualizarStatusPlano } from "./actions";
import { Select } from "@/components/ui/select";
import { PLANO_STATUS_META, type PlanoAcaoStatus } from "@/types";

export function PlanoStatusControl({
  planoId,
  status,
  podeEditar,
}: {
  planoId: string;
  status: PlanoAcaoStatus;
  podeEditar: boolean;
}) {
  const [pendente, startTransition] = useTransition();

  if (!podeEditar) {
    return (
      <span className="text-xs text-muted-foreground">
        {PLANO_STATUS_META[status].label}
      </span>
    );
  }

  return (
    <Select
      value={status}
      disabled={pendente}
      onChange={(e) =>
        startTransition(async () => {
          await atualizarStatusPlano(planoId, e.target.value as PlanoAcaoStatus);
        })
      }
      className="h-8 w-40 text-xs"
    >
      {(Object.keys(PLANO_STATUS_META) as PlanoAcaoStatus[]).map((s) => (
        <option key={s} value={s}>
          {PLANO_STATUS_META[s].label}
        </option>
      ))}
    </Select>
  );
}
