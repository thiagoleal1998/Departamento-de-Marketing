"use client";

import { useState } from "react";
import { Sparkles, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { salvarFeedback } from "./actions";
import { ETAPAS_FEEDBACK, FRASE_GUIA } from "./roteiro-config";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Opcao {
  id: string;
  nome: string;
}

export function FeedbackBuilder({
  colaboradores,
}: {
  colaboradores: Opcao[];
}) {
  const [passo, setPasso] = useState(0);
  const total = ETAPAS_FEEDBACK.length;
  const ultimo = passo === total - 1;
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <form action={salvarFeedback} className="space-y-6">
      {/* Banner-guia */}
      <div className="flex items-center gap-3 rounded-xl border border-warm/30 bg-warm/10 p-4">
        <Sparkles className="size-5 shrink-0 text-warm" />
        <p className="text-sm font-medium text-foreground">
          {FRASE_GUIA}{" "}
          <span className="font-normal text-muted-foreground">
            O valor real está em lidar com a percepção e mudar a ação.
          </span>
        </p>
      </div>

      {/* Cabeçalho: colaborador e data */}
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="colaborador_id">Com quem é a conversa? *</Label>
            <Select id="colaborador_id" name="colaborador_id" required defaultValue="">
              <option value="" disabled>
                Selecione o colaborador
              </option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <Input id="data" name="data" type="date" defaultValue={hoje} />
          </div>
        </CardContent>
      </Card>

      {/* Progresso */}
      <div className="flex flex-wrap items-center gap-1.5">
        {ETAPAS_FEEDBACK.map((etapa, i) => (
          <button
            type="button"
            key={etapa.id}
            onClick={() => setPasso(i)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              i === passo
                ? "bg-primary text-primary-foreground"
                : i < passo
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {i < passo ? <Check className="size-3" /> : <span>{i + 1}</span>}
            <span className="hidden sm:inline">{etapa.titulo}</span>
          </button>
        ))}
      </div>

      {/* Etapas (todas no DOM; só a atual visível) */}
      {ETAPAS_FEEDBACK.map((etapa, i) => (
        <Card key={etapa.id} className={cn(i !== passo && "hidden")}>
          <CardContent className="space-y-4 pt-6">
            <div>
              <h2 className="text-lg font-semibold">
                {i + 1}. {etapa.titulo}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {etapa.subtitulo}
              </p>
            </div>

            {etapa.campos.map((campo) => (
              <div key={String(campo.chave)} className="space-y-1.5">
                {campo.tipo === "checkbox" ? (
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      name={String(campo.chave)}
                      className="size-4 rounded border-input"
                    />
                    {campo.label}
                  </label>
                ) : (
                  <>
                    <Label htmlFor={String(campo.chave)}>{campo.label}</Label>
                    {campo.tipo === "date" ? (
                      <Input
                        id={String(campo.chave)}
                        name={String(campo.chave)}
                        type="date"
                      />
                    ) : campo.tipo === "text" ? (
                      <Input
                        id={String(campo.chave)}
                        name={String(campo.chave)}
                        placeholder={campo.placeholder}
                      />
                    ) : (
                      <Textarea
                        id={String(campo.chave)}
                        name={String(campo.chave)}
                        placeholder={campo.placeholder}
                        rows={4}
                      />
                    )}
                  </>
                )}
                {campo.ajuda ? (
                  <p className="text-xs text-muted-foreground">{campo.ajuda}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Resumo + status (sempre disponíveis no último passo) */}
      {ultimo ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="resumo">Resumo da conversa</Label>
              <Textarea
                id="resumo"
                name="resumo"
                placeholder="Um resumo curto do que foi conversado e combinado."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Situação</Label>
              <Select id="status" name="status" defaultValue="rascunho">
                <option value="rascunho">Salvar como rascunho</option>
                <option value="realizado">Marcar como realizado</option>
              </Select>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Navegação */}
      <div className="flex items-center justify-between no-print">
        <Button
          type="button"
          variant="outline"
          onClick={() => setPasso((p) => Math.max(0, p - 1))}
          disabled={passo === 0}
        >
          <ChevronLeft className="size-4" /> Anterior
        </Button>

        {ultimo ? (
          <Button type="submit" variant="warm">
            <Check className="size-4" /> Salvar feedback
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setPasso((p) => Math.min(total - 1, p + 1))}
          >
            Próximo <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
