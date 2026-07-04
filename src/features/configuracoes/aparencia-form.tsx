"use client";

import { useState, useActionState } from "react";
import { Save, Check, Loader2 } from "lucide-react";
import { salvarAparencia, type EstadoAparencia } from "./actions";
import {
  TEXTOS_LABELS,
  TEXTOS_PADRAO,
  type TextosConfig,
} from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const PRESETS = [
  { nome: "Índigo", cor: "#4f46e5" },
  { nome: "Azul", cor: "#2563eb" },
  { nome: "Verde", cor: "#059669" },
  { nome: "Laranja", cor: "#ea580c" },
  { nome: "Rosa", cor: "#db2777" },
  { nome: "Roxo", cor: "#7c3aed" },
  { nome: "Vermelho", cor: "#dc2626" },
  { nome: "Petróleo", cor: "#0d9488" },
];

// Campos que usam textarea (textos mais longos)
const LONGOS: (keyof TextosConfig)[] = ["portal_descricao"];

export function AparenciaForm({
  cor,
  textos,
}: {
  cor: string;
  textos: TextosConfig;
}) {
  const [corAtual, setCorAtual] = useState(cor);
  const [estado, formAction, pendente] = useActionState<EstadoAparencia, FormData>(
    salvarAparencia,
    {}
  );

  return (
    <form action={formAction} className="space-y-6">
      {/* Cor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cor principal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.cor}
                type="button"
                onClick={() => setCorAtual(p.cor)}
                title={p.nome}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full ring-offset-2 transition",
                  corAtual.toLowerCase() === p.cor.toLowerCase() &&
                    "ring-2 ring-foreground"
                )}
                style={{ backgroundColor: p.cor }}
              >
                {corAtual.toLowerCase() === p.cor.toLowerCase() ? (
                  <Check className="size-4 text-white" />
                ) : null}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="color"
              value={corAtual}
              onChange={(e) => setCorAtual(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-md border bg-background"
              aria-label="Escolher cor personalizada"
            />
            <Input
              name="cor_primaria"
              value={corAtual}
              onChange={(e) => setCorAtual(e.target.value)}
              className="w-40 font-mono"
            />
            <span
              className="rounded-md px-3 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: corAtual }}
            >
              Prévia do botão
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            A cor é aplicada em todo o painel, no login e no portal público.
          </p>
        </CardContent>
      </Card>

      {/* Textos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Textos da interface</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(Object.keys(TEXTOS_PADRAO) as (keyof TextosConfig)[]).map((chave) => (
            <div key={chave} className="space-y-1.5">
              <Label htmlFor={chave}>{TEXTOS_LABELS[chave]}</Label>
              {LONGOS.includes(chave) ? (
                <Textarea
                  id={chave}
                  name={chave}
                  defaultValue={textos[chave]}
                  rows={3}
                />
              ) : (
                <Input id={chave} name={chave} defaultValue={textos[chave]} />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {estado.ok ? (
          <span className="flex items-center gap-1 text-sm text-emerald-600">
            <Check className="size-4" /> Alterações salvas
          </span>
        ) : null}
        {estado.erro ? (
          <span className="text-sm text-destructive">{estado.erro}</span>
        ) : null}
        <Button type="submit" disabled={pendente}>
          {pendente ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Salvar aparência
        </Button>
      </div>
    </form>
  );
}
