"use client";

import { useDialogo } from "@/components/shared/dialogo-provider";

import { useState, useTransition } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { atualizarSugestao, excluirSugestao } from "./actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { SugestaoStatus } from "@/types/database";

export const STATUS_LABEL: Record<SugestaoStatus, string> = {
  nova: "Nova",
  em_analise: "Em análise",
  planejada: "Planejada",
  concluida: "Concluída",
  descartada: "Descartada",
};

export function GerenciarSugestao({
  id,
  statusInicial,
  respostaInicial,
  rotulos = STATUS_LABEL,
}: {
  id: string;
  statusInicial: SugestaoStatus;
  respostaInicial: string | null;
  rotulos?: Record<SugestaoStatus, string>;
}) {
  const [status, setStatus] = useState<SugestaoStatus>(statusInicial);
  const [resposta, setResposta] = useState(respostaInicial ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pendente, startTransition] = useTransition();
  const { confirmar } = useDialogo();

  function salvar() {
    setErro(null);
    setSalvo(false);
    startTransition(async () => {
      const res = await atualizarSugestao(id, status, resposta);
      if (res.erro) setErro(res.erro);
      else {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 3000);
      }
    });
  }

  async function excluir() {
    const ok = await confirmar({
      titulo: "Excluir este envio?",
      descricao: "A exclusão é definitiva e não pode ser desfeita.",
      confirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await excluirSugestao(id);
      if (res.erro) setErro(res.erro);
    });
  }

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as SugestaoStatus)}
          aria-label="Status"
        >
          {(Object.keys(rotulos) as SugestaoStatus[]).map((s) => (
            <option key={s} value={s}>
              {rotulos[s]}
            </option>
          ))}
        </Select>
      </div>
      <Textarea
        value={resposta}
        onChange={(e) => setResposta(e.target.value)}
        placeholder="Resposta para quem enviou (opcional)"
        className="min-h-[70px]"
      />
      <div className="flex items-center justify-end gap-2">
        {salvo ? (
          <span className="text-xs text-emerald-600">Salvo</span>
        ) : null}
        {erro ? <span className="text-xs text-destructive">{erro}</span> : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Excluir"
          aria-label="Excluir envio"
          onClick={excluir}
          disabled={pendente}
        >
          <Trash2 className="size-4" />
        </Button>
        <Button type="button" size="sm" onClick={salvar} disabled={pendente}>
          {pendente ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Salvar
        </Button>
      </div>
    </div>
  );
}
