"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { publicarComunicado, type EstadoComunicado } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const inicial: EstadoComunicado = {};

export function ComunicadoForm() {
  const [estado, formAction, pendente] = useActionState(
    publicarComunicado,
    inicial
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <Card>
      <CardContent className="pt-6">
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="com-titulo">Título *</Label>
            <Input
              id="com-titulo"
              name="titulo"
              maxLength={160}
              required
              placeholder="Ex.: Novo fluxo de aprovação de peças"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="com-corpo">Comunicado *</Label>
            <Textarea
              id="com-corpo"
              name="corpo"
              required
              className="min-h-[120px]"
              placeholder="Escreva o aviso para o time."
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="fixado"
                className="size-4 rounded border-input"
              />
              Fixar no topo
            </label>
            <div className="flex items-center gap-3">
              {estado.ok ? (
                <span className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle2 className="size-4" /> Publicado e time avisado
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
                Publicar
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
