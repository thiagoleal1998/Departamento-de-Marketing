"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { useActionState } from "react";
import { Camera, Trash2, Save, Check, Loader2 } from "lucide-react";
import { atualizarMeuPerfil, type EstadoPerfil } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { iniciais } from "@/lib/utils";
import { PAPEL_LABEL, type Papel } from "@/types";

const estadoInicial: EstadoPerfil = {};

/** Redimensiona a imagem para no máx. 256px e devolve um JPEG compacto (data URL). */
function processarImagem(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 256;
        let { width, height } = img;
        if (width > height && width > max) {
          height = Math.round((height * max) / width);
          width = max;
        } else if (height >= width && height > max) {
          width = Math.round((width * max) / height);
          height = max;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PerfilForm({
  nome,
  cargo,
  email,
  papel,
  avatarUrl,
}: {
  nome: string;
  cargo: string | null;
  email: string;
  papel: Papel;
  avatarUrl: string | null;
}) {
  const [estado, formAction, pendente] = useActionState(
    atualizarMeuPerfil,
    estadoInicial
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // "" = manter atual | data URL = nova foto | "__remover__" = remover
  const [avatarValor, setAvatarValor] = useState("");
  const [processando, setProcessando] = useState(false);

  const removido = avatarValor === "__remover__";
  const preview = removido
    ? null
    : avatarValor && avatarValor !== "__remover__"
      ? avatarValor
      : avatarUrl;

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessando(true);
    try {
      const dataUrl = await processarImagem(file);
      setAvatarValor(dataUrl);
    } catch {
      // ignora falha de leitura
    } finally {
      setProcessando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="avatar_url" value={avatarValor} />

      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6 sm:flex-row sm:items-center">
          {preview ? (
            <img
              src={preview}
              alt="Foto de perfil"
              className="size-24 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="flex size-24 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary ring-2 ring-border">
              {iniciais(nome)}
            </div>
          )}

          <div className="flex flex-col items-center gap-2 sm:items-start">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={aoEscolher}
              className="hidden"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={processando}
              >
                {processando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
                Escolher foto
              </Button>
              {preview ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAvatarValor("__remover__")}
                >
                  <Trash2 className="size-4" /> Remover
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              JPG ou PNG. A imagem é ajustada automaticamente.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={nome} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                name="cargo"
                defaultValue={cargo ?? ""}
                placeholder="Ex.: Analista de Marketing"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" value={email} disabled />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Perfil de acesso:</span>
            <Badge variant="secondary">{PAPEL_LABEL[papel]}</Badge>
            <span className="text-xs text-muted-foreground">
              (definido pelo gerente)
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {estado.ok ? (
          <span className="flex items-center gap-1 text-sm text-emerald-600">
            <Check className="size-4" /> Perfil atualizado
          </span>
        ) : null}
        {estado.erro ? (
          <span className="text-sm text-destructive">{estado.erro}</span>
        ) : null}
        <Button type="submit" disabled={pendente || processando}>
          {pendente ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar perfil
        </Button>
      </div>
    </form>
  );
}
