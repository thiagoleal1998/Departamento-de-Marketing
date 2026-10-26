"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CalendarPlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { useDialogo } from "@/components/shared/dialogo-provider";
import { adicionarFeriadoExtra, escalarPessoa, removerEscala, removerFeriadoExtra } from "./actions";
import { caiNoFimDeSemana, dataBr, diaDaSemana, type Feriado } from "./calendario";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface Escalado {
  id: string;
  data: string;
  profile_id: string;
}
export interface PeriodoFerias {
  profile_id: string;
  inicio: string;
  fim: string;
}

const ROTULO = { nacional: "Feriado nacional", facultativo: "Ponto facultativo", extra: "Feriado extra" } as const;
const COR = {
  nacional: "bg-emerald-100 text-emerald-900",
  facultativo: "bg-amber-100 text-amber-900",
  extra: "bg-sky-100 text-sky-900",
} as const;

/** Escala de feriados: quem fica de plantão em cada data (aviso se a pessoa estiver de férias). */
export function EscalaPainel({
  feriados,
  escala,
  pessoas,
  ferias,
  hoje,
  indisponivel,
}: {
  feriados: Feriado[];
  escala: Escalado[];
  pessoas: { id: string; nome: string }[];
  ferias: PeriodoFerias[];
  hoje: string;
  indisponivel?: boolean;
}) {
  const { confirmar, avisar } = useDialogo();
  const [pendente, start] = useTransition();
  const [novoNome, setNovoNome] = useState("");
  const [novaData, setNovaData] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const nome = new Map(pessoas.map((p) => [p.id, p.nome]));

  const deFerias = (profileId: string, data: string) => ferias.some((f) => f.profile_id === profileId && f.inicio <= data && data <= f.fim);

  const anos = Array.from(new Set(feriados.map((f) => f.data.slice(0, 4)))).sort();

  function escalar(data: string, profileId: string) {
    if (!profileId) return;
    start(async () => {
      const r = await escalarPessoa(data, profileId);
      if (r.erro) void avisar(r.erro, "Não foi possível escalar");
    });
  }

  async function remover(e: Escalado) {
    const r = await removerEscala(e.id);
    if (r.erro) void avisar(r.erro, "Não foi possível remover");
  }

  async function removerExtra(f: Feriado) {
    if (!f.extraId) return;
    const ok = await confirmar({ titulo: "Remover este feriado extra?", descricao: `${f.nome} — ${dataBr(f.data)}`, confirmar: "Remover", perigo: true });
    if (!ok) return;
    const r = await removerFeriadoExtra(f.extraId);
    if (r.erro) void avisar(r.erro, "Não foi possível remover");
  }

  function adicionarExtra(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    start(async () => {
      const r = await adicionarFeriadoExtra(novaData, novoNome);
      if (r.erro) setErro(r.erro);
      else {
        setNovoNome("");
        setNovaData("");
      }
    });
  }

  return (
    <div className="space-y-6">
      {indisponivel ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">A escala ainda não foi ativada no banco. Rode a migration 0067 no Supabase para montar a escala (os feriados já aparecem abaixo).</p>
      ) : null}

      <Card>
        <CardContent className="p-4">
          <form onSubmit={adicionarExtra} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label htmlFor="fe-extra-nome" className="text-xs font-medium text-muted-foreground">
                Feriado extra (municipal, estadual, ponte)
              </label>
              <Input id="fe-extra-nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} maxLength={120} placeholder="Ex.: Aniversário da cidade" className="h-9 w-72" />
            </div>
            <div className="space-y-1">
              <label htmlFor="fe-extra-data" className="text-xs font-medium text-muted-foreground">
                Data
              </label>
              <Input id="fe-extra-data" type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} className="h-9 w-40" />
            </div>
            <Button type="submit" size="sm" className="h-9" disabled={pendente || !novoNome.trim() || !novaData || indisponivel}>
              {pendente ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />} Adicionar
            </Button>
            {erro ? <span className="text-sm text-destructive">{erro}</span> : null}
          </form>
        </CardContent>
      </Card>

      {anos.map((ano) => (
        <section key={ano} className="space-y-3">
          <h2 className="text-lg font-semibold">{ano === hoje.slice(0, 4) ? `Restantes de ${ano}` : ano}</h2>
          <ul className="space-y-2">
            {feriados
              .filter((f) => f.data.startsWith(ano))
              .map((f) => {
                const escalados = escala.filter((e) => e.data === f.data);
                const livres = pessoas.filter((p) => !escalados.some((e) => e.profile_id === p.id));
                const proximo = f.data >= hoje;
                return (
                  <li key={f.data + f.nome} className={cn("rounded-xl border bg-card p-4", f.data === hoje && "border-primary")}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                          {f.nome}
                          <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", COR[f.tipo])}>{ROTULO[f.tipo]}</span>
                          {caiNoFimDeSemana(f.data) ? <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">cai no fim de semana</span> : null}
                          {f.data === hoje ? <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">Hoje</span> : null}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="capitalize">{diaDaSemana(f.data)}</span>, {dataBr(f.data)}
                        </p>
                      </div>
                      {f.tipo === "extra" ? (
                        <Button variant="ghost" size="icon" className="size-8" aria-label={`Remover ${f.nome}`} onClick={() => void removerExtra(f)}>
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Escala:</span>
                      {escalados.length === 0 ? <span className="text-xs text-muted-foreground">ninguém escalado</span> : null}
                      {escalados.map((e) => {
                        const conflito = deFerias(e.profile_id, f.data);
                        return (
                          <span
                            key={e.id}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border py-1 pl-3 pr-1 text-sm",
                              conflito ? "border-amber-400 bg-amber-50" : "bg-muted/50"
                            )}
                            title={conflito ? "Esta pessoa está de férias nesta data" : undefined}
                          >
                            {conflito ? <AlertTriangle className="size-3.5 text-amber-600" /> : null}
                            {nome.get(e.profile_id) ?? "—"}
                            {conflito ? <span className="text-[11px] text-amber-700">(de férias)</span> : null}
                            <button type="button" onClick={() => void remover(e)} aria-label={`Tirar ${nome.get(e.profile_id) ?? ""} da escala`} className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-destructive">
                              <X className="size-3.5" />
                            </button>
                          </span>
                        );
                      })}
                      {proximo && livres.length > 0 && !indisponivel ? (
                        <span className="inline-flex items-center gap-1">
                          <Plus className="size-3.5 text-muted-foreground" />
                          <Select
                            value=""
                            onChange={(e) => escalar(f.data, e.target.value)}
                            disabled={pendente}
                            aria-label={`Escalar alguém em ${f.nome}`}
                            className="h-8 w-44 text-xs"
                          >
                            <option value="">Escalar alguém…</option>
                            {livres.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nome}
                                {deFerias(p.id, f.data) ? " (de férias)" : ""}
                              </option>
                            ))}
                          </Select>
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
