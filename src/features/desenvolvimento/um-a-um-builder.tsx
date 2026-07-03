"use client";

import { HeartHandshake, Check } from "lucide-react";
import { salvar1a1 } from "./actions";
import { BLOCOS_1A1 } from "./roteiro-config";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface Opcao {
  id: string;
  nome: string;
}

export function UmAUmBuilder({ colaboradores }: { colaboradores: Opcao[] }) {
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <form action={salvar1a1} className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-warm/30 bg-warm/10 p-4">
        <HeartHandshake className="size-5 shrink-0 text-warm" />
        <p className="text-sm text-muted-foreground">
          Uma conversa de <span className="font-medium text-foreground">construção de futuro</span>.
          Demonstre interesse genuíno, escute com atenção e registre a jornada da pessoa.
          Não é avaliação — é conexão e colaboração.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="colaborador_id">Com quem? *</Label>
            <Select id="colaborador_id" name="colaborador_id" required defaultValue="">
              <option value="" disabled>
                Selecione
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
          <div className="space-y-2">
            <Label htmlFor="tema">Tema (combinado antes)</Label>
            <Input
              id="tema"
              name="tema"
              placeholder="Ex.: carreira e próximos passos"
            />
          </div>
        </CardContent>
      </Card>

      {BLOCOS_1A1.map((bloco) => (
        <Card key={bloco.id}>
          <CardContent className="space-y-4 pt-6">
            <div>
              <h2 className="text-lg font-semibold">{bloco.titulo}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {bloco.subtitulo}
              </p>
            </div>
            {bloco.campos.map((campo) => (
              <div key={String(campo.chave)} className="space-y-1.5">
                <Label htmlFor={String(campo.chave)}>{campo.label}</Label>
                <Textarea
                  id={String(campo.chave)}
                  name={String(campo.chave)}
                  placeholder={campo.placeholder}
                  rows={3}
                />
                {campo.ajuda ? (
                  <p className="text-xs text-muted-foreground">{campo.ajuda}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end no-print">
        <Button type="submit" variant="warm">
          <Check className="size-4" /> Salvar conversa
        </Button>
      </div>
    </form>
  );
}
