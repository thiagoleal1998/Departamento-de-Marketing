"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarClock, CheckCircle2, ClipboardList, Loader2, Package, Reply } from "lucide-react";
import { dadosVinculo, responderVinculo } from "./vinculos-actions";
import { STATUS_TAREFA_ROTULO, type DadosVinculo } from "./vinculo-tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const dataBr = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }) : null;

/** Cartão de tarefa/estoque dentro da mensagem, com resposta rápida (dar entrada e concluir). */
export function VinculoCard({
  conversaId,
  tarefaId,
  itemId,
  versao,
  nomes,
  minha,
}: {
  conversaId: string;
  tarefaId: string | null;
  itemId: string | null;
  /** Muda quando chega nova mensagem ligada ao mesmo vínculo (recarrega os dados). */
  versao: number;
  nomes: Record<string, string>;
  minha: boolean;
}) {
  const [d, setD] = useState<DadosVinculo | null>(null);
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [entrada, setEntrada] = useState("");
  const [concluir, setConcluir] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  useEffect(() => {
    let vivo = true;
    void dadosVinculo(tarefaId, itemId).then((r) => vivo && setD(r));
    return () => {
      vivo = false;
    };
  }, [tarefaId, itemId, versao]);

  if (!d || (!d.tarefa && !d.item)) return null;
  const { tarefa, item } = d;
  const concluida = tarefa?.status === "concluida";
  const baixo = item ? item.quantidade <= item.estoque_minimo : false;

  function enviar() {
    setErro(null);
    startTransition(async () => {
      const r = await responderVinculo(conversaId, tarefaId, itemId, {
        texto,
        entrada: Number(entrada) || 0,
        concluir: !!tarefa && concluir,
        andamento: false,
      });
      if (r.erro) setErro(r.erro);
      else {
        setAberto(false);
        setTexto("");
        setEntrada("");
      }
    });
  }

  return (
    <div className={cn("mt-1.5 space-y-1.5 rounded-lg border p-2 text-xs", minha ? "border-white/30 bg-white/10" : "bg-background")}>
      {tarefa ? (
        <div className="space-y-0.5">
          <p className="flex items-center gap-1.5 font-semibold">
            <ClipboardList className="size-3.5 shrink-0" /> {tarefa.titulo}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 opacity-90">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-medium",
                concluida ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
              )}
            >
              {STATUS_TAREFA_ROTULO[tarefa.status]}
            </span>
            {tarefa.responsavel_id ? <span>Responsável: {nomes[tarefa.responsavel_id] ?? "—"}</span> : null}
            {tarefa.prazo ? (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-3" /> até {dataBr(tarefa.prazo)}
              </span>
            ) : null}
          </p>
        </div>
      ) : null}

      {item ? (
        <p className="flex items-center gap-1.5">
          <Package className="size-3.5 shrink-0" />
          <span className="font-medium">{item.nome}</span>
          <span className={cn("rounded px-1.5 py-0.5", baixo ? "bg-red-100 text-red-800" : "bg-muted text-foreground")}>
            estoque: {item.quantidade} (mín. {item.estoque_minimo})
          </span>
        </p>
      ) : null}

      {d.podeResponder && !concluida ? (
        aberto ? (
          <div className="space-y-1.5 rounded-md bg-muted/60 p-2 text-foreground">
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Resposta (opcional)"
              maxLength={500}
              className="h-8 text-xs"
              aria-label="Resposta"
            />
            {item ? (
              <label className="flex items-center gap-2">
                <span className="shrink-0">Entrada no estoque:</span>
                <Input
                  type="number"
                  min={0}
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  placeholder="qtd"
                  className="h-8 w-20 text-xs"
                  aria-label="Quantidade que entrou no estoque"
                />
                <span className="text-muted-foreground">un.</span>
              </label>
            ) : null}
            {tarefa ? (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={concluir} onChange={(e) => setConcluir(e.target.checked)} className="size-4 accent-emerald-600" />
                Concluir a tarefa
              </label>
            ) : null}
            {erro ? <p className="text-destructive">{erro}</p> : null}
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={enviar} disabled={pendente}>
                {pendente ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />} Enviar
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs text-foreground" onClick={() => setAberto(true)}>
            <Reply className="size-3.5" /> Responder / dar baixa
          </Button>
        )
      ) : null}
    </div>
  );
}
