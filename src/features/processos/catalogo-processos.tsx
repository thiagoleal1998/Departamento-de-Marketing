"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/shared/link";
import { AlertTriangle, CalendarClock, LayoutGrid, List, Loader2, Pencil, Plus, Search, Settings2, Trash2, X } from "lucide-react";
import { criarProcesso, excluirMacroprocesso, salvarMacroprocesso } from "./actions";
import { STATUS_PROCESSO, type Macroprocesso, type StatusProcesso } from "./tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDialogo } from "@/components/shared/dialogo-provider";
import { cn } from "@/lib/utils";

export interface ProcessoResumo {
  id: string;
  codigo: string;
  nome: string;
  macroId: string | null;
  macroNome: string | null;
  status: StatusProcesso;
  versao: number;
  responsavelId: string | null;
  responsavelNome: string | null;
  etapas: number;
  pendencias: number;
  proximaRevisao: string | null;
  revisaoVencida: boolean;
}

function SeloStatus({ status }: { status: StatusProcesso }) {
  const s = STATUS_PROCESSO[status];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset", s.classe)}>{s.rotulo}</span>;
}

const dataBr = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

function NovoProcesso({ macros, aoFechar }: { macros: Macroprocesso[]; aoFechar: () => void }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [macro, setMacro] = useState(macros[0]?.id ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();
  return (
    <form
      className="space-y-3 rounded-xl border bg-card p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        start(async () => {
          const r = await criarProcesso(nome, macro || null);
          if (r.erro || !r.id) setErro(r.erro ?? "Não foi possível criar.");
          else router.push(`/gestao/processos/${r.id}`);
        });
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Novo processo</h3>
        <button type="button" onClick={aoFechar} aria-label="Fechar" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_16rem_auto]">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do processo (ex.: Criação de peças gráficas)" maxLength={150} required aria-label="Nome do processo" />
        <Select value={macro} onChange={(e) => setMacro(e.target.value)} aria-label="Macroprocesso">
          <option value="">Sem macroprocesso</option>
          {macros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </Select>
        <Button type="submit" disabled={pendente || !nome.trim()}>
          {pendente ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Criar e abrir
        </Button>
      </div>
      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
      <p className="text-xs text-muted-foreground">O processo nasce como rascunho, com um fluxo contendo Início e Fim. O código (ex.: MKT-COM-002) é gerado sozinho.</p>
    </form>
  );
}

function GerirMacros({ macros, contagem }: { macros: Macroprocesso[]; contagem: Map<string, number> }) {
  const router = useRouter();
  const { confirmar, avisar } = useDialogo();
  const [editando, setEditando] = useState<string | "novo" | null>(null);
  const [f, setF] = useState({ nome: "", sigla: "", descricao: "" });
  const [pendente, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function abrir(m: Macroprocesso | null) {
    setEditando(m?.id ?? "novo");
    setF({ nome: m?.nome ?? "", sigla: m?.sigla ?? "", descricao: m?.descricao ?? "" });
    setErro(null);
  }
  function salvar() {
    start(async () => {
      const r = await salvarMacroprocesso(editando === "novo" ? null : editando, f.nome, f.sigla, f.descricao);
      if (r.erro) setErro(r.erro);
      else {
        setEditando(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Macroprocessos</h3>
          <p className="text-xs text-muted-foreground">Grandes áreas de atuação. São sugestões iniciais: renomeie, acrescente ou remova conforme o departamento.</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => abrir(null)}>
          <Plus className="size-3.5" /> Novo
        </Button>
      </div>
      {editando ? (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
            <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Nome" aria-label="Nome do macroprocesso" />
            <Input value={f.sigla} onChange={(e) => setF({ ...f, sigla: e.target.value })} placeholder="Sigla (COM)" maxLength={4} aria-label="Sigla" />
          </div>
          <Input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="Processos que reúne (opcional)" aria-label="Descrição" />
          {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={salvar} disabled={pendente}>
              {pendente ? <Loader2 className="size-3.5 animate-spin" /> : null} Salvar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
      <ul className="divide-y">
        {macros.map((m, i) => (
          <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="w-6 text-xs text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            <span className="min-w-0 flex-1">
              <span className="font-medium">{m.nome}</span> <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{m.sigla}</span>
              {m.descricao ? <span className="block truncate text-xs text-muted-foreground">{m.descricao}</span> : null}
            </span>
            <span className="text-xs text-muted-foreground">{contagem.get(m.id) ?? 0} processo(s)</span>
            <button type="button" aria-label={`Editar ${m.nome}`} onClick={() => abrir(m)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Excluir ${m.nome}`}
              onClick={async () => {
                if (!(await confirmar({ titulo: "Excluir este macroprocesso?", descricao: m.nome, confirmar: "Excluir", perigo: true }))) return;
                const r = await excluirMacroprocesso(m.id);
                if (r.erro) void avisar(r.erro, "Não foi possível excluir");
                else router.refresh();
              }}
              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Catálogo: lista ou cards, com pesquisa e filtros por macroprocesso, responsável e status. */
export function CatalogoProcessos({ processos, macros, editavel }: { processos: ProcessoResumo[]; macros: Macroprocesso[]; editavel: boolean }) {
  const [busca, setBusca] = useState("");
  const [macro, setMacro] = useState("");
  const [status, setStatus] = useState("");
  const [resp, setResp] = useState("");
  const [modo, setModo] = useState<"cards" | "lista">("cards");
  const [novo, setNovo] = useState(false);
  const [gerir, setGerir] = useState(false);

  const responsaveis = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of processos) if (p.responsavelId && p.responsavelNome) m.set(p.responsavelId, p.responsavelNome);
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [processos]);
  const contagem = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of processos) if (p.macroId) m.set(p.macroId, (m.get(p.macroId) ?? 0) + 1);
    return m;
  }, [processos]);

  const visiveis = processos.filter((p) => {
    const t = busca.trim().toLowerCase();
    return (
      (!t || p.nome.toLowerCase().includes(t) || p.codigo.toLowerCase().includes(t)) &&
      (!macro || (macro === "_sem" ? !p.macroId : p.macroId === macro)) &&
      (!status || p.status === status) &&
      (!resp || (resp === "_sem" ? !p.responsavelId : p.responsavelId === resp))
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou código…" className="h-9 w-64 pl-8" aria-label="Buscar processo" />
        </div>
        <Select value={macro} onChange={(e) => setMacro(e.target.value)} aria-label="Macroprocesso" className="h-9 px-3">
          <option value="">Todos os macroprocessos</option>
          {macros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
          <option value="_sem">Sem macroprocesso</option>
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" className="h-9 px-3">
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_PROCESSO) as StatusProcesso[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_PROCESSO[s].rotulo}
            </option>
          ))}
        </Select>
        <Select value={resp} onChange={(e) => setResp(e.target.value)} aria-label="Responsável" className="h-9 px-3">
          <option value="">Todos os responsáveis</option>
          {responsaveis.map(([id, nome]) => (
            <option key={id} value={id}>
              {nome}
            </option>
          ))}
          <option value="_sem">Sem responsável</option>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-md border p-0.5">
            <Button type="button" variant={modo === "cards" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5" onClick={() => setModo("cards")}>
              <LayoutGrid className="size-4" /> Cards
            </Button>
            <Button type="button" variant={modo === "lista" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5" onClick={() => setModo("lista")}>
              <List className="size-4" /> Lista
            </Button>
          </div>
          {editavel ? (
            <>
              <Button type="button" variant="outline" className="h-9" onClick={() => setGerir((v) => !v)}>
                <Settings2 className="size-4" /> Macroprocessos
              </Button>
              <Button type="button" className="h-9" onClick={() => setNovo(true)}>
                <Plus className="size-4" /> Novo processo
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {novo ? <NovoProcesso macros={macros} aoFechar={() => setNovo(false)} /> : null}
      {gerir ? <GerirMacros macros={macros} contagem={contagem} /> : null}

      <p className="text-xs text-muted-foreground">
        {visiveis.length} de {processos.length} processo(s)
      </p>

      {visiveis.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{processos.length === 0 ? "Nenhum processo cadastrado ainda." : "Nenhum processo com esses filtros."}</p>
      ) : modo === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((p) => (
            <Link key={p.id} href={`/gestao/processos/${p.id}`} className="group flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">{p.codigo}</span>
                <SeloStatus status={p.status} />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-semibold leading-snug group-hover:underline">{p.nome}</h3>
                <p className="text-xs text-muted-foreground">{p.macroNome ?? "Sem macroprocesso"}</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="text-muted-foreground">Responsável</dt>
                <dd className={cn("truncate", !p.responsavelNome && "text-amber-700 dark:text-amber-400")}>{p.responsavelNome ?? "Não definido"}</dd>
                <dt className="text-muted-foreground">Etapas</dt>
                <dd>{p.etapas}</dd>
                <dt className="text-muted-foreground">Versão</dt>
                <dd>v{p.versao}</dd>
              </dl>
              <div className="mt-auto flex flex-wrap gap-1.5 text-[11px]">
                {p.pendencias > 0 && p.status !== "publicado" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="size-3" /> {p.pendencias} pendência(s) para publicar
                  </span>
                ) : null}
                {p.revisaoVencida ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 font-medium text-red-700 dark:text-red-300">
                    <CalendarClock className="size-3" /> Revisão vencida
                  </span>
                ) : p.proximaRevisao ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                    <CalendarClock className="size-3" /> Revisar até {dataBr(p.proximaRevisao)}
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Processo</th>
                <th className="px-3 py-2 font-medium">Macroprocesso</th>
                <th className="px-3 py-2 font-medium">Responsável</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Etapas</th>
                <th className="px-3 py-2 font-medium">Próxima revisão</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-accent/40">
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.codigo}</td>
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/gestao/processos/${p.id}`} className="hover:underline">
                      {p.nome}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{p.macroNome ?? "—"}</td>
                  <td className={cn("px-3 py-2", !p.responsavelNome && "text-amber-700 dark:text-amber-400")}>{p.responsavelNome ?? "Não definido"}</td>
                  <td className="px-3 py-2">
                    <SeloStatus status={p.status} />
                  </td>
                  <td className="px-3 py-2 tabular-nums">{p.etapas}</td>
                  <td className={cn("px-3 py-2 text-xs", p.revisaoVencida ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground")}>{p.proximaRevisao ? dataBr(p.proximaRevisao) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
