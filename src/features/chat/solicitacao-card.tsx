"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarClock, ClipboardList, ExternalLink, FileText, Link2, Loader2, Pencil, UserRound, X } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { SolicitacaoForm } from "./solicitacao-form";
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
export function SolicitacaoCard({
  id,
  versao,
  minha,
  conversaId,
  meuNome,
  pessoas,
}: {
  id: string;
  versao: number;
  minha: boolean;
  conversaId: string;
  meuNome: string;
  pessoas: { id: string; nome: string }[];
}) {
  const [s, setS] = useState<SolicitacaoView | null | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [ampliada, setAmpliada] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [pendente, start] = useTransition();

  useEffect(() => {
    let vivo = true;
    void dadosSolicitacao(id).then((r) => vivo && setS(r));
    return () => {
      vivo = false;
    };
  }, [id, versao, recarga]);

  // Quando alguém edita ou muda o andamento, o cartão atualiza na hora para todos.
  useEffect(() => {
    const supabase = criarClienteBrowser();
    const canal = supabase
      .channel("solicitacao-" + id)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_solicitacoes", filter: "id=eq." + id }, () =>
        setRecarga((n) => n + 1)
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [id]);

  useEffect(() => {
    if (!ampliada) return;
    const aoTecla = (e: KeyboardEvent) => e.key === "Escape" && setAmpliada(false);
    document.addEventListener("keydown", aoTecla);
    return () => document.removeEventListener("keydown", aoTecla);
  }, [ampliada]);

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
        <span className="flex items-center gap-1.5">
          {s.editadoEm ? (
            <span
              className="text-[11px] italic opacity-70"
              title={"Editado em " + new Date(s.editadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
            >
              Editado
            </span>
          ) : null}
          {s.podeEditar ? (
            <button
              type="button"
              onClick={() => setEditando(true)}
              aria-label="Editar solicitação"
              title="Editar solicitação"
              className="rounded p-1 hover:bg-black/10"
            >
              <Pencil className="size-3.5" />
            </button>
          ) : null}
          <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", COR_STATUS[s.status])}>
            {STATUS_SOLICITACAO_ROTULO[s.status]}
          </span>
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
        s.provaEhImagem ? (
          <button type="button" onClick={() => setAmpliada(true)} className="block space-y-1 text-left" title="Ampliar o print">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">Print de prova</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.provaUrl} alt={"Print de prova: " + (s.provaNome ?? "solicitação")} className="max-h-48 cursor-zoom-in rounded-md border object-contain" />
          </button>
        ) : (
          <a href={s.provaUrl} target="_blank" rel="noopener noreferrer" className="block space-y-1" title="Abrir o arquivo">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">
              Print de prova <ExternalLink className="size-3" />
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-medium">
              <FileText className="size-4" /> {s.provaNome ?? "Abrir arquivo"}
            </span>
          </a>
        )
      ) : null}

      {ampliada && s.provaUrl ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 text-white"
          role="dialog"
          aria-modal="true"
          aria-label="Print de prova ampliado"
          onClick={() => setAmpliada(false)}
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setAmpliada(false)}
            className="absolute right-4 top-4 rounded-full bg-white/15 p-2 hover:bg-white/25"
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.provaUrl}
            alt={"Print de prova: " + (s.provaNome ?? "solicitação")}
            className="max-h-full max-w-full rounded-md object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}

      {editando ? (
        <SolicitacaoForm
          conversaId={conversaId}
          meuNome={meuNome}
          pessoas={pessoas}
          edicao={s}
          aoFechar={() => {
            setEditando(false);
            setRecarga((n) => n + 1);
          }}
        />
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
