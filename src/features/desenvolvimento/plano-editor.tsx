"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ExternalLink, FileText, ImageIcon, Loader2, Paperclip, Plus, Save, Trash2 } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { prepararEnvioPlano, salvarPlano } from "./plano-actions";
import {
  BUCKET_PLANOS,
  HORIZONTES,
  MAX_ANEXOS_PLANO,
  TIPOS_PLANO,
  type AnexoPlanoVisivel,
  type DadosPlano,
  type Horizonte,
  type ItemChecklist,
  type ObjetivoPlano,
  type Proficiencia,
} from "./plano-tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const novoId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const hoje = () => new Date().toISOString().slice(0, 10);

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-base font-semibold">{titulo}</h2>
        {descricao ? <p className="text-sm text-muted-foreground">{descricao}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Nota (0 a 10) e justificativa de uma etapa. Só a liderança edita; o colaborador lê. */
function NotaEtapa({
  nota,
  justificativa,
  podeEditar,
  aoMudar,
}: {
  nota: number | null;
  justificativa: string;
  podeEditar: boolean;
  aoMudar: (p: { nota?: number | null; justificativa?: string }) => void;
}) {
  if (!podeEditar && nota === null && !justificativa.trim()) return null;
  return (
    <div className="space-y-1.5 rounded-md border border-dashed bg-muted/30 p-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nota</span>
        {podeEditar ? (
          <Input
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={nota ?? ""}
            onChange={(e) => aoMudar({ nota: e.target.value === "" ? null : Math.min(10, Math.max(0, Number(e.target.value))) })}
            placeholder="0–10"
            aria-label="Nota da etapa"
            className="h-8 w-20 text-sm"
          />
        ) : (
          <span className="text-sm font-semibold">{nota === null ? "—" : String(nota).replace(".", ",")} / 10</span>
        )}
        {nota !== null ? (
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span className={cn("block h-full", corNota(nota))} style={{ width: `${(nota / 10) * 100}%` }} />
          </span>
        ) : null}
      </div>
      {podeEditar ? (
        <Textarea
          rows={2}
          value={justificativa}
          onChange={(e) => aoMudar({ justificativa: e.target.value })}
          placeholder="Justificativa da nota"
          aria-label="Justificativa da nota"
          className="min-h-[52px] bg-background text-sm"
        />
      ) : justificativa.trim() ? (
        <p className="whitespace-pre-wrap text-sm text-foreground/90">
          <span className="font-medium">Justificativa: </span>
          {justificativa}
        </p>
      ) : null}
    </div>
  );
}

const corNota = (n: number) =>
  n >= 8 ? "bg-emerald-500" : n >= 6 ? "bg-lime-500" : n >= 4 ? "bg-amber-500" : "bg-red-500";

/** Editor completo do plano de ação. A liderança edita tudo; o colaborador só marca o que concluiu. */
export function PlanoEditor({
  planoId,
  inicial,
  anexosVisiveis,
  podeEditar,
}: {
  planoId: string;
  inicial: DadosPlano;
  anexosVisiveis: AnexoPlanoVisivel[];
  podeEditar: boolean;
}) {
  const [d, setD] = useState<DadosPlano>(inicial);
  const [urls, setUrls] = useState<Record<string, string>>(
    Object.fromEntries(anexosVisiveis.map((a) => [a.caminho, a.url]))
  );
  const [salvando, startSalvar] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [sujo, setSujo] = useState(false);
  const [enviando, setEnviando] = useState(0);
  const arq = useRef<HTMLInputElement>(null);

  // ---- rascunho automático (no navegador) ----
  const chaveRascunho = `plano-rascunho:${planoId}`;
  const [rascunho, setRascunho] = useState<{ d: DadosPlano; quando: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(chaveRascunho);
      if (!raw) return;
      const r = JSON.parse(raw) as { d: DadosPlano; quando: string };
      if (JSON.stringify(r.d) !== JSON.stringify(inicial)) setRascunho(r);
      else localStorage.removeItem(chaveRascunho);
    } catch {
      // sem acesso ao armazenamento: segue sem rascunho
    }
    // só na abertura da página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sujo) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(chaveRascunho, JSON.stringify({ d, quando: new Date().toISOString() }));
      } catch {
        // ignora
      }
    }, 500);
    return () => clearTimeout(t);
  }, [d, sujo, chaveRascunho]);

  useEffect(() => {
    if (!sujo) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sujo]);

  function limparRascunho() {
    try {
      localStorage.removeItem(chaveRascunho);
    } catch {
      // ignora
    }
  }

  function mudar(p: Partial<DadosPlano>) {
    setD((x) => ({ ...x, ...p }));
    setSujo(true);
    setAviso(null);
  }

  function salvar() {
    startSalvar(async () => {
      const r = await salvarPlano(planoId, d);
      if (r.erro) setAviso({ tipo: "erro", texto: r.erro });
      else {
        setAviso({ tipo: "ok", texto: "Plano salvo." });
        setSujo(false);
        limparRascunho();
      }
    });
  }

  // ---- objetivos ----
  const setObj = (id: string, p: Partial<ObjetivoPlano>) =>
    mudar({ objetivos: d.objetivos.map((o) => (o.id === id ? { ...o, ...p } : o)) });
  const addObj = (h: Horizonte) =>
    mudar({ objetivos: [...d.objetivos, { id: novoId(), horizonte: h, texto: "", prazo: null, feito: false, nota: null, justificativa: "" }] });

  // ---- checklist ----
  const setItem = (id: string, p: Partial<ItemChecklist>) =>
    mudar({ checklist: d.checklist.map((i) => (i.id === id ? { ...i, ...p } : i)) });
  const feitos = d.checklist.filter((i) => i.feito).length;

  // ---- proficiência ----
  const setProf = (id: string, p: Partial<Proficiencia>) =>
    mudar({ proficiencia: d.proficiencia.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const media = d.proficiencia.length
    ? d.proficiencia.reduce((s, x) => s + (Number(x.nota) || 0), 0) / d.proficiencia.length
    : null;

  // ---- documentos ----
  async function enviar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setAviso(null);
    const lista = Array.from(arquivos);
    if (d.anexos.length + lista.length > MAX_ANEXOS_PLANO) {
      setAviso({ tipo: "erro", texto: `No máximo ${MAX_ANEXOS_PLANO} documentos por plano.` });
      return;
    }
    const supabase = criarClienteBrowser();
    setEnviando((n) => n + lista.length);
    for (const f of lista) {
      try {
        if (!TIPOS_PLANO.includes(f.type)) {
          setAviso({ tipo: "erro", texto: `"${f.name}": use PDF, imagens ou documentos do Office.` });
          continue;
        }
        const prep = await prepararEnvioPlano(planoId, f.name, f.type, f.size);
        if (prep.erro || !prep.caminho || !prep.token) {
          setAviso({ tipo: "erro", texto: prep.erro ?? "Falha ao preparar o envio." });
          continue;
        }
        const { error } = await supabase.storage
          .from(BUCKET_PLANOS)
          .uploadToSignedUrl(prep.caminho, prep.token, f, { contentType: f.type });
        if (error) {
          setAviso({ tipo: "erro", texto: `Não foi possível enviar "${f.name}".` });
          continue;
        }
        setD((x) => ({
          ...x,
          anexos: [...x.anexos, { caminho: prep.caminho!, nome: f.name, tipo: f.type, tamanho: f.size }],
        }));
        setSujo(true);
      } catch {
        setAviso({ tipo: "erro", texto: `Não foi possível enviar "${f.name}".` });
      } finally {
        setEnviando((n) => n - 1);
      }
    }
    if (arq.current) arq.current.value = "";
  }

  const ro = !podeEditar;

  return (
    <div className="space-y-5">
      {rascunho ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <span>
            Encontramos um <strong>rascunho não salvo</strong> deste plano (
            {new Date(rascunho.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}).
          </span>
          <span className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setD(rascunho.d);
                setSujo(true);
                setRascunho(null);
              }}
            >
              Restaurar rascunho
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                limparRascunho();
                setRascunho(null);
              }}
            >
              Descartar
            </Button>
          </span>
        </div>
      ) : null}

      {/* Barra de salvar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {podeEditar
            ? "Edite o plano e clique em Salvar."
            : "Você pode marcar os objetivos e itens do checklist que já concluiu."}
        </p>
        <div className="flex items-center gap-3">
          {aviso ? (
            <span className={cn("text-sm", aviso.tipo === "ok" ? "text-emerald-600" : "text-destructive")}>
              {aviso.texto}
            </span>
          ) : sujo ? (
            <span className="text-xs text-amber-600">Rascunho guardado neste navegador · não salvo</span>
          ) : null}
          <Button type="button" onClick={salvar} disabled={salvando || enviando > 0 || !sujo}>
            {salvando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar
          </Button>
        </div>
      </div>

      <Secao titulo="O plano" descricao="Título, descrição, resultado esperado e datas.">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-medium text-muted-foreground">Título</span>
            <Input value={d.titulo} disabled={ro} onChange={(e) => mudar({ titulo: e.target.value })} placeholder="Ex.: Evolução em gestão de projetos" />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-medium text-muted-foreground">Descrição do plano</span>
            <Textarea rows={6} value={d.descricao} disabled={ro} onChange={(e) => mudar({ descricao: e.target.value })} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-medium text-muted-foreground">Resultado esperado</span>
            <Textarea rows={3} value={d.resultado_esperado} disabled={ro} onChange={(e) => mudar({ resultado_esperado: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Prazo final</span>
            <Input type="date" value={d.prazo ?? ""} disabled={ro} onChange={(e) => mudar({ prazo: e.target.value || null })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Próxima conversa</span>
            <Input type="date" value={d.proxima_conversa ?? ""} disabled={ro} onChange={(e) => mudar({ proxima_conversa: e.target.value || null })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Situação</span>
            <Select value={d.status} disabled={ro} onChange={(e) => mudar({ status: e.target.value as DadosPlano["status"] })}>
              <option value="aberto">Aberto</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluido">Concluído</option>
            </Select>
          </label>
        </div>
      </Secao>

      <Secao titulo="Objetivos" descricao="Metas de curto, médio e longo prazo.">
        <div className="grid gap-4 lg:grid-cols-3">
          {HORIZONTES.map((h) => {
            const lista = d.objetivos.filter((o) => o.horizonte === h.id);
            return (
              <div key={h.id} className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">{h.rotulo}</p>
                  <span className="text-[11px] text-muted-foreground">{h.dica}</span>
                </div>
                {lista.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum objetivo.</p> : null}
                {lista.map((o) => (
                  <div key={o.id} className="space-y-1.5 rounded-md border bg-background p-2">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={o.feito}
                        onChange={(e) => setObj(o.id, { feito: e.target.checked })}
                        aria-label="Objetivo concluído"
                        className="mt-1.5 size-4 accent-emerald-600"
                      />
                      <Textarea
                        rows={2}
                        value={o.texto}
                        disabled={ro}
                        onChange={(e) => setObj(o.id, { texto: e.target.value })}
                        placeholder="Descreva o objetivo"
                        className={cn("min-h-[56px] text-sm", o.feito && "text-muted-foreground line-through")}
                      />
                      {podeEditar ? (
                        <button type="button" aria-label="Remover objetivo" onClick={() => mudar({ objetivos: d.objetivos.filter((x) => x.id !== o.id) })} className="mt-1.5 text-muted-foreground hover:text-destructive">
                          <Trash2 className="size-4" />
                        </button>
                      ) : null}
                    </div>
                    <Input type="date" value={o.prazo ?? ""} disabled={ro} onChange={(e) => setObj(o.id, { prazo: e.target.value || null })} className="h-8 text-xs" aria-label="Prazo do objetivo" />
                    <NotaEtapa nota={o.nota} justificativa={o.justificativa} podeEditar={podeEditar} aoMudar={(p) => setObj(o.id, p)} />
                  </div>
                ))}
                {podeEditar ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => addObj(h.id)}>
                    <Plus className="size-4" /> Adicionar
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </Secao>

      <Secao
        titulo="Checklist"
        descricao={d.checklist.length ? `${feitos} de ${d.checklist.length} itens concluídos` : "Ações práticas a cumprir."}
      >
        {d.checklist.length > 0 ? (
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(feitos / d.checklist.length) * 100}%` }} />
          </div>
        ) : null}
        <ul className="space-y-1.5">
          {d.checklist.map((i) => (
            <li key={i.id} className="space-y-1.5 rounded-md border p-2">
              <div className="flex items-center gap-2">
              <input type="checkbox" checked={i.feito} onChange={(e) => setItem(i.id, { feito: e.target.checked })} aria-label="Item concluído" className="size-4 accent-emerald-600" />
              <Input value={i.texto} disabled={ro} onChange={(e) => setItem(i.id, { texto: e.target.value })} placeholder="Item do checklist" className={cn("h-9", i.feito && "text-muted-foreground line-through")} />
              {podeEditar ? (
                <button type="button" aria-label="Remover item" onClick={() => mudar({ checklist: d.checklist.filter((x) => x.id !== i.id) })} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              ) : null}
              </div>
              <NotaEtapa nota={i.nota} justificativa={i.justificativa} podeEditar={podeEditar} aoMudar={(p) => setItem(i.id, p)} />
            </li>
          ))}
        </ul>
        {podeEditar ? (
          <Button type="button" variant="outline" size="sm" onClick={() => mudar({ checklist: [...d.checklist, { id: novoId(), texto: "", feito: false, nota: null, justificativa: "" }] })}>
            <Plus className="size-4" /> Adicionar item
          </Button>
        ) : null}
      </Secao>

      <Secao titulo="Relatório de proficiência" descricao="Avaliações por competência, com nota de 0 a 10.">
        {media !== null ? (
          <p className="text-sm">
            Média geral: <strong className="text-lg">{media.toFixed(1).replace(".", ",")}</strong> / 10
          </p>
        ) : null}
        <div className="space-y-2">
          {d.proficiencia.map((p) => (
            <div key={p.id} className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_110px_150px_auto]">
                <Input value={p.competencia} disabled={ro} onChange={(e) => setProf(p.id, { competencia: e.target.value })} placeholder="Competência (ex.: Comunicação)" aria-label="Competência" />
                <Input type="number" min={0} max={10} step={0.5} value={p.nota} disabled={ro} onChange={(e) => setProf(p.id, { nota: Math.min(10, Math.max(0, Number(e.target.value))) })} aria-label="Nota de 0 a 10" />
                <Input type="date" value={p.data} disabled={ro} onChange={(e) => setProf(p.id, { data: e.target.value || hoje() })} aria-label="Data da avaliação" />
                {podeEditar ? (
                  <button type="button" aria-label="Remover avaliação" onClick={() => mudar({ proficiencia: d.proficiencia.filter((x) => x.id !== p.id) })} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full transition-all", corNota(p.nota))} style={{ width: `${(p.nota / 10) * 100}%` }} />
              </div>
              <Textarea rows={2} value={p.observacao} disabled={ro} onChange={(e) => setProf(p.id, { observacao: e.target.value })} placeholder="Observações da avaliação" className="min-h-[56px] text-sm" />
            </div>
          ))}
        </div>
        {podeEditar ? (
          <Button type="button" variant="outline" size="sm" onClick={() => mudar({ proficiencia: [...d.proficiencia, { id: novoId(), competencia: "", nota: 0, data: hoje(), observacao: "" }] })}>
            <Plus className="size-4" /> Adicionar avaliação
          </Button>
        ) : null}
      </Secao>

      <Secao titulo="Documentos e imagens" descricao="PDF, imagens e documentos do Office (até 25 MB cada).">
        {d.anexos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p> : null}
        <ul className="grid gap-2 sm:grid-cols-2">
          {d.anexos.map((a) => {
            const url = urls[a.caminho];
            const img = a.tipo.startsWith("image/");
            return (
              <li key={a.caminho} className="flex items-center gap-3 rounded-lg border p-2">
                {img && url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={a.nome} className="size-12 shrink-0 rounded object-cover" />
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
                    {img ? <ImageIcon className="size-5" /> : <FileText className="size-5" />}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.nome}</p>
                  <p className="text-xs text-muted-foreground">{(a.tamanho / 1024 / 1024).toFixed(1).replace(".", ",")} MB</p>
                </div>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${a.nome}`} className="text-primary">
                    <ExternalLink className="size-4" />
                  </a>
                ) : (
                  <span className="text-[11px] text-muted-foreground">salve para abrir</span>
                )}
                {podeEditar ? (
                  <button type="button" aria-label={`Remover ${a.nome}`} onClick={() => mudar({ anexos: d.anexos.filter((x) => x.caminho !== a.caminho) })} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
        {podeEditar ? (
          <>
            <input ref={arq} type="file" multiple accept={TIPOS_PLANO.join(",")} className="hidden" onChange={(e) => enviar(e.target.files)} />
            <Button type="button" variant="outline" size="sm" disabled={enviando > 0} onClick={() => arq.current?.click()}>
              {enviando > 0 ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />} Anexar documentos
            </Button>
          </>
        ) : null}
      </Secao>

    </div>
  );
}
