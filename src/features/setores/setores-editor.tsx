"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { salvarSetor } from "./actions";
import type { MembroSetor, Setor } from "./tipos";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Pessoa {
  id: string;
  nome: string;
}

function CartaoSetor({ setor, pessoas, podeEditar }: { setor: Setor; pessoas: Pessoa[]; podeEditar: boolean }) {
  const [descricao, setDescricao] = useState(setor.descricao);
  const [membros, setMembros] = useState<MembroSetor[]>(setor.membros);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, start] = useTransition();

  const mudar = (lista: MembroSetor[]) => {
    setMembros(lista);
    setMsg(null);
  };
  const livres = pessoas.filter((p) => !membros.some((m) => m.profile_id === p.id));

  function salvar() {
    start(async () => {
      const r = await salvarSetor(setor.id, descricao, membros);
      setMsg(r.erro ? { ok: false, texto: r.erro } : { ok: true, texto: "Salvo. Já aparece na página inicial." });
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">{setor.nome}</h2>
        <div className="space-y-1.5">
          <Label htmlFor={`d-${setor.id}`}>O que o setor faz</Label>
          <Textarea
            id={`d-${setor.id}`}
            autoAjustar
            rows={3}
            value={descricao}
            maxLength={1500}
            disabled={!podeEditar}
            onChange={(e) => {
              setDescricao(e.target.value);
              setMsg(null);
            }}
          />
        </div>

        <div className="space-y-3">
          <Label>Quem está no setor e o que cada pessoa faz</Label>
          {membros.length === 0 ? <p className="text-sm text-muted-foreground">Ninguém neste setor ainda.</p> : null}
          {membros.map((m, i) => (
            <div key={m.profile_id} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{pessoas.find((p) => p.id === m.profile_id)?.nome ?? "Pessoa inativa (não aparece na página)"}</p>
                {podeEditar ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => mudar(membros.filter((_, k) => k !== i))}>
                    <Trash2 className="size-4" /> Remover
                  </Button>
                ) : null}
              </div>
              <Textarea
                aria-label="O que a pessoa faz"
                placeholder="O que essa pessoa faz neste setor"
                autoAjustar
                rows={2}
                value={m.funcao}
                maxLength={600}
                disabled={!podeEditar}
                onChange={(e) => mudar(membros.map((x, k) => (k === i ? { ...x, funcao: e.target.value } : x)))}
              />
            </div>
          ))}
          {podeEditar && livres.length > 0 ? (
            <div className="flex items-center gap-2">
              <Plus className="size-4 shrink-0 text-muted-foreground" />
              <Select aria-label="Adicionar pessoa" value="" onChange={(e) => e.target.value && mudar([...membros, { profile_id: e.target.value, funcao: "" }])}>
                <option value="">Adicionar pessoa…</option>
                {livres.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>

        {podeEditar ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={salvar} disabled={pendente}>
              {pendente ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Salvar {setor.nome}
            </Button>
            {msg ? <span className={msg.ok ? "text-sm text-emerald-600" : "text-sm text-destructive"}>{msg.texto}</span> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SetoresEditor({ setores, pessoas, podeEditar }: { setores: Setor[]; pessoas: Pessoa[]; podeEditar: boolean }) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-3">
      {setores.map((s) => (
        <CartaoSetor key={s.id} setor={s} pessoas={pessoas} podeEditar={podeEditar} />
      ))}
    </div>
  );
}
