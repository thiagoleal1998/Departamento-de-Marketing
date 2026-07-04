"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { UserPlus, Check, Loader2, Eye, EyeOff } from "lucide-react";
import { criarUsuario, type EstadoCriarUsuario } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Area } from "@/types/database";

const inicial: EstadoCriarUsuario = {};

export function CriarUsuarioForm({ areas }: { areas: Area[] }) {
  const [estado, formAction, pendente] = useActionState(criarUsuario, inicial);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="size-4" /> Novo usuário
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="novo-nome">Nome *</Label>
              <Input id="novo-nome" name="nome" placeholder="Nome completo" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="novo-email">E-mail *</Label>
              <Input
                id="novo-email"
                name="email"
                type="email"
                placeholder="pessoa@empresa.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="novo-senha">Senha *</Label>
              <div className="relative">
                <Input
                  id="novo-senha"
                  name="senha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="novo-role">Papel</Label>
              <Select id="novo-role" name="role" defaultValue="colaborador">
                <option value="gerente">Gerente</option>
                <option value="lider">Líder</option>
                <option value="colaborador">Colaborador</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="novo-cargo">Cargo</Label>
              <Input
                id="novo-cargo"
                name="cargo"
                placeholder="Ex.: Analista de Marketing"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="novo-area">Área</Label>
              <Select id="novo-area" name="area_id" defaultValue="">
                <option value="">Sem área</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            {estado.ok ? (
              <span className="flex items-center gap-1 text-sm text-emerald-600">
                <Check className="size-4" /> Usuário criado
              </span>
            ) : null}
            {estado.erro ? (
              <span className="text-sm text-destructive">{estado.erro}</span>
            ) : null}
            <Button type="submit" disabled={pendente}>
              {pendente ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              Criar usuário
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
