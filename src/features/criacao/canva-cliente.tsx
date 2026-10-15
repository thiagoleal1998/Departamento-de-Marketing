"use client";

import { useActionState, useTransition } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import {
  criarDesignCanva,
  desconectarCanva,
  type EstadoCanva,
} from "./canva-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const inicial: EstadoCanva = {};

const FORMATOS = [
  { id: "story", rotulo: "Story / Reels (1080×1920)" },
  { id: "feed", rotulo: "Post feed (1080×1350)" },
  { id: "quadrado", rotulo: "Post quadrado (1080×1080)" },
  { id: "banner", rotulo: "Banner site (1920×600)" },
  { id: "email", rotulo: "E-mail (600×1200)" },
];

export function CriarNoCanva() {
  const [estado, action, pendente] = useActionState(criarDesignCanva, inicial);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cv-titulo">Título</Label>
          <Input id="cv-titulo" name="titulo" placeholder="Ex.: Story Black Friday" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cv-formato">Formato</Label>
          <Select id="cv-formato" name="formato" defaultValue="story">
            {FORMATOS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.rotulo}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pendente}>
          {pendente ? <Loader2 className="size-4 animate-spin" /> : null}
          Criar no Canva
        </Button>
        {estado.url ? (
          <a
            href={estado.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm font-medium text-primary underline"
          >
            Abrir design <ExternalLink className="size-4" />
          </a>
        ) : null}
        {estado.erro ? (
          <span className="text-sm text-destructive">{estado.erro}</span>
        ) : null}
      </div>
    </form>
  );
}

export function BotaoDesconectar() {
  const [pendente, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pendente}
      onClick={() => start(() => desconectarCanva())}
    >
      Desconectar
    </Button>
  );
}
