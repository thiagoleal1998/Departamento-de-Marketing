"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarClock, ClipboardList, ExternalLink, FileText, Link2, Loader2, UserRound } from "lucide-react";
import { atualizarStatusSolicitacao, dadosSolicitacao } from "./solicitacoes-actions";
import {
  STATUS_SOLICITACAO_ROTULO,
  metaDoTipo,
  type SolicitacaoView,
  type StatusSolicitacao,
} from "./solicitacao-tipos";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const COR_STATUS: Record<StatusSolicitacao, string> = {
  solicitada: "bg-amber-100 text-amber-900",
  em_andamento: "bg-blue-100 text-blue-900",
  concluida: "bg-emerald-100 text-emerald-900",
  cancelada: "bg-muted text-muted-foreground",
};

const dataBr = (iso: string | null) => (iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : null);

/** Cartão da solicitação de criação dentro da conversa (dados do pedido, print e andamento). */
export function SolicitacaoCard({ id, versao, minha }: { id: string; versao: number; minha: boolean }) {
  const [s, setS] = useState<SolicitacaoView | null | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();

  useEffect(() => {
    let vivo = true;
    void dadosSolicitacao(id).then((r) => vivo && setS(r));
    return () => {
      vivo = false;
    };
  }, [id, versao]);

  if (s === undefined) return null;
  if (s === null) return <p className="mt-1.5 text-xs opacity-80">Solicitação indisponível.</p>;

  function mudar(status: StatusSolicitacao) {
    setErro(null);
    start(async () => {
      const r = await atualizarStatusSolicitacao(id, status);
      if (r.erro) setErro(r.erro);
    });
  }

  const meta = metaDoTipo(s.tipo);

  return (
    <div className={cn("mt-1.5 space-y-2 rounded-lg border p-3 text-xs", minha ? "border-white/30 bg-white/10" : "bg-background")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-80">
          <ClipboardList className="size-3.5" /> Solicitação · {meta.rotulo}
        </span>
        <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", COR_STATUS[s.status])}>
          {STATUS_SOLICITACAO_ROTULO[s.status]}
        </span>
      </div>

      <p className="text-sm font-semibold leading-snug">{s.produto}</p>

      <dl className="grid gap-x-3 gap-y-1 sm:grid-cols-2">
        <div className="flex items-center gap-1.5">
          <UserRound className="size-3.5 shrink-0" />
          <span>
            <span className="opacity-70">Solicitado por: </span>
            <strong>{s.solicitante}</strong>
          </span>
        </div>
        {s.prazo ? (
          <div className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5 shrink-0" />
            <span>
              <span className="opacity-70">Prazo: </span>
              <strong>{dataBr(s.prazo)}</strong>
            </span>
          </div>
        ) : null}
        {s.linkReferencia ? (
          <div className="flex items-center gap-1.5 sm:col-span-2">
            <Link2 className="size-3.5 shrink-0" />
            <a href={s.linkReferencia} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate font-medium underline underline-offset-2">
              {s.linkReferencia.replace(/^https?:\/\//, "")}
            </a>
          </div>
        ) : null}
      </dl>

      {s.detalhes ? <p className="whitespace-pre-line opacity-90">{s.detalhes}</p> : null}

      {s.provaUrl ? (
        <a href={s.provaUrl} target="_blank" rel="noopener noreferrer" className="block space-y-1" title="Abrir o print em tamanho real">
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">
            Print de prova <ExternalLink className="size-3" />
          </span>
          {s.provaEhImagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.provaUrl} alt={"Print de prova: " + (s.provaNome ?? "solicitação")} className="max-h-48 rounded-md border object-contain" />
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-medium">
              <FileText className="size-4" /> {s.provaNome ?? "Abrir arquivo"}
            </span>
          )}
        </a>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-current/10 pt-2">
        <span className="opacity-70">
          Pedido registrado por {s.criadoPorNome ?? "—"} em {new Date(s.criadoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        </span>
        <span className="flex items-center gap-1.5 text-foreground">
          {pendente ? <Loader2 className="size-3.5 animate-spin" /> : null}
          <Select
            value={s.status}
            onChange={(e) => mudar(e.target.value as StatusSolicitacao)}
            disabled={pendente}
            aria-label="Andamento da solicitação"
            className="h-8 w-40 text-xs"
          >
            {(Object.keys(STATUS_SOLICITACAO_ROTULO) as StatusSolicitacao[]).map((k) => (
              <option key={k} value={k}>
                {STATUS_SOLICITACAO_ROTULO[k]}
              </option>
            ))}
          </Select>
        </span>
      </div>
      {erro ? <p className="text-destructive">{erro}</p> : null}
    </div>
  );
}
