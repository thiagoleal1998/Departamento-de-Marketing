"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Loader2, X, ExternalLink } from "lucide-react";
import { salvarRegistro, excluirRegistro } from "./cadastros-actions";
import { CADASTROS, type CadastroChave, type CampoDef } from "./cadastros";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Linha = Record<string, string | null> & { id: string };
type Opcao = { id: string; nome: string };

function formatarData(v: string | null): string {
  if (!v) return "—";
  const [a, m, d] = v.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : v;
}

function formatarDataHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CadastroCrud({
  chave,
  linhas,
  pessoas,
  lps,
  podeExcluir,
  rotuloNovo,
  vazio,
  filtros = [],
}: {
  chave: CadastroChave;
  linhas: Linha[];
  pessoas: Opcao[];
  lps: Opcao[];
  podeExcluir: boolean;
  rotuloNovo: string;
  vazio: string;
  /** Nomes de campos (select) oferecidos como filtro, além da busca. */
  filtros?: string[];
}) {
  const def = CADASTROS[chave];
  const [editando, setEditando] = useState<string | "novo" | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const [busca, setBusca] = useState("");
  const [filtroVal, setFiltroVal] = useState<Record<string, string>>({});

  const nomePessoa = new Map(pessoas.map((p) => [p.id, p.nome]));
  const nomeLp = new Map(lps.map((l) => [l.id, l.nome]));

  function abrirNovo() {
    const base: Record<string, string> = {};
    for (const c of def.campos) {
      base[c.name] = c.padrao ?? "";
    }
    setValores(base);
    setErro(null);
    setEditando("novo");
  }

  function abrirEdicao(l: Linha) {
    const base: Record<string, string> = {};
    for (const c of def.campos) base[c.name] = l[c.name] ?? "";
    setValores(base);
    setErro(null);
    setEditando(l.id);
  }

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const res = await salvarRegistro(
        chave,
        editando === "novo" ? null : editando,
        valores
      );
      if (res.erro) setErro(res.erro);
      else setEditando(null);
    });
  }

  function excluir(l: Linha) {
    if (!confirm("Excluir este registro definitivamente?")) return;
    startTransition(async () => {
      const res = await excluirRegistro(chave, l.id);
      if (res.erro) alert(res.erro);
    });
  }

  function exibir(c: CampoDef, l: Linha) {
    const v = l[c.name];
    if (v === null || v === undefined || v === "") return "—";
    switch (c.tipo) {
      case "select":
        return c.opcoes?.find((o) => o.value === v)?.label ?? v;
      case "pessoa":
        return nomePessoa.get(v) ?? "—";
      case "lp":
        return nomeLp.get(v) ?? "—";
      case "data":
        return formatarData(v);
      case "url":
        return (
          <a
            href={v}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Abrir <ExternalLink className="size-3" />
          </a>
        );
      default:
        return <span className="whitespace-pre-line">{v}</span>;
    }
  }

  function campoInput(c: CampoDef) {
    const id = `cad-${chave}-${c.name}`;
    const valor = valores[c.name] ?? "";
    const set = (v: string) => setValores((p) => ({ ...p, [c.name]: v }));
    let controle: React.ReactNode;
    if (c.tipo === "textarea") {
      controle = (
        <Textarea id={id} value={valor} onChange={(e) => set(e.target.value)} />
      );
    } else if (c.tipo === "select") {
      controle = (
        <Select id={id} value={valor} onChange={(e) => set(e.target.value)}>
          {c.obrigatorio ? null : <option value="">—</option>}
          {c.opcoes?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
    } else if (c.tipo === "pessoa" || c.tipo === "lp") {
      const lista = c.tipo === "pessoa" ? pessoas : lps;
      controle = (
        <Select id={id} value={valor} onChange={(e) => set(e.target.value)}>
          <option value="">{c.obrigatorio ? "Selecione…" : "Sem seleção"}</option>
          {lista.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </Select>
      );
    } else {
      controle = (
        <Input
          id={id}
          type={c.tipo === "data" ? "date" : c.tipo === "url" ? "url" : "text"}
          value={valor}
          onChange={(e) => set(e.target.value)}
          placeholder={c.placeholder}
        />
      );
    }
    return (
      <div
        key={c.name}
        className={c.tipo === "textarea" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}
      >
        <Label htmlFor={id}>
          {c.label}
          {c.obrigatorio ? " *" : ""}
        </Label>
        {controle}
      </div>
    );
  }

  const colunas = def.campos.filter((c) => c.lista);
  const camposFiltro = def.campos.filter((c) => filtros.includes(c.name));

  const termo = busca.trim().toLowerCase();
  const visiveis = linhas.filter((l) => {
    for (const [campo, valor] of Object.entries(filtroVal)) {
      if (valor && (l[campo] ?? "") !== valor) return false;
    }
    if (!termo) return true;
    return def.campos.some((c) =>
      String(l[c.name] ?? "").toLowerCase().includes(termo)
    );
  });

  return (
    <div className="space-y-4">
      {editando === null ? (
        <div className="flex justify-end">
          <Button onClick={abrirNovo}>
            <Plus className="size-4" /> {rotuloNovo}
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                {editando === "novo" ? rotuloNovo : "Editar registro"}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fechar"
                onClick={() => setEditando(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {def.campos.map(campoInput)}
            </div>
            {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button onClick={salvar} disabled={pendente}>
                {pendente ? <Loader2 className="size-4 animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {linhas.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar…"
            className="h-9 w-56"
            aria-label="Buscar"
          />
          {camposFiltro.map((c) => (
            <div key={c.name} className="w-44">
              <Select
                value={filtroVal[c.name] ?? ""}
                onChange={(e) =>
                  setFiltroVal((p) => ({ ...p, [c.name]: e.target.value }))
                }
                aria-label={c.label}
                className="h-9"
              >
                <option value="">{c.label}: todos</option>
                {c.opcoes?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          ))}
          <span className="text-xs text-muted-foreground">
            {visiveis.length} de {linhas.length}
          </span>
        </div>
      ) : null}

      {linhas.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {vazio}
        </p>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  {colunas.map((c) => (
                    <th key={c.name} className="px-4 py-2 font-medium">
                      {c.label}
                    </th>
                  ))}
                  {def.rastreio ? (
                    <th className="px-4 py-2 font-medium">Última alteração</th>
                  ) : null}
                  <th className="w-24 px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {visiveis.map((l) => (
                  <tr key={l.id} className="align-top">
                    {colunas.map((c) => (
                      <td key={c.name} className="px-4 py-3">
                        {exibir(c, l)}
                      </td>
                    ))}
                    {def.rastreio ? (
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {l.alterado_por
                          ? nomePessoa.get(l.alterado_por) ?? "—"
                          : "—"}
                        <br />
                        {formatarDataHora(l.updated_at)}
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar"
                          onClick={() => abrirEdicao(l)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        {podeExcluir ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Excluir"
                            onClick={() => excluir(l)}
                            disabled={pendente}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
