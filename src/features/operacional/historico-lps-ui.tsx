"use client";

import { useEffect, useState } from "react";
import { History, Loader2, MessageSquarePlus, Plus, Pencil, Trash2 } from "lucide-react";
import { adicionarNotaLp, historicoDaLp } from "./historico-lps-actions";
import { ROTULO_ACAO_LP, type AcaoHistoricoLp, type EntradaHistoricoLp } from "./historico-lps";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const COR_ACAO: Record<AcaoHistoricoLp, string> = {
  criada: "bg-emerald-100 text-emerald-900",
  alterada: "bg-blue-100 text-blue-900",
  excluida: "bg-red-100 text-red-900",
  anotacao: "bg-amber-100 text-amber-900",
};
const ICONE_ACAO = { criada: Plus, alterada: Pencil, excluida: Trash2, anotacao: MessageSquarePlus } as const;

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function Entrada({ e, mostrarNome }: { e: EntradaHistoricoLp; mostrarNome: boolean }) {
  const Icone = ICONE_ACAO[e.acao];
  return (
    <li className="space-y-1.5 rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold", COR_ACAO[e.acao])}>
          <Icone className="size-3" /> {ROTULO_ACAO_LP[e.acao]}
        </span>
        {mostrarNome ? <strong>{e.nome}</strong> : null}
        <span className="text-xs text-muted-foreground">
          {dataHora(e.criadoEm)} · {e.autorNome ?? "Alguém"}
        </span>
      </div>
      {e.acao === "alterada" && e.alteracoes.length > 0 ? (
        <ul className="space-y-0.5 text-xs">
          {e.alteracoes.map((a) => (
            <li key={a.campo}>
              <span className="font-medium">{a.rotulo}:</span>{" "}
              <span className="text-muted-foreground line-through">{a.de ?? "vazio"}</span>
              {" → "}
              <span className="font-medium">{a.para ?? "vazio"}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {e.nota ? <p className="whitespace-pre-line text-sm">{e.nota}</p> : null}
      {e.acao === "criada" ? <p className="text-xs text-muted-foreground">Landing page cadastrada.</p> : null}
      {e.acao === "excluida" ? <p className="text-xs text-muted-foreground">Landing page removida da lista.</p> : null}
    </li>
  );
}

/** Histórico de modificações de uma LP, mostrado dentro da edição (lápis). */
export function HistoricoDaLp({ lpId }: { lpId: string }) {
  const [dados, setDados] = useState<{ itens: EntradaHistoricoLp[]; indisponivel?: boolean } | null>(null);
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vivo = true;
    void historicoDaLp(lpId).then((r) => vivo && setDados(r));
    return () => {
      vivo = false;
    };
  }, [lpId, recarga]);

  async function anotar() {
    setErro(null);
    setSalvando(true);
    const r = await adicionarNotaLp(lpId, nota);
    setSalvando(false);
    if (r.erro) return setErro(r.erro);
    setNota("");
    setRecarga((n) => n + 1);
  }

  return (
    <div className="space-y-2 border-t pt-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <History className="size-4" /> Histórico de modificações
      </h3>
      <div className="space-y-2 rounded-md bg-muted/50 p-3">
        <Textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Registrar uma alteração ou observação (ex.: budget aumentado para R$ 5.000, campanha pausada…)"
          aria-label="Anotação no histórico"
        />
        {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={anotar} disabled={salvando || !nota.trim()}>
            {salvando ? <Loader2 className="size-4 animate-spin" /> : <MessageSquarePlus className="size-4" />} Registrar no histórico
          </Button>
        </div>
      </div>
      {dados === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Carregando…
        </p>
      ) : dados.indisponivel ? (
        <p className="text-sm text-muted-foreground">O histórico ainda não foi ativado no banco (migration 0057).</p>
      ) : dados.itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma modificação registrada ainda. As próximas edições aparecem aqui.</p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {dados.itens.map((e) => (
            <Entrada key={e.id} e={e} mostrarNome={false} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Aba Histórico: movimentações e mudanças de todas as landing pages. */
export function HistoricoGeralLps({ itens, indisponivel }: { itens: EntradaHistoricoLp[]; indisponivel?: boolean }) {
  const [busca, setBusca] = useState("");
  const [acao, setAcao] = useState("");

  if (indisponivel) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        O histórico ainda não foi ativado no banco (migration 0057).
      </p>
    );
  }

  const termo = busca.trim().toLowerCase();
  const visiveis = itens.filter(
    (e) =>
      (!acao || e.acao === acao) &&
      (!termo ||
        e.nome.toLowerCase().includes(termo) ||
        (e.nota ?? "").toLowerCase().includes(termo) ||
        (e.autorNome ?? "").toLowerCase().includes(termo) ||
        e.alteracoes.some((a) => (a.rotulo + " " + (a.de ?? "") + " " + (a.para ?? "")).toLowerCase().includes(termo)))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar LP, pessoa ou campo…" className="h-9 w-64" aria-label="Buscar" />
        <div className="w-40">
          <Select value={acao} onChange={(e) => setAcao(e.target.value)} aria-label="Tipo de movimentação" className="h-9">
            <option value="">Todas as ações</option>
            <option value="criada">Criadas</option>
            <option value="alterada">Alteradas</option>
            <option value="excluida">Excluídas</option>
            <option value="anotacao">Anotações</option>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground">
          {visiveis.length} de {itens.length}
        </span>
      </div>
      {visiveis.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {itens.length === 0
            ? "Nenhuma movimentação registrada ainda. Criações, edições e exclusões de landing pages passam a aparecer aqui."
            : "Nada encontrado com esse filtro."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visiveis.map((e) => (
            <Entrada key={e.id} e={e} mostrarNome />
          ))}
        </ul>
      )}
    </div>
  );
}
