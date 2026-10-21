"use client";

import { useActionState } from "react";
import { Search, Loader2 } from "lucide-react";
import { consultarChamado, type EstadoConsulta } from "./consulta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChamadoStatusBadge } from "@/components/shared/status-badge";
import { CHAMADO_STATUS_META } from "@/types";
import { formatarData, formatarDataHora } from "@/lib/utils";

const inicial: EstadoConsulta = {};

export function AcompanharForm() {
  const [estado, formAction, pendente] = useActionState(
    consultarChamado,
    inicial
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <form action={formAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="numero">Número do chamado</Label>
                <Input
                  id="numero"
                  name="numero"
                  inputMode="numeric"
                  placeholder="Ex.: 1042"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">
                  E-mail informado na abertura <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="voce@empresa.com"
                />
                <p className="text-xs text-muted-foreground">Com o e-mail você vê também o título e o andamento detalhado.</p>
              </div>
            </div>
            {estado.erro ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {estado.erro}
              </p>
            ) : null}
            <Button type="submit" disabled={pendente}>
              {pendente ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              Acompanhar
            </Button>
          </form>
        </CardContent>
      </Card>

      {estado.chamado ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  Chamado #{estado.chamado.numero}
                </p>
                <h2 className="text-lg font-semibold">
                  {estado.chamado.titulo ?? "Título visível ao informar o e-mail da abertura"}
                </h2>
              </div>
              <ChamadoStatusBadge status={estado.chamado.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Departamento</p>
                <p className="font-medium">
                  {estado.chamado.departamento ?? "—"}
                </p>
              </div>
              {estado.chamado.responsavel ? (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Responsável pelo seu chamado</p>
                  <p className="font-medium">{estado.chamado.responsavel}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs text-muted-foreground">Aberto em</p>
                <p className="font-medium">
                  {formatarData(estado.chamado.created_at)}
                </p>
              </div>
            </div>

            {estado.chamado.historico.length > 0 ? (
              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-semibold">Andamento</p>
                <ul className="space-y-2">
                  {estado.chamado.historico.map((h, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="size-2 rounded-full bg-primary" />
                      <span className="font-medium">{h.texto}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatarDataHora(h.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {estado.chamado.parcial ? (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                Quer ver o título e o andamento detalhado? Informe também o e-mail usado na abertura e consulte de novo.
              </p>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Situação atual:{" "}
              <strong>{CHAMADO_STATUS_META[estado.chamado.status].label}</strong>
              . A equipe de marketing atualiza o andamento conforme avança.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
