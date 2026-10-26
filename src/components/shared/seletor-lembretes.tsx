"use client";

import { Bell } from "lucide-react";
import { OPCOES_LEMBRETE } from "@/lib/lembretes";

/** Escolha de quando o sistema deve notificar (às 8h) em relação à data do card ou item. */
export function SeletorLembretes({
  valor,
  onChange,
  rotuloData,
  semData,
}: {
  valor: number[];
  onChange: (v: number[]) => void;
  /** Ex.: "prazo" ou "data". */
  rotuloData: string;
  semData: boolean;
}) {
  return (
    <fieldset className="space-y-1.5 sm:col-span-2">
      <legend className="flex items-center gap-1.5 text-sm font-medium leading-none">
        <Bell className="size-3.5" /> Lembrete (notificação às 8h)
      </legend>
      <div className="flex flex-wrap gap-2 pt-1">
        {OPCOES_LEMBRETE.map((o) => {
          const marcado = valor.includes(o.dias);
          return (
            <button
              key={o.dias}
              type="button"
              aria-pressed={marcado}
              onClick={() => onChange(marcado ? valor.filter((x) => x !== o.dias) : [...valor, o.dias])}
              className={
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                (marcado ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground")
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {semData
          ? `Defina o ${rotuloData} para os lembretes valerem.`
          : valor.length === 0
            ? "Nenhum lembrete. Marque quando quer ser avisado."
            : `O responsável é avisado no sino e no navegador, contando a partir do ${rotuloData}.`}
      </p>
    </fieldset>
  );
}
