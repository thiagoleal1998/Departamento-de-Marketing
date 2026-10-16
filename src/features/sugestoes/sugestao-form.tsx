"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { enviarSugestao, type EstadoSugestao } from "./actions";
import { AnexosCampo } from "./anexos-campo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const inicial: EstadoSugestao = {};

export function SugestaoForm() {
  const [estado, formAction, pendente] = useActionState(
    enviarSugestao,
    inicial
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [limpeza, setLimpeza] = useState(0);

  useEffect(() => {
    if (estado.ok) {
      formRef.current?.reset();
      setLimpeza((n) => n + 1);
    }
  }, [estado]);

  return (
    <Card>
      <CardContent className="pt-6">
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="sug-tipo">Tipo</Label>
              <Select id="sug-tipo" name="tipo" defaultValue="ideia">
                <option value="ideia">Ideia / sugestão</option>
                <option value="problema">Relato de problema</option>
                <option value="elogio">Elogio</option>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sug-titulo">Título *</Label>
              <Input
                id="sug-titulo"
                name="titulo"
                maxLength={140}
                required
                placeholder="Resuma em uma frase"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sug-desc">Detalhes *</Label>
            <Textarea
              id="sug-desc"
              name="descricao"
              required
              placeholder="Conte o que aconteceu ou como a ideia funcionaria. Quanto mais contexto, melhor."
            />
          </div>
          <AnexosCampo aoMudarEnvio={setEnviandoArquivo} resetKey={limpeza} />
          <div className="flex items-center justify-end gap-3">
            {estado.ok ? (
              <span className="flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle2 className="size-4" /> Obrigado! Recebemos seu
                envio.
              </span>
            ) : null}
            {estado.erro ? (
              <span className="text-sm text-destructive">{estado.erro}</span>
            ) : null}
            <Button type="submit" disabled={pendente || enviandoArquivo}>
              {pendente ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Enviar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
