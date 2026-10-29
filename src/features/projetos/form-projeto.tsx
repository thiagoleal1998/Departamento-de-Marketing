"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { salvarDadosProjeto, type EstadoProjeto } from "./actions";
import { Button } from "@/components/ui/button";

/** Formulário "Editar dados do projeto": mostra se salvou ou o motivo de não ter salvo (antes o erro era silencioso). */
export function FormProjeto({ projetoId, children }: { projetoId: string; children: React.ReactNode }) {
  const router = useRouter();
  const [estado, acao, pendente] = useActionState<EstadoProjeto, FormData>(salvarDadosProjeto.bind(null, projetoId), {});
  useEffect(() => {
    if (estado.ok) router.refresh();
  }, [estado, router]);

  return (
    <form action={acao} className="space-y-3 border-t px-6 py-4">
      {children}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {estado.erro ? <p className="text-sm text-destructive">{estado.erro}</p> : null}
        {estado.ok ? (
          <p className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="size-4" /> Alterações salvas
          </p>
        ) : null}
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar
        </Button>
      </div>
    </form>
  );
}
