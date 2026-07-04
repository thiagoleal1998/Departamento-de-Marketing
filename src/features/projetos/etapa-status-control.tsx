"use client";

import { useTransition } from "react";
import { atualizarStatusEtapa } from "./actions";
import { Select } from "@/components/ui/select";
import { ETAPA_STATUS_META, type EtapaStatus } from "@/types";

export function EtapaStatusControl({
  etapaId,
  status,
  podeEditar,
}: {
  etapaId: string;
  status: EtapaStatus;
  podeEditar: boolean;
}) {
  const [pendente, startTransition] = useTransition();

  if (!podeEditar) {
    return (
      <span className="text-xs text-muted-foreground">
        {ETAPA_STATUS_META[status].label}
      </span>
    );
  }

  return (
    <Select
      value={status}
      disabled={pendente}
      onChange={(e) =>
        startTransition(async () => {
          await atualizarStatusEtapa(etapaId, e.target.value as EtapaStatus);
        })
      }
      className="h-8 w-36 text-xs"
    >
      {(Object.keys(ETAPA_STATUS_META) as EtapaStatus[]).map((s) => (
        <option key={s} value={s}>
          {ETAPA_STATUS_META[s].label}
        </option>
      ))}
    </Select>
  );
}
