"use client";

import { useActionState, useRef, useEffect } from "react";
import { KeyRound, Check, Loader2 } from "lucide-react";
import { alterarMinhaSenha, type EstadoSenha } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const estadoInicial: EstadoSenha = {};

export function SenhaForm() {
  const [estado, formAction, pendente] = useActionState(
    alterarMinhaSenha,
    estadoInicial
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} action={formAction}>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h2 className="text-base font-semibold">Alterar senha</h2>
            <p className="text-sm text-muted-foreground">
              Informe sua senha atual e escolha uma nova (mín. 6 caracteres).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha_atual">Senha atual</Label>
            <Input
              id="senha_atual"
              name="senha_atual"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="senha_nova">Nova senha</Label>
              <Input
                id="senha_nova"
                name="senha_nova"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha_confirma">Confirmar nova senha</Label>
              <Input
                id="senha_confirma"
                name="senha_confirma"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            {estado.ok ? (
              <span className="flex items-center gap-1 text-sm text-emerald-600">
                <Check className="size-4" /> Senha alterada
              </span>
            ) : null}
            {estado.erro ? (
              <span className="text-sm text-destructive">{estado.erro}</span>
            ) : null}
            <Button type="submit" disabled={pendente}>
              {pendente ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Alterar senha
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
