"use client";

import { Select } from "@/components/ui/select";
import { useDialogo } from "@/components/shared/dialogo-provider";

import { useState, useTransition } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  salvarSenhaAcesso,
  excluirSenhaAcesso,
  revelarSenhaAcesso,
} from "./senhas-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface AcessoView {
  id: string;
  servico: string;
  url: string | null;
  usuario: string | null;
  observacoes: string | null;
  temSenha: boolean;
  criadoPor: string | null;
  dono: string;
  donoNaPlanilha: boolean;
}

const VAZIO = { servico: "", url: "", usuario: "", senha: "", observacoes: "" };

export function SenhasCofre({
  acessos,
  ehGerente,
  meuId,
}: {
  acessos: AcessoView[];
  ehGerente: boolean;
  meuId: string;
}) {
  const [filtro, setFiltro] = useState("");
  const pessoas = Array.from(
    new Map(acessos.map((a) => [a.dono, a.dono])).entries()
  ).sort((x, y) => x[1].localeCompare(y[1], "pt-BR"));
  const visiveis = filtro === "" ? acessos : acessos.filter((a) => a.dono === filtro);
  const podeMexer = (a: AcessoView) => ehGerente || a.criadoPor === meuId;
  const [editando, setEditando] = useState<string | "novo" | null>(null);
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [revelada, setRevelada] = useState<Record<string, string>>({});
  const [copiado, setCopiado] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const { confirmar, avisar } = useDialogo();

  function abrirNovo() {
    setForm(VAZIO);
    setErro(null);
    setEditando("novo");
  }

  function abrirEdicao(a: AcessoView) {
    setForm({
      servico: a.servico,
      url: a.url ?? "",
      usuario: a.usuario ?? "",
      senha: "",
      observacoes: a.observacoes ?? "",
    });
    setErro(null);
    setEditando(a.id);
  }

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const res = await salvarSenhaAcesso(
        editando === "novo" ? null : editando,
        form
      );
      if (res.erro) setErro(res.erro);
      else {
        setEditando(null);
        setRevelada({});
      }
    });
  }

  async function excluir(a: AcessoView) {
    const ok = await confirmar({
      titulo: "Excluir este acesso?",
      descricao: a.servico + "\n\nA senha guardada será apagada.",
      confirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await excluirSenhaAcesso(a.id);
      if (res.erro) void avisar(res.erro, "Não foi possível excluir");
    });
  }

  function alternar(a: AcessoView) {
    if (revelada[a.id] !== undefined) {
      setRevelada((r) => {
        const { [a.id]: _removido, ...resto } = r;
        void _removido;
        return resto;
      });
      return;
    }
    startTransition(async () => {
      const res = await revelarSenhaAcesso(a.id);
      if (res.erro) void avisar(res.erro, "Não foi possível revelar");
      else if (res.senha !== undefined) {
        setRevelada((r) => ({ ...r, [a.id]: res.senha as string }));
      }
    });
  }

  function copiar(a: AcessoView) {
    startTransition(async () => {
      const texto =
        revelada[a.id] ?? (await revelarSenhaAcesso(a.id)).senha ?? "";
      if (!texto) return;
      try {
        await navigator.clipboard.writeText(texto);
        setCopiado(a.id);
        setTimeout(() => setCopiado(null), 2000);
      } catch {
        void avisar("Não foi possível copiar. Use o botão de revelar.", "Copiar senha");
      }
    });
  }

  return (
    <div className="space-y-4">
      {editando === null ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            aria-label="Filtrar por usuário"
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Todos os usuários ({acessos.length})</option>
            {pessoas.map(([id, nome]) => (
              <option key={id} value={id}>
                {nome} ({acessos.filter((a) => a.dono === id).length})
              </option>
            ))}
          </Select>
          <Button onClick={abrirNovo}>
            <Plus className="size-4" /> Novo acesso
          </Button>
        </div>
      ) : null}

      {editando !== null ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                {editando === "novo" ? "Novo acesso" : "Editar acesso"}
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
              <div className="space-y-1.5">
                <Label htmlFor="sn-servico">Serviço *</Label>
                <Input
                  id="sn-servico"
                  value={form.servico}
                  onChange={(e) => setForm({ ...form, servico: e.target.value })}
                  placeholder="Ex.: RD Station, Instagram, Hospedagem"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sn-url">URL</Label>
                <Input
                  id="sn-url"
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sn-usuario">Usuário / e-mail</Label>
                <Input
                  id="sn-usuario"
                  value={form.usuario}
                  onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sn-senha">
                  Senha {editando === "novo" ? "*" : "(deixe vazio para manter)"}
                </Label>
                <Input
                  id="sn-senha"
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="sn-obs">Observações</Label>
                <Textarea
                  id="sn-obs"
                  value={form.observacoes}
                  onChange={(e) =>
                    setForm({ ...form, observacoes: e.target.value })
                  }
                />
              </div>
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
      ) : null}

      {acessos.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum acesso cadastrado. Clique em Novo acesso para começar.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visiveis.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{a.servico}</h3>
                  <div className="flex shrink-0 gap-1">
                    {a.url ? (
                      <Button asChild variant="ghost" size="icon">
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Abrir site"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      </Button>
                    ) : null}
                    {podeMexer(a) ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar"
                          onClick={() => abrirEdicao(a)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir"
                          onClick={() => excluir(a)}
                          disabled={pendente}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>

                <dl className="space-y-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-muted-foreground">Usuário</dt>
                    <dd className="break-all">{a.usuario ?? "—"}</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <dt className="w-16 shrink-0 text-muted-foreground">Senha</dt>
                    <dd className="flex min-w-0 flex-1 items-center gap-1">
                      <span className="break-all font-mono">
                        {!a.temSenha
                          ? "—"
                          : revelada[a.id] !== undefined
                            ? revelada[a.id]
                            : "••••••••"}
                      </span>
                      {a.temSenha ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            aria-label={
                              revelada[a.id] !== undefined
                                ? "Ocultar senha"
                                : "Mostrar senha"
                            }
                            onClick={() => alternar(a)}
                            disabled={pendente}
                          >
                            {revelada[a.id] !== undefined ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            aria-label="Copiar senha"
                            onClick={() => copiar(a)}
                            disabled={pendente}
                          >
                            {copiado === a.id ? (
                              <Check className="size-4 text-emerald-600" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </Button>
                        </>
                      ) : null}
                    </dd>
                  </div>
                </dl>

                {!a.donoNaPlanilha ? (
                  <p className="text-xs text-muted-foreground">Cadastrado por {a.dono}</p>
                ) : null}
                {a.observacoes ? (
                  <p className="whitespace-pre-line text-xs text-muted-foreground">
                    {a.observacoes}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
