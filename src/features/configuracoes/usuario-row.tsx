"use client";

import { useActionState, useEffect, useState } from "react";
import { Save, CheckCircle2, Loader2, X } from "lucide-react";
import {
  atualizarPerfilUsuario,
  type EstadoEdicaoUsuario,
} from "./actions";
import { ExcluirUsuarioButton } from "./excluir-usuario-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import type { Profile, Area } from "@/types/database";

const inicial: EstadoEdicaoUsuario = {};

export function UsuarioRow({
  p,
  areas,
  podeExcluir,
}: {
  p: Profile;
  areas: Area[];
  podeExcluir: boolean;
}) {
  const [estado, formAction, pendente] = useActionState(
    atualizarPerfilUsuario,
    inicial
  );
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (estado.ok) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 4000);
      return () => clearTimeout(t);
    }
  }, [estado]);

  return (
    <Card>
      <CardContent className="pt-6">
        {flash ? (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="size-4" />
            Alterações salvas com sucesso!
            <button
              type="button"
              onClick={() => setFlash(false)}
              className="ml-auto text-emerald-700/70 hover:text-emerald-700"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}
        {estado.erro ? (
          <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {estado.erro}
          </div>
        ) : null}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={p.id} />

          <div className="flex items-center gap-3">
            <Avatar nome={p.nome} src={p.avatar_url} className="size-10" />
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`nome-${p.id}`}>Nome</Label>
                <Input
                  id={`nome-${p.id}`}
                  name="nome"
                  defaultValue={p.nome}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`email-${p.id}`}>E-mail</Label>
                <Input
                  id={`email-${p.id}`}
                  name="email"
                  type="email"
                  defaultValue={p.email}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor={`role-${p.id}`}>Papel</Label>
              <Select id={`role-${p.id}`} name="role" defaultValue={p.role}>
                <option value="gerente">Gerente</option>
                <option value="lider">Líder</option>
                <option value="colaborador">Colaborador</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`cargo-${p.id}`}>Cargo</Label>
              <Input
                id={`cargo-${p.id}`}
                name="cargo"
                defaultValue={p.cargo ?? ""}
                placeholder="Ex.: Analista"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`area-${p.id}`}>Área</Label>
              <Select
                id={`area-${p.id}`}
                name="area_id"
                defaultValue={p.area_id ?? ""}
              >
                <option value="">Sem área</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t pt-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="ativo"
                defaultChecked={p.ativo}
                className="size-4 rounded border-input"
              />
              Ativo
            </label>
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={pendente}>
                {pendente ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Salvar
              </Button>
              {podeExcluir ? (
                <ExcluirUsuarioButton id={p.id} nome={p.nome} />
              ) : null}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
