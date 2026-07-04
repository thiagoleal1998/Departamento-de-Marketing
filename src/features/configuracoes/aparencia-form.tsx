"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useActionState, useRef } from "react";
import { Save, Check, Loader2, Upload, Trash2, Megaphone } from "lucide-react";
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

/** Redimensiona a logo (máx. 320px, mantém proporção, PNG p/ preservar transparência). */
function processarLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 320;
        let { width, height } = img;
        if (width > max || height > max) {
          if (width >= height) {
            height = Math.round((height * max) / width);
            width = max;
          } else {
            width = Math.round((width * max) / height);
            height = max;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AparenciaForm({
  cor,
  logo,
  departamentos,
  textos,
}: {
  cor: string;
  logo: string | null;
  departamentos: string[];
  textos: TextosConfig;
}) {
  const [corAtual, setCorAtual] = useState(cor);
  const [estado, formAction, pendente] = useActionState<EstadoAparencia, FormData>(
    salvarAparencia,
    {}
  );

  // Logo: "" = manter | data URL = nova | "__remover__" = remover
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoValor, setLogoValor] = useState("");
  const [processandoLogo, setProcessandoLogo] = useState(false);
  const logoRemovida = logoValor === "__remover__";
  const logoPreview = logoRemovida
    ? null
    : logoValor && logoValor !== "__remover__"
      ? logoValor
      : logo;

  async function aoEscolherLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessandoLogo(true);
    try {
      setLogoValor(await processarLogo(file));
    } catch {
      // ignora
    } finally {
      setProcessandoLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="logo_url" value={logoValor} />

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="flex h-20 w-40 items-center justify-center rounded-lg border bg-muted/40 p-2">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo atual"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Megaphone className="size-5" /> Ícone padrão
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={aoEscolherLogo}
              className="hidden"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
                disabled={processandoLogo}
              >
                {processandoLogo ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Enviar logo
              </Button>
              {logoPreview ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogoValor("__remover__")}
                >
                  <Trash2 className="size-4" /> Remover
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              PNG (com transparência) ou JPG. Aparece no login, no portal e no
              menu. Sem logo, usamos o ícone padrão.
            </p>
          </div>
        </CardContent>
      </Card>

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

      {/* Departamentos solicitantes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Departamentos solicitantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="departamentos">
            Opções do campo &quot;Departamento solicitante&quot; nos chamados
          </Label>
          <Textarea
            id="departamentos"
            name="departamentos"
            rows={departamentos.length + 2}
            defaultValue={departamentos.join("\n")}
            placeholder={"Um departamento por linha"}
          />
          <p className="text-xs text-muted-foreground">
            Um departamento por linha. Essas opções aparecem no formulário de
            chamado (interno e portal).
          </p>
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
