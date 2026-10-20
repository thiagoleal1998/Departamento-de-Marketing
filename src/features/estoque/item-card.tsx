"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Trash2,
} from "lucide-react";
import { arquivarItemEstoque, atualizarMinimoEstoque, registrarMovimento, renomearItemEstoque } from "./actions";
import type { OpcaoVinculo } from "./data";
import type { EstoqueItem } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

export const CATEGORIA_LABEL: Record<EstoqueItem["categoria"], string> = {
  brinde: "Brinde",
  flyer: "Flyer",
  banner: "Banner",
  outro: "Outro",
};

export function ItemCard({
  item,
  chamados,
  projetos,
  ehGerente,
}: {
  item: EstoqueItem;
  chamados: OpcaoVinculo[];
  projetos: OpcaoVinculo[];
  ehGerente: boolean;
}) {
  const [modo, setModo] = useState<"entrada" | "saida" | null>(null);
  const [qtd, setQtd] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [chamado, setChamado] = useState("");
  const [projeto, setProjeto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeEdit, setNomeEdit] = useState(item.nome);
  const [erroNome, setErroNome] = useState<string | null>(null);
  const [editandoMinimo, setEditandoMinimo] = useState(false);
  const [minimo, setMinimo] = useState(String(item.estoque_minimo));
  const [erroMinimo, setErroMinimo] = useState<string | null>(null);

  const baixo = item.quantidade <= item.estoque_minimo;

  function salvarNome() {
    setErroNome(null);
    startTransition(async () => {
      const res = await renomearItemEstoque(item.id, nomeEdit);
      if (res.erro) setErroNome(res.erro);
      else setEditandoNome(false);
    });
  }

  function salvarMinimo() {
    setErroMinimo(null);
    startTransition(async () => {
      const res = await atualizarMinimoEstoque(item.id, parseInt(minimo, 10));
      if (res.erro) setErroMinimo(res.erro);
      else setEditandoMinimo(false);
    });
  }

  function confirmar() {
    if (!modo) return;
    setErro(null);
    startTransition(async () => {
      const res = await registrarMovimento(
        item.id,
        modo,
        parseInt(qtd, 10),
        motivo,
        chamado,
        projeto
      );
      if (res.erro) {
        setErro(res.erro);
      } else {
        setModo(null);
        setQtd("1");
        setMotivo("");
        setChamado("");
        setProjeto("");
      }
    });
  }

  function arquivar() {
    if (!confirm(`Remover "${item.nome}" do estoque? O histórico é mantido.`)) return;
    startTransition(async () => {
      const res = await arquivarItemEstoque(item.id);
      if (res.erro) setErro(res.erro);
    });
  }

  return (
    <Card className={baixo ? "border-amber-300" : undefined}>
      <CardContent className="space-y-3 p-4">
        <div className="flex gap-3">
          {item.foto_url ? (
            <img
              src={item.foto_url}
              alt={item.nome}
              className="size-16 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Package className="size-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              {editandoNome ? (
                <div className="min-w-0 flex-1 space-y-1">
                  <Input
                    value={nomeEdit}
                    onChange={(e) => setNomeEdit(e.target.value)}
                    maxLength={120}
                    className="h-8 text-sm font-semibold"
                    aria-label="Novo nome do item"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") salvarNome();
                      if (e.key === "Escape") setEditandoNome(false);
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">A troca fica registrada no histórico do estoque.</p>
                  <div className="flex gap-1.5">
                    <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={salvarNome} disabled={pendente}>
                      {pendente ? <Loader2 className="size-3 animate-spin" /> : "Salvar nome"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditandoNome(false)}>
                      Cancelar
                    </Button>
                  </div>
                  {erroNome ? <p className="text-xs text-destructive">{erroNome}</p> : null}
                </div>
              ) : (
                <h3 className="flex min-w-0 items-center gap-1 font-semibold leading-tight">
                  <span className="truncate">{item.nome}</span>
                  {ehGerente ? (
                    <button
                      type="button"
                      onClick={() => {
                        setNomeEdit(item.nome);
                        setErroNome(null);
                        setEditandoNome(true);
                      }}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Renomear item"
                      aria-label={`Renomear ${item.nome}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  ) : null}
                </h3>
              )}
              <Badge variant="secondary">{CATEGORIA_LABEL[item.categoria]}</Badge>
            </div>
            {item.cor || item.descricao ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {[item.cor, item.descricao].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            {item.local ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" /> {item.local}
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              {editandoMinimo ? (
                <span className="flex items-center gap-1">
                  Mínimo:
                  <Input
                    type="number"
                    min={0}
                    value={minimo}
                    onChange={(e) => setMinimo(e.target.value)}
                    className="h-7 w-20 text-xs"
                    aria-label="Estoque mínimo"
                    autoFocus
                  />
                  <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={salvarMinimo} disabled={pendente}>
                    {pendente ? <Loader2 className="size-3 animate-spin" /> : "Salvar"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditandoMinimo(false)}>
                    Cancelar
                  </Button>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  Mínimo: {item.estoque_minimo}
                  {ehGerente ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMinimo(String(item.estoque_minimo));
                        setEditandoMinimo(true);
                      }}
                      className="rounded p-0.5 hover:bg-accent hover:text-foreground"
                      title="Editar estoque mínimo"
                      aria-label={`Editar o estoque mínimo de ${item.nome}`}
                    >
                      <Pencil className="size-3" />
                    </button>
                  ) : null}
                </span>
              )}
              {erroMinimo ? <span className="text-destructive">{erroMinimo}</span> : null}
              {item.danificados > 0 ? (
                <span className="ml-2 text-amber-600">
                  · {item.danificados} danificado(s)
                </span>
              ) : null}
            </div>
            {item.observacoes ? (
              <p className="mt-0.5 line-clamp-2 text-xs italic text-muted-foreground">
                {item.observacoes}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{item.quantidade}</span>
            <span className="text-xs text-muted-foreground">em estoque</span>
          </div>
          {baixo ? (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
              <AlertTriangle className="size-3.5" /> Estoque baixo
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={modo === "entrada" ? "default" : "outline"}
            onClick={() => setModo(modo === "entrada" ? null : "entrada")}
          >
            <ArrowDownToLine className="size-4" /> Entrada
          </Button>
          <Button
            size="sm"
            variant={modo === "saida" ? "default" : "outline"}
            onClick={() => setModo(modo === "saida" ? null : "saida")}
          >
            <ArrowUpFromLine className="size-4" /> Saída
          </Button>
          {ehGerente ? (
            <Button
              size="icon"
              variant="ghost"
              className="ml-auto"
              title="Remover item"
              aria-label={`Remover ${item.nome}`}
              onClick={arquivar}
              disabled={pendente}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>

        {modo ? (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                min={1}
                value={qtd}
                onChange={(e) => setQtd(e.target.value)}
                aria-label="Quantidade"
              />
              <Input
                className="col-span-2"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={modo === "saida" ? "Motivo / destino" : "Origem / observação"}
              />
            </div>
            {modo === "saida" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Select
                  value={chamado}
                  onChange={(e) => setChamado(e.target.value)}
                  aria-label="Chamado"
                >
                  <option value="">Sem chamado</option>
                  {chamados.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.rotulo}
                    </option>
                  ))}
                </Select>
                <Select
                  value={projeto}
                  onChange={(e) => setProjeto(e.target.value)}
                  aria-label="Projeto"
                >
                  <option value="">Sem projeto</option>
                  {projetos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.rotulo}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button size="sm" onClick={confirmar} disabled={pendente}>
                {pendente ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirmar {modo === "entrada" ? "entrada" : "saída"}
              </Button>
            </div>
          </div>
        ) : null}

        {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
      </CardContent>
    </Card>
  );
}
