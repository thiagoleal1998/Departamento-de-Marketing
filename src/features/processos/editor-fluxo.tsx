"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  ConnectionMode,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Copy,
  Download,
  FileText,
  Link2,
  Loader2,
  Play,
  Plus,
  Redo2,
  ShieldCheck,
  Square,
  Trash2,
  Undo2,
  Wand2,
  X,
  Flag,
  GitFork,
  Cog,
} from "lucide-react";
import { salvarFluxo } from "./actions";
import { organizarAutomaticamente, pendenciasDoFluxo } from "./validacao";
import { BLOCOS, ORDEM_BLOCOS, type DadosEtapa, type DadosFluxo, type LigacaoFluxo, type NoFluxo, type TipoBloco, type TipoFluxo } from "./tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type DadosNo = DadosEtapa & { _alerta?: string };
type NoRF = Node<DadosNo, "bloco">;

const ICONE: Record<TipoBloco, typeof Play> = {
  inicio: Play,
  atividade: Cog,
  decisao: GitFork,
  aprovacao: ShieldCheck,
  documento: FileText,
  processo: Link2,
  fim: Flag,
};

const aoRF = (n: NoFluxo): NoRF => ({ id: n.id, type: "bloco", position: n.position, data: n.data });
const deRF = (n: NoRF): NoFluxo => ({
  id: n.id,
  type: "bloco",
  position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
  data: Object.fromEntries(Object.entries(n.data).filter(([k]) => !k.startsWith("_"))) as DadosEtapa,
});
const arestaRF = (e: LigacaoFluxo): Edge => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? "b", targetHandle: e.targetHandle ?? "t", label: e.label });
const deArestaRF = (e: Edge): LigacaoFluxo => ({
  id: e.id,
  source: e.source,
  target: e.target,
  sourceHandle: e.sourceHandle ?? null,
  targetHandle: e.targetHandle ?? null,
  ...(typeof e.label === "string" && e.label ? { label: e.label } : {}),
});
const serializar = (nodes: NoRF[], edges: Edge[]): DadosFluxo => ({ nodes: nodes.map(deRF), edges: edges.map(deArestaRF) });

const idCurto = () => Math.random().toString(36).slice(2, 10);

// ---------------------------------------------------------------- bloco (nó) ----

function PontosDeLigacao() {
  const base = "!size-2.5 !border-2 !border-background !bg-primary opacity-0 transition-opacity group-hover:opacity-100 group-[.selecionado]:opacity-100";
  return (
    <>
      <Handle id="t" type="source" position={Position.Top} className={base} />
      <Handle id="r" type="source" position={Position.Right} className={base} />
      <Handle id="b" type="source" position={Position.Bottom} className={base} />
      <Handle id="l" type="source" position={Position.Left} className={base} />
    </>
  );
}

function Alerta({ texto }: { texto?: string }) {
  if (!texto) return null;
  return (
    <span title={texto} className="absolute -right-2 -top-2 z-10 grid size-5 place-items-center rounded-full bg-amber-500 text-white shadow">
      <AlertTriangle className="size-3" aria-label={texto} />
    </span>
  );
}

function BlocoNo({ data, selected }: NodeProps<NoRF>) {
  const meta = BLOCOS[data.tipo];
  const Icone = ICONE[data.tipo];
  const nome = data.nome?.trim() || meta.rotulo;
  const sel = selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "";

  if (data.tipo === "decisao") {
    return (
      <div className={cn("group relative h-[112px] w-[196px]", selected && "selecionado")}>
        <PontosDeLigacao />
        <svg viewBox="0 0 196 112" className="absolute inset-0 size-full" aria-hidden>
          <polygon
            points="98,2 194,56 98,110 2,56"
            className={cn("fill-amber-50 stroke-amber-500 dark:fill-amber-950/60", selected ? "stroke-[3]" : "stroke-2")}
            strokeLinejoin="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <Icone className="mb-0.5 size-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
          <span className="line-clamp-3 text-xs font-semibold leading-tight text-amber-950 dark:text-amber-100">{nome}</span>
        </div>
        <Alerta texto={data._alerta} />
      </div>
    );
  }

  if (data.tipo === "inicio" || data.tipo === "fim") {
    return (
      <div className={cn("group relative flex min-w-36 max-w-60 items-center justify-center gap-2 rounded-full border-2 px-5 py-2.5 text-center", meta.classe, sel, selected && "selecionado")}>
        <PontosDeLigacao />
        <Icone className="size-4 shrink-0" aria-hidden />
        <span className="line-clamp-2 text-xs font-semibold">{nome}</span>
        <Alerta texto={data._alerta} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative w-56 overflow-hidden rounded-xl border-2 text-left shadow-sm",
        meta.classe,
        data.tipo === "aprovacao" && "outline outline-1 outline-offset-2 outline-violet-400/60",
        sel,
        selected && "selecionado"
      )}
    >
      <PontosDeLigacao />
      <span className={cn("absolute inset-y-0 left-0 w-1.5", meta.faixa)} aria-hidden />
      <div className="space-y-1 py-2.5 pl-4 pr-3">
        <div className="flex items-start gap-1.5">
          <Icone className="mt-0.5 size-3.5 shrink-0 opacity-80" aria-hidden />
          <span className="line-clamp-2 text-xs font-semibold leading-snug">{nome}</span>
        </div>
        <p className="flex flex-wrap items-center gap-1 text-[10px] opacity-80">
          <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-medium">{meta.rotulo}</span>
          {data.responsavel ? <span className="truncate">{data.responsavel}</span> : data.tipo === "atividade" || data.tipo === "aprovacao" ? <span className="italic">sem responsável</span> : null}
        </p>
      </div>
      <Alerta texto={data._alerta} />
    </div>
  );
}

const nodeTypes = { bloco: BlocoNo };

// ---------------------------------------------------------------- painel lateral ----

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{rotulo}</Label>
      {children}
    </div>
  );
}

function PainelEtapa({
  no,
  entradas,
  saidas,
  editavel,
  aoMudar,
  aoFechar,
}: {
  no: NoRF;
  entradas: { de: string; rotulo?: string }[];
  saidas: { para: string; rotulo?: string }[];
  editavel: boolean;
  aoMudar: (dados: Partial<DadosEtapa>) => void;
  aoFechar: () => void;
}) {
  const d = no.data;
  const meta = BLOCOS[d.tipo];
  const ro = !editavel;
  const [novoItem, setNovoItem] = useState("");
  const checklist = d.checklist ?? [];
  const texto = (campo: keyof DadosEtapa, linhas = 2) => (
    <Textarea rows={linhas} value={(d[campo] as string | undefined) ?? ""} onChange={(e) => aoMudar({ [campo]: e.target.value })} disabled={ro} className="text-sm" />
  );
  const linha = (campo: keyof DadosEtapa, placeholder?: string) => (
    <Input value={(d[campo] as string | undefined) ?? ""} onChange={(e) => aoMudar({ [campo]: e.target.value })} disabled={ro} placeholder={placeholder} className="h-9 text-sm" />
  );

  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col border-l bg-background shadow-xl sm:w-96">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{meta.rotulo}</p>
          <h3 className="truncate text-sm font-semibold">{d.nome?.trim() || "Etapa sem nome"}</h3>
        </div>
        <button type="button" onClick={aoFechar} aria-label="Fechar" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="size-4" />
        </button>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <Campo rotulo="Nome da etapa">{linha("nome", "Ex.: Revisão de e-mail")}</Campo>
        <Campo rotulo="Tipo de etapa">
          <div className="flex flex-wrap gap-1.5">
            {ORDEM_BLOCOS.map((t) => (
              <button
                key={t}
                type="button"
                disabled={ro}
                onClick={() => aoMudar({ tipo: t })}
                className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60", d.tipo === t ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent")}
              >
                {BLOCOS[t].rotulo}
              </button>
            ))}
          </div>
        </Campo>
        <Campo rotulo="Descrição">{texto("descricao")}</Campo>
        {d.tipo !== "inicio" && d.tipo !== "fim" ? (
          <>
            <Campo rotulo="Responsável pela execução (função ou cargo)">{linha("responsavel", "Ex.: Design, Conteúdo, Supervisão")}</Campo>
            <Campo rotulo="Funções participantes">{linha("funcoes")}</Campo>
            <Campo rotulo="Entrada necessária">{texto("entrada")}</Campo>
            <Campo rotulo="Instruções de execução">{texto("instrucoes", 4)}</Campo>
            <Campo rotulo="Ferramentas utilizadas">{linha("ferramentas")}</Campo>
            <Campo rotulo={d.tipo === "aprovacao" ? "Critério: quem aprova e o que é validado" : "Critério de conclusão"}>{texto("criterio")}</Campo>
            <Campo rotulo="Prazo de referência">{linha("prazo", "Ex.: 1 dia útil")}</Campo>
            <Campo rotulo="Procedimentos vinculados">{linha("procedimentos", "Ex.: Checklist de revisão de e-mail")}</Campo>

            <Campo rotulo="Checklist">
              <ul className="space-y-1">
                {checklist.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckSquare className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 break-words">{item}</span>
                    {editavel ? (
                      <button type="button" aria-label="Remover item" onClick={() => aoMudar({ checklist: checklist.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-destructive">
                        <X className="size-3.5" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {editavel ? (
                <form
                  className="mt-1.5 flex gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!novoItem.trim()) return;
                    aoMudar({ checklist: [...checklist, novoItem.trim()] });
                    setNovoItem("");
                  }}
                >
                  <Input value={novoItem} onChange={(e) => setNovoItem(e.target.value)} placeholder="Novo item do checklist" className="h-8 text-sm" />
                  <Button type="submit" size="sm" variant="outline" className="h-8">
                    <Plus className="size-3.5" />
                  </Button>
                </form>
              ) : null}
            </Campo>
            <Campo rotulo="Anexos e links">{texto("anexos")}</Campo>
          </>
        ) : null}
        <Campo rotulo="Observações">{texto("observacoes")}</Campo>

        <div className="space-y-1.5 rounded-lg bg-muted/50 p-3 text-xs">
          <p className="font-semibold text-muted-foreground">Caminhos (definidos pelas ligações no fluxograma)</p>
          <p>
            <span className="text-muted-foreground">Vem de: </span>
            {entradas.length ? entradas.map((x) => x.de + (x.rotulo ? ` (${x.rotulo})` : "")).join(", ") : "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Segue para: </span>
            {saidas.length ? saidas.map((x) => (x.rotulo ? `${x.rotulo}: ` : "") + x.para).join(" · ") : "—"}
          </p>
        </div>
      </div>
    </aside>
  );
}

function PainelLigacao({ aresta, origem, editavel, aoRotular, aoExcluir, aoFechar }: { aresta: Edge; origem?: NoRF; editavel: boolean; aoRotular: (r: string) => void; aoExcluir: () => void; aoFechar: () => void }) {
  const rotulo = typeof aresta.label === "string" ? aresta.label : "";
  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-xs flex-col border-l bg-background shadow-xl">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Ligação</h3>
        <button type="button" onClick={aoFechar} aria-label="Fechar" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
          <X className="size-4" />
        </button>
      </header>
      <div className="space-y-3 p-4">
        <Campo rotulo="Nome do caminho">
          <Input value={rotulo} onChange={(e) => aoRotular(e.target.value)} disabled={!editavel} placeholder={origem?.data.tipo === "decisao" ? "Sim, Não…" : "Opcional"} className="h-9 text-sm" />
        </Campo>
        {editavel ? (
          <div className="flex flex-wrap gap-1.5">
            {["Sim", "Não", ""].map((r) => (
              <button key={r || "limpar"} type="button" onClick={() => aoRotular(r)} className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent">
                {r || "Sem nome"}
              </button>
            ))}
          </div>
        ) : null}
        {origem?.data.tipo === "decisao" ? <p className="text-xs text-muted-foreground">Os caminhos que saem de uma decisão precisam de nome.</p> : null}
        {editavel ? (
          <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={aoExcluir}>
            <Trash2 className="size-3.5" /> Excluir ligação
          </Button>
        ) : null}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------- editor ----

type Instantaneo = { nodes: NoRF[]; edges: Edge[] };
const limpoSel = <T extends { selected?: boolean }>(l: T[]): T[] => l.map((x) => ({ ...x, selected: false }));

function Editor({
  processoId,
  tipo,
  inicial,
  editavel,
  aoMudar,
}: {
  processoId: string;
  tipo: TipoFluxo;
  inicial: DadosFluxo;
  editavel: boolean;
  aoMudar: (dados: DadosFluxo) => void;
}) {
  const rf = useReactFlow();
  const caixa = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<NoRF[]>(() => inicial.nodes.map(aoRF));
  const [edges, setEdges] = useState<Edge[]>(() => inicial.edges.map(arestaRF));
  const [salvamento, setSalvamento] = useState<"salvo" | "salvando" | "erro" | "pendente">("salvo");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [escuro, setEscuro] = useState(false);

  // Tema do painel (classe "dark" no <html>) para o fundo e os controles do canvas.
  useEffect(() => {
    const ler = () => setEscuro(document.documentElement.classList.contains("dark"));
    ler();
    const obs = new MutationObserver(ler);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Desfazer / refazer.
  const passado = useRef<Instantaneo[]>([]);
  const futuro = useRef<Instantaneo[]>([]);
  const [, forcar] = useState(0);
  const atual = useRef<Instantaneo>({ nodes, edges });
  atual.current = { nodes, edges };
  const registrar = useCallback(() => {
    passado.current = [...passado.current.slice(-49), { nodes: limpoSel(atual.current.nodes), edges: limpoSel(atual.current.edges) }];
    futuro.current = [];
    forcar((n) => n + 1);
  }, []);
  function desfazer() {
    const anterior = passado.current.pop();
    if (!anterior) return;
    futuro.current.push({ nodes: limpoSel(atual.current.nodes), edges: limpoSel(atual.current.edges) });
    setNodes(anterior.nodes);
    setEdges(anterior.edges);
    forcar((n) => n + 1);
  }
  function refazer() {
    const proximo = futuro.current.pop();
    if (!proximo) return;
    passado.current.push({ nodes: limpoSel(atual.current.nodes), edges: limpoSel(atual.current.edges) });
    setNodes(proximo.nodes);
    setEdges(proximo.edges);
    forcar((n) => n + 1);
  }

  // Salvamento automático (só quando o conteúdo muda, não a seleção).
  const ultimoSalvo = useRef(JSON.stringify(inicial));
  const naoSalvo = useRef<DadosFluxo | null>(null);
  const dadosAtuais = useMemo(() => serializar(nodes, edges), [nodes, edges]);
  useEffect(() => {
    aoMudar(dadosAtuais);
    if (!editavel) return;
    const json = JSON.stringify(dadosAtuais);
    if (json === ultimoSalvo.current) {
      naoSalvo.current = null;
      return;
    }
    naoSalvo.current = dadosAtuais;
    setSalvamento("pendente");
    const t = setTimeout(async () => {
      setSalvamento("salvando");
      const r = await salvarFluxo(processoId, tipo, dadosAtuais);
      if (r.erro) {
        setSalvamento("erro");
        setMensagem(r.erro);
      } else {
        ultimoSalvo.current = json;
        if (naoSalvo.current && JSON.stringify(naoSalvo.current) === json) naoSalvo.current = null;
        setSalvamento("salvo");
        setMensagem(null);
      }
    }, 1200);
    return () => clearTimeout(t);
    // aoMudar muda de identidade a cada render do pai; só o conteúdo importa aqui
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dadosAtuais, editavel, processoId, tipo]);

  // Ao trocar de visão ou sair da tela com alteração pendente, grava na hora (o relógio do salvamento automático não espera).
  useEffect(() => {
    return () => {
      if (editavel && naoSalvo.current) void salvarFluxo(processoId, tipo, naoSalvo.current);
    };
  }, [editavel, processoId, tipo]);

  // Avisa ao tentar sair com alteração ainda não salva.
  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => {
      if (salvamento === "pendente" || salvamento === "salvando") e.preventDefault();
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [salvamento]);

  // Alertas de qualidade em cada bloco.
  const alertas = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of pendenciasDoFluxo(dadosAtuais)) if (p.noId && !m.has(p.noId)) m.set(p.noId, p.texto);
    return m;
  }, [dadosAtuais]);
  const nosVisiveis = useMemo(() => nodes.map((n) => ({ ...n, data: { ...n.data, _alerta: alertas.get(n.id) } })), [nodes, alertas]);
  const arestasVisiveis = useMemo(
    () =>
      edges.map((e) => {
        const r = typeof e.label === "string" ? e.label.trim().toLowerCase() : "";
        const cor = r === "sim" ? "#16a34a" : r === "não" || r === "nao" ? "#dc2626" : undefined;
        return {
          ...e,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, ...(cor ? { color: cor } : {}) },
          style: cor ? { stroke: cor, strokeWidth: 2 } : { strokeWidth: 2 },
          labelStyle: { fontSize: 12, fontWeight: 600, fill: cor ?? "currentColor" },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 6,
          labelBgStyle: { fillOpacity: 0.95 },
        } satisfies Edge;
      }),
    [edges]
  );

  const selecionado = nodes.filter((n) => n.selected);
  const noAberto = selecionado.length === 1 ? selecionado[0] : null;
  const arestaAberta = !noAberto ? edges.find((e) => e.selected) ?? null : null;

  const aoMudarNos = useCallback(
    (mudancas: NodeChange<NoRF>[]) => {
      if (!editavel) mudancas = mudancas.filter((c) => c.type === "select" || c.type === "dimensions");
      setNodes((n) => applyNodeChanges(mudancas, n));
    },
    [editavel]
  );
  const aoMudarArestas = useCallback(
    (mudancas: EdgeChange[]) => {
      if (!editavel) mudancas = mudancas.filter((c) => c.type === "select");
      setEdges((e) => applyEdgeChanges(mudancas, e));
    },
    [editavel]
  );

  function aoConectar(c: Connection) {
    if (!editavel || !c.source || !c.target || c.source === c.target) return;
    registrar();
    const origem = nodes.find((n) => n.id === c.source);
    const irmas = edges.filter((e) => e.source === c.source).length;
    const rotulo = origem?.data.tipo === "decisao" ? (irmas === 0 ? "Sim" : irmas === 1 ? "Não" : "") : "";
    setEdges((e) => [...e, { id: `${c.source}-${c.target}-${idCurto()}`, source: c.source, target: c.target, sourceHandle: c.sourceHandle, targetHandle: c.targetHandle, ...(rotulo ? { label: rotulo } : {}) }]);
  }

  function adicionar(t: TipoBloco) {
    if (!editavel) return;
    registrar();
    const r = caixa.current?.getBoundingClientRect();
    const centro = r ? rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 }) : { x: 300, y: 100 };
    const jitter = (nodes.length % 5) * 24;
    const id = `${t}-${idCurto()}`;
    const largura = t === "decisao" ? 196 : 224;
    setNodes((n) => [...limpoSel(n), { id, type: "bloco", position: { x: centro.x - largura / 2 + jitter, y: centro.y - 40 + jitter }, data: { tipo: t, nome: BLOCOS[t].rotulo }, selected: true }]);
  }

  function duplicar() {
    if (!editavel || selecionado.length === 0) return;
    registrar();
    const copias = selecionado.map((n) => ({ ...n, id: `${n.data.tipo}-${idCurto()}`, position: { x: n.position.x + 40, y: n.position.y + 40 }, data: { ...n.data, checklist: n.data.checklist ? [...n.data.checklist] : undefined }, selected: true }));
    setNodes((n) => [...limpoSel(n), ...copias]);
  }

  function excluirSelecao() {
    if (!editavel) return;
    const ids = new Set(selecionado.map((n) => n.id));
    if (ids.size === 0 && !arestaAberta) return;
    registrar();
    setNodes((n) => n.filter((x) => !ids.has(x.id)));
    setEdges((e) => e.filter((x) => !ids.has(x.source) && !ids.has(x.target) && x.id !== arestaAberta?.id));
  }

  // Edição de propriedades: um único ponto de desfazer por "rajada" de digitação.
  const digitando = useRef<ReturnType<typeof setTimeout> | null>(null);
  function editarEtapa(id: string, dados: Partial<DadosEtapa>) {
    if (!editavel) return;
    if (!digitando.current) registrar();
    else clearTimeout(digitando.current);
    digitando.current = setTimeout(() => (digitando.current = null), 900);
    setNodes((n) => n.map((x) => (x.id === id ? { ...x, data: { ...x.data, ...dados } } : x)));
  }
  function rotularAresta(id: string, rotulo: string) {
    if (!editavel) return;
    if (!digitando.current) registrar();
    else clearTimeout(digitando.current);
    digitando.current = setTimeout(() => (digitando.current = null), 900);
    setEdges((e) => e.map((x) => (x.id === id ? { ...x, label: rotulo || undefined } : x)));
  }

  function organizar() {
    if (!editavel) return;
    registrar();
    const novo = organizarAutomaticamente(serializar(nodes, edges));
    setNodes((n) => n.map((x) => ({ ...x, position: novo.nodes.find((y) => y.id === x.id)?.position ?? x.position })));
    setTimeout(() => rf.fitView({ padding: 0.2, duration: 300 }), 50);
  }

  function exportar() {
    const blob = new Blob([JSON.stringify(dadosAtuais, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fluxo-${tipo}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Atalhos: Ctrl+Z / Ctrl+Y.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA")) return;
      if (!(e.ctrlKey || e.metaKey) || !editavel) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        desfazer();
      } else if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) {
        e.preventDefault();
        refazer();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
    // desfazer/refazer usam apenas refs e setState
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editavel]);

  const nomeDe = (id: string) => {
    const n = nodes.find((x) => x.id === id);
    return n?.data.nome?.trim() || (n ? BLOCOS[n.data.tipo].rotulo : "—");
  };
  const botao = "inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-40 disabled:hover:bg-background";

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {editavel ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b p-2">
          <span className="mr-1 text-xs font-medium text-muted-foreground">Adicionar:</span>
          {ORDEM_BLOCOS.map((t) => {
            const Icone = ICONE[t];
            return (
              <button key={t} type="button" onClick={() => adicionar(t)} title={BLOCOS[t].descricao} className={botao}>
                <Icone className="size-3.5" aria-hidden />
                {BLOCOS[t].rotulo}
              </button>
            );
          })}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <button type="button" onClick={desfazer} disabled={passado.current.length === 0} className={botao} title="Desfazer (Ctrl+Z)">
            <Undo2 className="size-3.5" /> Desfazer
          </button>
          <button type="button" onClick={refazer} disabled={futuro.current.length === 0} className={botao} title="Refazer (Ctrl+Y)">
            <Redo2 className="size-3.5" /> Refazer
          </button>
          <button type="button" onClick={duplicar} disabled={selecionado.length === 0} className={botao}>
            <Copy className="size-3.5" /> Duplicar
          </button>
          <button type="button" onClick={excluirSelecao} disabled={selecionado.length === 0 && !arestaAberta} className={cn(botao, "text-destructive")}>
            <Trash2 className="size-3.5" /> Excluir
          </button>
          <button type="button" onClick={organizar} className={botao} title="Reorganiza as etapas em camadas, sem mudar os dados">
            <Wand2 className="size-3.5" /> Organizar
          </button>
          <button type="button" onClick={exportar} className={botao}>
            <Download className="size-3.5" /> JSON
          </button>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground" role="status" aria-live="polite">
            {salvamento === "salvando" || salvamento === "pendente" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Salvando…
              </>
            ) : salvamento === "erro" ? (
              <span className="text-destructive">{mensagem ?? "Não salvou"}</span>
            ) : (
              <>
                <CheckCircle2 className="size-3.5 text-emerald-600" /> Salvo
              </>
            )}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
          <Square className="size-3.5" /> Somente leitura. Clique numa etapa para ver os detalhes.
          <button type="button" onClick={exportar} className={cn(botao, "ml-auto")}>
            <Download className="size-3.5" /> JSON
          </button>
        </div>
      )}

      <div ref={caixa} className="relative h-[68vh] min-h-[420px]">
        <ReactFlow
          nodes={nosVisiveis}
          edges={arestasVisiveis}
          nodeTypes={nodeTypes}
          onNodesChange={aoMudarNos}
          onEdgesChange={aoMudarArestas}
          onConnect={aoConectar}
          onNodeDragStart={() => registrar()}
          onBeforeDelete={async () => {
            if (!editavel) return false;
            registrar();
            return true;
          }}
          connectionMode={ConnectionMode.Loose}
          nodesDraggable={editavel}
          nodesConnectable={editavel}
          elementsSelectable
          deleteKeyCode={editavel ? ["Delete", "Backspace"] : null}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          snapToGrid
          snapGrid={[10, 10]}
          colorMode={escuro ? "dark" : "light"}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap pannable zoomable position="bottom-right" className="!hidden sm:!block" />
        </ReactFlow>
        {nodes.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            <p className="max-w-xs text-center">Fluxo vazio. {editavel ? "Use \"Adicionar\" para começar pelo bloco de Início." : ""}</p>
          </div>
        ) : null}
        {noAberto ? (
          <PainelEtapa
            key={noAberto.id}
            no={noAberto}
            entradas={edges.filter((e) => e.target === noAberto.id).map((e) => ({ de: nomeDe(e.source), rotulo: typeof e.label === "string" ? e.label : undefined }))}
            saidas={edges.filter((e) => e.source === noAberto.id).map((e) => ({ para: nomeDe(e.target), rotulo: typeof e.label === "string" ? e.label : undefined }))}
            editavel={editavel}
            aoMudar={(d) => editarEtapa(noAberto.id, d)}
            aoFechar={() => setNodes((n) => limpoSel(n))}
          />
        ) : arestaAberta ? (
          <PainelLigacao
            key={arestaAberta.id}
            aresta={arestaAberta}
            origem={nodes.find((n) => n.id === arestaAberta.source)}
            editavel={editavel}
            aoRotular={(r) => rotularAresta(arestaAberta.id, r)}
            aoExcluir={excluirSelecao}
            aoFechar={() => setEdges((e) => limpoSel(e))}
          />
        ) : null}
      </div>
    </div>
  );
}

/** Editor visual do fluxo (zoom, arrastar, conectar, painel da etapa, desfazer/refazer e salvamento automático). */
export function EditorFluxo(props: { processoId: string; tipo: TipoFluxo; inicial: DadosFluxo; editavel: boolean; aoMudar: (dados: DadosFluxo) => void }) {
  return (
    <ReactFlowProvider>
      <Editor {...props} />
    </ReactFlowProvider>
  );
}
