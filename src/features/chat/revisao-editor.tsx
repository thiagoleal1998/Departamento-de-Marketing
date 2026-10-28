"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Hand, ImagePlus, Loader2, MousePointerSquareDashed, Pencil, Send, Trash2, X } from "lucide-react";
import { ZoomPan } from "@/components/ui/zoom-pan";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { enviarRevisao } from "./revisao-actions";
import { PecaMarcada } from "./revisao-card";
import { MAX_MARCACOES, VEREDITOS, VEREDITOS_REVISOR, type MarcacaoRevisao, type VereditoRevisao } from "./revisao-tipos";

/** Peça que já está na conversa (um pedido de revisão) e vai ser revisada sem reenviar a imagem. */
export interface PecaInicial {
  imagem: string;
  nome: string;
  pedidoId: string;
}

const MAX_LADO = 1800;
const MIN_ARRASTO = 1.5; // % — abaixo disso o clique vira uma marcação pequena

/** Reduz a imagem no navegador (a peça vai como JPEG de boa qualidade). */
async function prepararImagem(arquivo: File): Promise<string> {
  const origem = await new Promise<string>((ok, erro) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => erro(new Error("leitura"));
    r.readAsDataURL(arquivo);
  });
  const img = await new Promise<HTMLImageElement>((ok, erro) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => erro(new Error("imagem"));
    i.src = origem;
  });
  const k = Math.min(1, MAX_LADO / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * k));
  c.height = Math.max(1, Math.round(img.naturalHeight * k));
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.88);
}

const limitar = (n: number) => Math.min(100, Math.max(0, n));

/**
 * Dois jeitos de usar:
 *  • modo "pedido" (Solicitar revisão): quem criou a peça só envia a imagem e diz o que quer revisado;
 *  • modo "revisao" (Revisar peça): o revisor desenha retângulos sobre o que precisa ser corrigido e comenta cada ponto.
 */
export function RevisaoEditor({
  conversaId,
  respostaA,
  modo,
  inicial,
  aoFechar,
}: {
  conversaId: string;
  respostaA: string | null;
  modo: "pedido" | "revisao";
  inicial?: PecaInicial;
  aoFechar: () => void;
}) {
  const ehPedido = modo === "pedido";
  const [imagem, setImagem] = useState<string | null>(inicial?.imagem ?? null);
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [marcacoes, setMarcacoes] = useState<MarcacaoRevisao[]>([]);
  const [rascunho, setRascunho] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [destaque, setDestaque] = useState<number | null>(null);
  const [veredito, setVeredito] = useState<VereditoRevisao>("ajustes");
  const [comentario, setComentario] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [pendente, startTransition] = useTransition();
  // Ferramentas: "Marcar" desenha retângulos; "Mover" (ou segurar Espaço) arrasta a imagem aproximada.
  const [mao, setMao] = useState(true); // começa em "Mover": primeiro se aproxima/navega, depois se marca
  // Marcação em dois cliques: o primeiro fixa um canto, o segundo o canto oposto (arrastar também funciona).
  const [ancora, setAncora] = useState<{ x: number; y: number } | null>(null);
  const pressionado = useRef<{ x: number; y: number } | null>(null);
  const [espaco, setEspaco] = useState(false);
  const movendo = mao || espaco;
  const input = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLDivElement>(null);

  const receber = useCallback(async (arquivo: File | undefined | null) => {
    if (!arquivo) return;
    if (!/^image\/(png|jpeg|webp)$/.test(arquivo.type)) return setErro("Use uma imagem PNG, JPG ou WebP.");
    if (arquivo.size > 25 * 1024 * 1024) return setErro("A imagem é muito grande (máx. 25 MB).");
    setErro(null);
    setLendo(true);
    try {
      setImagem(await prepararImagem(arquivo));
      setNome(arquivo.name.replace(/\.[a-z0-9]+$/i, ""));
      setMarcacoes([]);
    } catch {
      setErro("Não foi possível ler esta imagem.");
    } finally {
      setLendo(false);
    }
  }, []);

  // Ctrl+V cola um print; Esc fecha.
  useEffect(() => {
    const colar = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith("image/"));
      if (f) void receber(f);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Esc primeiro cancela a marcação em andamento; só depois fecha a janela.
      if (ancora) {
        setAncora(null);
        setRascunho(null);
      } else if (!pendente) aoFechar();
    };
    document.addEventListener("paste", colar);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("paste", colar);
      document.removeEventListener("keydown", tecla);
    };
  }, [receber, aoFechar, pendente, ancora]);

  // Segurar Espaço (fora dos campos de texto) vira a ferramenta Mover enquanto estiver pressionado.
  useEffect(() => {
    const campo = (e: KeyboardEvent) => ["TEXTAREA", "INPUT"].includes((e.target as HTMLElement | null)?.tagName ?? "");
    const desce = (e: KeyboardEvent) => {
      if (e.code === "Space" && !campo(e)) {
        e.preventDefault();
        setEspaco(true);
      }
    };
    const sobe = (e: KeyboardEvent) => e.code === "Space" && setEspaco(false);
    document.addEventListener("keydown", desce);
    document.addEventListener("keyup", sobe);
    return () => {
      document.removeEventListener("keydown", desce);
      document.removeEventListener("keyup", sobe);
    };
  }, []);

  const ponto = (e: React.PointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    return { x: limitar(((e.clientX - r.left) / r.width) * 100), y: limitar(((e.clientY - r.top) / r.height) * 100) };
  };

  const caixaEntre = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  });

  function criarMarcacao(r: { x: number; y: number; w: number; h: number }) {
    // Os dois cliques no mesmo ponto marcam uma área pequena em volta dele.
    const pequeno = r.w < MIN_ARRASTO && r.h < MIN_ARRASTO;
    const caixa = pequeno ? { x: limitar(r.x - 4), y: limitar(r.y - 4), w: 8, h: 8 } : r;
    const n = marcacoes.length + 1;
    setMarcacoes((l) => [...l, { n, ...caixa, texto: "" }]);
    setDestaque(n);
    setTimeout(() => document.getElementById(`rev-texto-${n}`)?.focus(), 30);
  }

  function comecar(e: React.PointerEvent) {
    if (e.button !== 0) return;
    if (marcacoes.length >= MAX_MARCACOES) return setErro(`No máximo ${MAX_MARCACOES} apontamentos por peça.`);
    e.currentTarget.setPointerCapture(e.pointerId);
    pressionado.current = ponto(e);
    if (!ancora) setRascunho({ ...pressionado.current, w: 0, h: 0 });
  }
  function mover(e: React.PointerEvent) {
    // O retângulo acompanha o mouse mesmo sem o botão apertado, depois do primeiro clique.
    const origem = ancora ?? pressionado.current;
    if (origem) setRascunho(caixaEntre(origem, ponto(e)));
  }
  function terminar(e: React.PointerEvent) {
    const inicio = pressionado.current;
    pressionado.current = null;
    if (!inicio) return;
    const p = ponto(e);
    const arrastou = Math.abs(p.x - inicio.x) + Math.abs(p.y - inicio.y) > MIN_ARRASTO;
    if (ancora) {
      // Segundo clique: fecha o retângulo.
      criarMarcacao(caixaEntre(ancora, p));
      setAncora(null);
      setRascunho(null);
    } else if (arrastou) {
      // Arrastou e soltou: marcação pronta.
      criarMarcacao(caixaEntre(inicio, p));
      setRascunho(null);
    } else {
      // Primeiro clique: fixa o canto e espera o segundo.
      setAncora(inicio);
      setRascunho({ ...inicio, w: 0, h: 0 });
    }
  }

  function remover(n: number) {
    setMarcacoes((l) => l.filter((m) => m.n !== n).map((m, i) => ({ ...m, n: i + 1 })));
    setDestaque(null);
  }

  function enviar() {
    if (!imagem) return;
    setErro(null);
    startTransition(async () => {
      const r = await enviarRevisao(conversaId, {
        imagem: inicial ? "" : imagem,
        imagemUrl: inicial?.imagem,
        pedidoId: inicial?.pedidoId ?? null,
        tipo: modo,
        nome,
        veredito,
        marcacoes,
        comentario,
        respostaA,
      });
      if (r.erro) setErro(r.erro);
      else aoFechar();
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
      <div className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-background text-foreground shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="font-semibold">{ehPedido ? "Solicitar revisão" : "Revisar peça"}</h2>
            <p className="text-xs text-muted-foreground">
              {ehPedido
                ? "Envie a peça para quem vai revisar. Os apontamentos chegam aqui no chat e você faz os ajustes."
                : "Aproxime com a roda do mouse, navegue com Mover e use Marcar (dois cliques ou arrastar) no que precisa ser corrigido."}
            </p>
          </div>
          <button type="button" onClick={aoFechar} disabled={pendente} aria-label="Fechar" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        {!imagem ? (
          <div className="p-6">
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void receber(e.target.files?.[0])} />
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void receber(e.dataTransfer.files?.[0]);
              }}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors hover:border-primary hover:bg-primary/5"
            >
              {lendo ? <Loader2 className="size-8 animate-spin text-primary" /> : <ImagePlus className="size-8 text-primary" />}
              <span className="font-medium">{lendo ? "Preparando a imagem…" : ehPedido ? "Escolha a imagem da peça para revisão" : "Escolha a imagem da peça"}</span>
              <span className="text-sm text-muted-foreground">Clique, arraste um arquivo para cá ou cole um print (Ctrl+V). PNG, JPG ou WebP.</span>
            </button>
            {erro ? <p className="mt-3 text-sm text-destructive">{erro}</p> : null}
          </div>
        ) : (
          <>
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[1fr_340px]">
              <ZoomPan
                className="h-[64vh] rounded-lg bg-muted/40"
                bloquearArrasto={!ehPedido && !movendo}
                extra={
                  ehPedido ? null : (
                    <div className="flex flex-col items-start gap-1.5">
                    <div className="flex items-center gap-1 rounded-full bg-black/60 p-1 text-white shadow-lg backdrop-blur">
                      <button
                        type="button"
                        onClick={() => {
                          setMao(true);
                          setAncora(null);
                          setRascunho(null);
                        }}
                        title="Mover a imagem (ou segure a barra de espaço)"
                        className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium", movendo ? "bg-white text-black" : "hover:bg-white/15")}
                      >
                        <Hand className="size-3.5" /> Mover
                      </button>
                      <button
                        type="button"
                        onClick={() => setMao(false)}
                        className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium", !movendo ? "bg-white text-black" : "hover:bg-white/15")}
                      >
                        <Pencil className="size-3.5" /> Marcar
                      </button>
                    </div>
                    {!movendo ? (
                      <p className="rounded-full bg-black/60 px-3 py-1 text-[11px] text-white/90 backdrop-blur">
                        {ancora ? "Clique no canto oposto para fechar a marcação (Esc cancela)" : "Clique no canto inicial e depois no canto oposto — ou arraste"}
                      </p>
                    ) : null}
                    </div>
                  )
                }
              >
                <PecaMarcada imagem={imagem} marcacoes={marcacoes} destaque={destaque} onDestaque={setDestaque} className="max-h-[60vh] w-auto">
                  {ehPedido ? null : (
                  <div
                    ref={area}
                    onPointerDown={comecar}
                    onPointerMove={mover}
                    onPointerUp={terminar}
                    onPointerCancel={() => {
                      pressionado.current = null;
                      if (!ancora) setRascunho(null);
                    }}
                    className={cn("absolute inset-0 touch-none", movendo ? "pointer-events-none" : "cursor-crosshair")}
                  >
                    {rascunho ? (
                      <div
                        style={{ left: `${rascunho.x}%`, top: `${rascunho.y}%`, width: `${rascunho.w}%`, height: `${rascunho.h}%` }}
                        className="absolute rounded-[3px] border-2 border-dashed border-red-500 bg-red-500/15"
                      />
                    ) : null}
                  </div>
                  )}
                </PecaMarcada>
              </ZoomPan>

              {ehPedido ? (
                <div className="flex min-h-0 flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sobre a peça</p>
                    <button
                      type="button"
                      onClick={() => setImagem(null)}
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      Trocar imagem
                    </button>
                  </div>
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome da peça (ex.: Banner Black Friday)"
                    maxLength={120}
                    className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder="O que você quer que seja revisado? (opcional)"
                    rows={4}
                    maxLength={1500}
                    className="min-h-0 resize-none text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Quem revisar vai marcar na imagem o que precisa mudar. Depois da revisão, você ajusta e envia a nova versão.</p>
                </div>
              ) : (
              <div className="flex min-h-0 flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Apontamentos ({marcacoes.length})</p>
                  {inicial ? null : (
                    <button
                      type="button"
                      onClick={() => {
                        setImagem(null);
                        setMarcacoes([]);
                      }}
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      Trocar imagem
                    </button>
                  )}
                </div>

                {marcacoes.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    <MousePointerSquareDashed className="size-5 shrink-0" />
                    Escolha a ferramenta Marcar e clique em dois cantos (ou arraste) para marcar uma área.
                  </div>
                ) : (
                  <ol className="max-h-64 space-y-2 overflow-y-auto pr-1 lg:max-h-none lg:flex-1">
                    {marcacoes.map((m) => (
                      <li key={m.n} className={cn("rounded-lg border p-2 transition-colors", destaque === m.n && "border-red-500 bg-red-500/5")} onFocus={() => setDestaque(m.n)}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="grid h-5 min-w-5 place-items-center rounded bg-red-600 px-1 text-[11px] font-bold text-white">{m.n}</span>
                          <button type="button" onClick={() => remover(m.n)} aria-label={`Remover apontamento ${m.n}`} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive">
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <Textarea
                          id={`rev-texto-${m.n}`}
                          value={m.texto}
                          onChange={(e) => setMarcacoes((l) => l.map((x) => (x.n === m.n ? { ...x, texto: e.target.value } : x)))}
                          placeholder="O que precisa mudar aqui?"
                          rows={2}
                          maxLength={500}
                          className="min-h-0 resize-none text-sm"
                        />
                      </li>
                    ))}
                  </ol>
                )}

                <div className="space-y-2 border-t pt-3">
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted p-1">
                    {VEREDITOS_REVISOR.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setVeredito(k)}
                        className={cn("rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors", veredito === k ? VEREDITOS[k].classe : "text-muted-foreground hover:bg-background")}
                      >
                        {VEREDITOS[k].rotulo}
                      </button>
                    ))}
                  </div>
                  <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Comentário geral (opcional)" rows={2} maxLength={1500} className="min-h-0 resize-none text-sm" />
                </div>
              </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
              <p className="min-w-0 truncate text-sm text-destructive">{erro}</p>
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="outline" onClick={aoFechar} disabled={pendente}>
                  Cancelar
                </Button>
                <Button type="button" onClick={enviar} disabled={pendente}>
                  {pendente ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {ehPedido ? "Solicitar revisão" : "Enviar revisão"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
