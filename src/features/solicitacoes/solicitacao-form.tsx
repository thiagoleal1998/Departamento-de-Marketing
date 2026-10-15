"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { criarSolicitacao, type EstadoSolicitacao } from "./actions";
import {
  TIPO_LABEL,
  TIPOS_COM_HORA,
  TIPOS_COM_PERIODO,
  type TipoSolicitacao,
} from "./tipos";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const inicial: EstadoSolicitacao = {};

export function SolicitacaoForm() {
  const [estado, formAction, pendente] = useActionState(
    criarSolicitacao,
    inicial
  );
  const [tipo, setTipo] = useState<TipoSolicitacao>("folga");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) {
      formRef.current?.reset();
      setTipo("folga");
    }
  }, [estado]);

  const comHora = TIPOS_COM_HORA.includes(tipo);
  const comPeriodo = TIPOS_COM_PERIODO.includes(tipo);

  return (
    <Card>
      <CardContent className="pt-6">
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="sol-tipo">Tipo *</Label>
              <Select
                id="sol-tipo"
                name="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoSolicitacao)}
              >
                {(Object.keys(TIPO_LABEL) as TipoSolicitacao[]).map((t) => (
                  <option key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sol-ini">
                {comPeriodo ? "De *" : "Data *"}
              </Label>
              <Input id="sol-ini" name="data_inicio" type="date" required />
            </div>
            {comPeriodo ? (
              <div className="space-y-1.5">
                <Label htmlFor="sol-fim">Até</Label>
                <Input id="sol-fim" name="data_fim" type="date" />
              </div>
            ) : null}
            {comHora ? (
              <div className="space-y-1.5">
                <Label htmlFor="sol-hora">
                  Horário{tipo === "consulta" ? "" : " *"}
                </Label>
                <Input id="sol-hora" name="hora" type="time" />
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sol-motivo">Motivo / observações</Label>
            <Textarea
              id="sol-motivo"
              name="motivo"
              className="min-h-[80px]"
              placeholder="Conte o contexto, se quiser (opcional)."
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {estado.ok ? (
              <span className="flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle2 className="size-4" /> Solicitação enviada
              </span>
            ) : null}
            {estado.erro ? (
              <span className="text-sm text-destructive">{estado.erro}</span>
            ) : null}
            <Button type="submit" disabled={pendente}>
              {pendente ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Enviar solicitação
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
