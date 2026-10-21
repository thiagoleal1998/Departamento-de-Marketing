"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Palmtree, Pencil, Plus, Trash2, X } from "lucide-react";
import { excluirFerias, salvarFerias } from "./actions";
import { MESES, dataBr, diasDeFerias, posicaoNoAno, sobrepoe, type Ferias, type PessoaFerias } from "./tipos";
import { useDialogo } from "@/components/shared/dialogo-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const hojeIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const CORES = ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-fuchsia-500", "bg-teal-500", "bg-orange-500", "bg-indigo-500", "bg-rose-500"];

export function FeriasPainel({ ferias, pessoas, ano, indisponivel }: { ferias: Ferias[]; pessoas: PessoaFerias[]; ano: number; indisponivel?: boolean }) {
  const { confirmar, avisar } = useDialogo();
  const [editando, setEditando] = useState<string | "novo" | null>(null);
  const [pessoa, setPessoa] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();
  const [filtro, setFiltro] = useState("");

  const nome = new Map(pessoas.map((p) => [p.id, p.nome]));
  const hoje = hojeIso();
  const todas = [...ferias].sort((a, b) => a.inicio.localeCompare(b.inicio) || (nome.get(a.profile_id) ?? "").localeCompare(nome.get(b.profile_id) ?? "", "pt-BR"));
  // O filtro por colaborador vale para a linha do tempo e para a lista (avisos e coincidências usam todos).
  const ordenadas = filtro ? todas.filter((f) => f.profile_id === filtro) : todas;
  const comFerias = Array.from(new Set(todas.map((f) => f.profile_id)))
    .map((id) => ({ id, nome: nome.get(id) ?? "—" }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const emFerias = todas.filter((f) => f.inicio <= hoje && hoje <= f.fim);

  // Pessoas com férias no ano, uma linha cada, na ordem alfabética.
  const linhas = Array.from(new Set(ordenadas.map((f) => f.profile_id)))
    .map((id) => ({ id, nome: nome.get(id) ?? "—" }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const conflito = (f: Ferias) => todas.some((o) => o.id !== f.id && o.profile_id !== f.profile_id && sobrepoe(o, f));

  function abrirNovo() {
    setPessoa("");
    setInicio("");
    setFim("");
    setObs("");
    setErro(null);
    setEditando("novo");
  }
  function abrirEdicao(f: Ferias) {
    setPessoa(f.profile_id);
    setInicio(f.inicio);
    setFim(f.fim);
    setObs(f.observacao ?? "");
    setErro(null);
    setEditando(f.id);
  }
  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    start(async () => {
      const r = await salvarFerias(editando === "novo" ? null : editando, { profile_id: pessoa, inicio, fim, observacao: obs });
      if (r.erro) setErro(r.erro);
      else setEditando(null);
    });
  }
  async function excluir(f: Ferias) {
    const ok = await confirmar({
      titulo: "Excluir estas férias?",
      descricao: `${nome.get(f.profile_id) ?? "Colaborador"}: ${dataBr(f.inicio)} a ${dataBr(f.fim)}.`,
      confirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    start(async () => {
      const r = await excluirFerias(f.id);
      if (r.erro) void avisar(r.erro, "Não foi possível excluir");
    });
  }

  const situacao = (f: Ferias) =>
    f.fim < hoje
      ? { rotulo: "Concluídas", cor: "bg-muted text-muted-foreground" }
      : f.inicio <= hoje
        ? { rotulo: "De férias agora", cor: "bg-emerald-100 text-emerald-900" }
        : { rotulo: "Programadas", cor: "bg-sky-100 text-sky-900" };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button asChild variant="outline" size="icon" className="size-9" aria-label="Ano anterior">
            <Link href={`/gestao/ferias?ano=${ano - 1}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="min-w-16 text-center text-lg font-semibold tabular-nums">{ano}</span>
          <Button asChild variant="outline" size="icon" className="size-9" aria-label="Próximo ano">
            <Link href={`/gestao/ferias?ano=${ano + 1}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
        {editando === null ? (
          <Button onClick={abrirNovo} disabled={indisponivel}>
            <Plus className="size-4" /> Registrar férias
          </Button>
        ) : null}
      </div>

      {indisponivel ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          As férias ainda não foram ativadas no banco. Rode a migration 0059 no Supabase para começar a registrar.
        </p>
      ) : null}

      {editando !== null ? (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={salvar} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{editando === "novo" ? "Registrar férias" : "Editar férias"}</h2>
                <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={() => setEditando(null)}>
                  <X className="size-4" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="fe-pessoa">Colaborador *</Label>
                  <Select id="fe-pessoa" value={pessoa} onChange={(e) => setPessoa(e.target.value)} required>
                    <option value="">Selecione…</option>
                    {pessoas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fe-inicio">Primeiro dia *</Label>
                  <Input id="fe-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fe-fim">Último dia *</Label>
                  <Input id="fe-fim" type="date" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Duração</Label>
                  <p className="flex h-10 items-center text-sm text-muted-foreground">
                    {inicio && fim && fim >= inicio ? `${diasDeFerias({ inicio, fim })} dias corridos` : "—"}
                  </p>
                </div>
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="fe-obs">Observação</Label>
                  <Input id="fe-obs" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={500} placeholder="Ex.: retorno na segunda, dia 1º…" />
                </div>
              </div>
              {erro ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pendente}>
                  {pendente ? <Loader2 className="size-4 animate-spin" /> : null} Salvar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {emFerias.length > 0 && ano === Number(hoje.slice(0, 4)) ? (
        <p className="flex flex-wrap items-center gap-2 rounded-md bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
          <Palmtree className="size-4" /> De férias agora:{" "}
          <strong>{emFerias.map((f) => `${nome.get(f.profile_id) ?? "—"} (até ${dataBr(f.fim)})`).join(" · ")}</strong>
        </p>
      ) : null}

      {comFerias.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-60">
            <Select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por colaborador" className="h-9">
              <option value="">Todos os colaboradores</option>
              {comFerias.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </div>
          {filtro ? (
            <>
              <span className="text-xs text-muted-foreground">
                {ordenadas.length} período(s) · {ordenadas.reduce((t, f) => t + diasDeFerias(f), 0)} dias em {ano}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setFiltro("")}>
                Limpar filtro
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {/* Linha do tempo do ano */}
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Linha do tempo de {ano}</h2>
          {linhas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma férias registrada em {ano}.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[720px] space-y-1">
                <div className="relative ml-40 h-5 text-[11px] text-muted-foreground">
                  {MESES.map((m, i) => (
                    <span key={m} className="absolute" style={{ left: `${posicaoNoAno(`${ano}-${String(i + 1).padStart(2, "0")}-01`, ano)}%` }}>
                      {m}
                    </span>
                  ))}
                </div>
                {linhas.map((l, idx) => (
                  <div key={l.id} className="flex items-center gap-2">
                    <span className="w-[152px] shrink-0 truncate text-sm">{l.nome}</span>
                    <div className="relative h-7 flex-1 rounded bg-muted/60">
                      {MESES.slice(1).map((m, i) => (
                        <span
                          key={m}
                          className="absolute inset-y-0 w-px bg-border"
                          style={{ left: `${posicaoNoAno(`${ano}-${String(i + 2).padStart(2, "0")}-01`, ano)}%` }}
                        />
                      ))}
                      {hoje.startsWith(String(ano)) ? (
                        <span className="absolute inset-y-0 w-0.5 bg-primary/60" style={{ left: `${posicaoNoAno(hoje, ano)}%` }} title="Hoje" />
                      ) : null}
                      {ordenadas
                        .filter((f) => f.profile_id === l.id)
                        .map((f) => {
                          const e = posicaoNoAno(f.inicio < `${ano}-01-01` ? `${ano}-01-01` : f.inicio, ano);
                          const d = posicaoNoAno(f.fim > `${ano}-12-31` ? `${ano}-12-31` : f.fim, ano, true);
                          return (
                            <span
                              key={f.id}
                              title={`${l.nome}: ${dataBr(f.inicio)} a ${dataBr(f.fim)} (${diasDeFerias(f)} dias)`}
                              className={cn("absolute inset-y-1 rounded", CORES[idx % CORES.length])}
                              style={{ left: `${e}%`, width: `${Math.max(d - e, 0.6)}%` }}
                            />
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista */}
      {ordenadas.length > 0 ? (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Colaborador</th>
                  <th className="px-4 py-2 font-medium">Período</th>
                  <th className="px-4 py-2 font-medium">Dias</th>
                  <th className="px-4 py-2 font-medium">Situação</th>
                  <th className="px-4 py-2 font-medium">Observação</th>
                  <th className="w-24 px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {ordenadas.map((f) => {
                  const s = situacao(f);
                  return (
                    <tr key={f.id} className="align-top">
                      <td className="px-4 py-3 font-medium">{nome.get(f.profile_id) ?? "—"}</td>
                      <td className="px-4 py-3">
                        {dataBr(f.inicio)} a {dataBr(f.fim)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{diasDeFerias(f)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", s.cor)}>{s.rotulo}</span>
                        {conflito(f) ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-700" title="Outra pessoa do time está de férias no mesmo período">
                            <AlertTriangle className="size-3.5" /> coincide com outra
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{f.observacao ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => abrirEdicao(f)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluir(f)} disabled={pendente}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
