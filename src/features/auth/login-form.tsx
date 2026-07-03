"use client";

import { useActionState } from "react";
import { LogIn, Loader2 } from "lucide-react";
import { entrar, type EstadoLogin } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const estadoInicial: EstadoLogin = {};

export function LoginForm() {
  const [estado, formAction, pendente] = useActionState(entrar, estadoInicial);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="voce@empresa.com"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>

      {estado.erro ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {estado.erro}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pendente}>
        {pendente ? (
          <Loader2 className="animate-spin" />
        ) : (
          <LogIn />
        )}
        Entrar
      </Button>
    </form>
  );
}
