"use client";

import { useActionState } from "react";
import { CheckCircle2, Send, Loader2, Ticket } from "lucide-react";
import { abrirChamadoPublico, type EstadoPortal } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CHAMADO_TIPO_LABEL } from "@/types";

const estadoInicial: EstadoPortal = {};

export function PortalForm({
  titulo,
  departamentos,
}: {
  titulo: string;
  departamentos: string[];
}) {
  const [estado, formAction, pendente] = useActionState(
    abrirChamadoPublico,
    estadoInicial
  );

  if (estado.numero) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="size-7" />
          </div>
          <h3 className="text-lg font-semibold">Chamado registrado!</h3>
          <p className="text-sm text-muted-foreground">
            Seu número de acompanhamento é
          </p>
          <p className="flex items-center gap-2 text-2xl font-bold">
            <Ticket className="size-6 text-primary" /> #{estado.numero}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            A equipe de marketing já recebeu sua solicitação e vai cuidar dela.
            Guarde este número para acompanhar.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            Abrir outro chamado
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="mb-4 text-lg font-semibold">{titulo}</h2>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Seu nome *</Label>
              <Input id="nome" name="nome" placeholder="Nome completo" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Seu e-mail *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="voce@empresa.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="departamento">Departamento solicitante *</Label>
            <Select id="departamento" name="departamento" defaultValue="" required>
              <option value="" disabled>
                Selecione o seu departamento
              </option>
              {departamentos.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="titulo">O que você precisa? *</Label>
            <Input
              id="titulo"
              name="titulo"
              placeholder="Ex.: Arte para post de aniversário da loja"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descricao">Detalhes</Label>
            <Textarea
              id="descricao"
              name="descricao"
              rows={4}
              placeholder="Explique o objetivo, prazo desejado, referências e o que espera receber."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <Select id="tipo" name="tipo" defaultValue="criacao_peca">
                {Object.entries(CHAMADO_TIPO_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select id="prioridade" name="prioridade" defaultValue="media">
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Área / Canal</Label>
              <Input
                id="categoria"
                name="categoria"
                placeholder="Ex.: Instagram, Loja X"
              />
            </div>
          </div>

          {estado.erro ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {estado.erro}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pendente}>
            {pendente ? <Loader2 className="animate-spin" /> : <Send />}
            Enviar chamado
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
