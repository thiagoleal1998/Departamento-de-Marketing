"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Wand2, ImageIcon } from "lucide-react";
import { TEMPLATES } from "./templates";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Valores = Record<string, string>;

export function GeradorPeca() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [valores, setValores] = useState<Valores>({});

  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
  const v = (chave: string) => valores[chave] ?? "";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Formulário */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="template">Modelo</Label>
            <Select
              id="template"
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value);
                setValores({});
              }}
            >
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} · {t.canal}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">{template.descricao}</p>
          </div>

          {template.campos.map((campo) => (
            <div key={campo.chave} className="space-y-1.5">
              <Label htmlFor={campo.chave}>{campo.label}</Label>
              {campo.tipo === "textarea" ? (
                <Textarea
                  id={campo.chave}
                  placeholder={campo.placeholder}
                  rows={2}
                  value={v(campo.chave)}
                  onChange={(e) =>
                    setValores((s) => ({ ...s, [campo.chave]: e.target.value }))
                  }
                />
              ) : (
                <Input
                  id={campo.chave}
                  placeholder={campo.placeholder}
                  value={v(campo.chave)}
                  onChange={(e) =>
                    setValores((s) => ({ ...s, [campo.chave]: e.target.value }))
                  }
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preview simulado */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Wand2 className="size-4" /> Prévia gerada
        </div>
        <div className="overflow-hidden rounded-xl border shadow-sm">
          <div
            className={cn(
              "relative flex aspect-square flex-col justify-between bg-gradient-to-br p-6 text-white",
              template.tema
            )}
          >
            <div className="flex items-center justify-between">
              <Badge className="bg-white/20 text-white">{template.objetivo}</Badge>
              <span className="text-xs opacity-80">{template.canal}</span>
            </div>

            <div className="space-y-2">
              {v("imagem") ? (
                <img
                  src={v("imagem")}
                  alt=""
                  className="mb-3 h-28 w-full rounded-lg object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="mb-3 flex h-28 w-full items-center justify-center rounded-lg bg-white/15">
                  <ImageIcon className="size-8 opacity-70" />
                </div>
              )}
              <h2 className="text-2xl font-bold leading-tight drop-shadow-sm">
                {v("titulo") || "Seu título aqui"}
              </h2>
              <p className="text-sm opacity-90">
                {v("subtitulo") || "Subtítulo de apoio"}
              </p>
            </div>

            <div className="space-y-3">
              {v("chamada") ? (
                <p className="text-lg font-semibold">{v("chamada")}</p>
              ) : null}
              <div className="flex items-center justify-between">
                <div>
                  {v("produto") ? (
                    <p className="text-xs uppercase tracking-wide opacity-80">
                      {v("produto")}
                    </p>
                  ) : null}
                  {v("preco") ? (
                    <p className="text-xl font-bold">{v("preco")}</p>
                  ) : null}
                </div>
                <span className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900">
                  {v("cta") || "Saiba mais"}
                </span>
              </div>
            </div>
          </div>
        </div>
        {v("observacoes") ? (
          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <span className="font-medium">Observações:</span> {v("observacoes")}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Prévia simulada. A integração com o Canva para exportar a peça final
          será conectada nesta mesma tela.
        </p>
      </div>
    </div>
  );
}
