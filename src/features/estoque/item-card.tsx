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
  Trash2,
} from "lucide-react";
import { arquivarItemEstoque, registrarMovimento } from "./actions";
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

  const baixo = item.quantidade <= item.estoque_minimo;

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
              <h3 className="truncate font-semibold leading-tight">{item.nome}</h3>
              <Badge variant="secondary">{CATEGORIA_LABEL[item.categoria]}</Badge>
            </div>
            {item.local ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" /> {item.local}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              Mínimo: {item.estoque_minimo}
            </p>
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
