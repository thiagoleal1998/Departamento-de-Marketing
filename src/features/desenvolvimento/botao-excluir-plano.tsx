"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { excluirPlano } from "./plano-actions";
import { Button } from "@/components/ui/button";
import { useDialogo } from "@/components/shared/dialogo-provider";

/** Exclui o plano de ação (com confirmação). `voltarPara`: para onde ir depois, quando o botão está dentro do próprio plano. */
export function BotaoExcluirPlano({ planoId, titulo, voltarPara, comRotulo = false }: { planoId: string; titulo: string; voltarPara?: string; comRotulo?: boolean }) {
  const router = useRouter();
  const { confirmar, avisar } = useDialogo();
  const [pendente, start] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size={comRotulo ? "sm" : "icon"}
      className="size-8 text-muted-foreground hover:text-destructive data-[rotulo=true]:w-auto data-[rotulo=true]:px-3"
      data-rotulo={comRotulo}
      aria-label={`Excluir o plano ${titulo}`}
      title="Excluir plano"
      disabled={pendente}
      onClick={async () => {
        const ok = await confirmar({
          titulo: "Excluir este plano de ação?",
          descricao: `${titulo}\n\nOs objetivos, o checklist e os anexos do plano serão apagados. Não é possível desfazer.`,
          confirmar: "Excluir",
          perigo: true,
        });
        if (!ok) return;
        start(async () => {
          const r = await excluirPlano(planoId);
          if (r.erro) void avisar(r.erro, "Não foi possível excluir");
          else if (voltarPara) router.push(voltarPara);
          else router.refresh();
        });
      }}
    >
      {pendente ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      {comRotulo ? " Excluir plano" : null}
    </Button>
  );
}
