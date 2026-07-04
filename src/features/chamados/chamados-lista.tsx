"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, Search, AlertCircle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ChamadoStatusBadge,
  ChamadoPrioridadeBadge,
} from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatarData } from "@/lib/utils";
import {
  CHAMADO_STATUS_META,
  CHAMADO_STATUS_FLUXO,
  CHAMADO_TIPO_LABEL,
  type ChamadoStatus,
  type ChamadoPrioridade,
  type ChamadoTipo,
} from "@/types";

export interface ChamadoView {
  id: string;
  numero: number;
  titulo: string;
  tipo: ChamadoTipo;
  prioridade: ChamadoPrioridade;
  status: ChamadoStatus;
  departamento: string | null;
  segmento: string | null;
  solicitante_nome: string;
  responsavel_nome: string | null;
  prazo_sla: string | null;
  created_at: string;
}

function prazoAtrasado(prazo: string | null, status: ChamadoStatus) {
  if (!prazo) return false;
  if (status === "resolvido" || status === "fechado") return false;
  return new Date(prazo).getTime() < Date.now();
}

function LinhaChamado({ c }: { c: ChamadoView }) {
  const atrasado = prazoAtrasado(c.prazo_sla, c.status);
  return (
    <Link
      href={`/chamados/${c.id}`}
      className="block rounded-lg border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">
          <span className="text-muted-foreground">#{c.numero}</span> {c.titulo}
        </p>
        <ChamadoPrioridadeBadge prioridade={c.prioridade} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{CHAMADO_TIPO_LABEL[c.tipo]}</span>
        {c.departamento ? (
          <>
            <span>•</span>
            <span>{c.departamento}</span>
          </>
        ) : null}
        {c.segmento ? (
          <>
            <span>•</span>
            <span>{c.segmento}</span>
          </>
        ) : null}
        <span>•</span>
        <span>{c.responsavel_nome ?? "Sem responsável"}</span>
        {c.prazo_sla ? (
          <>
            <span>•</span>
            <span
              className={
                atrasado ? "flex items-center gap-1 font-medium text-destructive" : ""
              }
            >
              {atrasado ? <AlertCircle className="size-3" /> : null}
              Prazo {formatarData(c.prazo_sla)}
            </span>
          </>
        ) : null}
      </div>
    </Link>
  );
}

const SITUACAO_LABEL: Record<string, string> = {
  abertos: "Em aberto",
  em_andamento: "Em andamento",
  resolvidos: "Resolvidos / fechados",
};

function passaSituacao(c: ChamadoView, situacao: string): boolean {
  const finalizado = c.status === "resolvido" || c.status === "fechado";
  if (situacao === "abertos") return !finalizado;
  if (situacao === "resolvidos") return finalizado;
  if (situacao === "em_andamento") return c.status === "em_andamento";
  return true;
}

export function ChamadosLista({
  chamados,
  situacaoInicial = "",
}: {
  chamados: ChamadoView[];
  situacaoInicial?: string;
}) {
  const [visao, setVisao] = useState<"lista" | "board">("lista");
  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState<string>("");
  const [fPrioridade, setFPrioridade] = useState<string>("");
  const [fTipo, setFTipo] = useState<string>("");
  const [situacao, setSituacao] = useState<string>(
    SITUACAO_LABEL[situacaoInicial] ? situacaoInicial : ""
  );

  const filtrados = useMemo(() => {
    return chamados.filter((c) => {
      if (situacao && !passaSituacao(c, situacao)) return false;
      if (fStatus && c.status !== fStatus) return false;
      if (fPrioridade && c.prioridade !== fPrioridade) return false;
      if (fTipo && c.tipo !== fTipo) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (
          !c.titulo.toLowerCase().includes(q) &&
          !String(c.numero).includes(q)
        )
          return false;
      }
      return true;
    });
  }, [chamados, situacao, fStatus, fPrioridade, fTipo, busca]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou número..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
            <Select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              className="lg:w-40"
            >
              <option value="">Todos status</option>
              {CHAMADO_STATUS_FLUXO.map((s) => (
                <option key={s} value={s}>
                  {CHAMADO_STATUS_META[s].label}
                </option>
              ))}
            </Select>
            <Select
              value={fPrioridade}
              onChange={(e) => setFPrioridade(e.target.value)}
              className="lg:w-36"
            >
              <option value="">Prioridade</option>
              <option value="urgente">Urgente</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </Select>
            <Select
              value={fTipo}
              onChange={(e) => setFTipo(e.target.value)}
              className="lg:w-40"
            >
              <option value="">Todos tipos</option>
              {Object.entries(CHAMADO_TIPO_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-1 rounded-lg border p-1">
            <Button
              type="button"
              variant={visao === "lista" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setVisao("lista")}
              title="Lista"
            >
              <List className="size-4" />
            </Button>
            <Button
              type="button"
              variant={visao === "board" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setVisao("board")}
              title="Board"
            >
              <LayoutGrid className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {situacao ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrando por:</span>
          <button
            type="button"
            onClick={() => setSituacao("")}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            {SITUACAO_LABEL[situacao]}
            <X className="size-3" />
          </button>
        </div>
      ) : null}

      {filtrados.length === 0 ? (
        <EmptyState
          titulo="Nenhum chamado encontrado"
          descricao="Ajuste os filtros ou abra um novo chamado."
        />
      ) : visao === "lista" ? (
        <div className="space-y-2">
          {filtrados.map((c) => (
            <LinhaChamado key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CHAMADO_STATUS_FLUXO.map((status) => {
            const doStatus = filtrados.filter((c) => c.status === status);
            return (
              <div key={status} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <ChamadoStatusBadge status={status} />
                  <span className="text-xs text-muted-foreground">
                    {doStatus.length}
                  </span>
                </div>
                <div className="space-y-2 rounded-lg bg-muted/40 p-2 min-h-16">
                  {doStatus.map((c) => (
                    <LinhaChamado key={c.id} c={c} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
