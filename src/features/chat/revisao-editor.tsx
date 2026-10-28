"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Loader2, MousePointerSquareDashed, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { enviarRevisao } from "./revisao-actions";
import { PecaMarcada } from "./revisao-card";
import { MAX_MARCACOES, VEREDITOS, type MarcacaoRevisao, type VereditoRevisao } from "./revisao-tipos";

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
 * Revisão de peça dentro do chat: escolhe a imagem, desenha retângulos sobre o que precisa ser corrigido,
 * comenta cada apontamento e envia tudo como uma mensagem da conversa.
 */
export function RevisaoEditor({ conversaId, respostaA, aoFechar }: { conversaId: string; respostaA: string | null; aoFechar: () => void }) {
  const [imagem, setImagem] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [marcacoes, setMarcacoes] = useState<MarcacaoRevisao[]>([]);
  const [rascunho, setRascunho] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [destaque, setDestaque] = useState<number | null>(null);
  const [veredito, setVeredito] = useState<VereditoRevisao>("ajustes");
  const [comentario, setComentario] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [pendente, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const inicio = useRef<{ x: number; y: number } | null>(null);

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
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && !pendente && aoFechar();
    document.addEventListener("paste", colar);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("paste", colar);
      document.removeEventListener("keydown", tecla);
    };
  }, [receber, aoFechar, pendente]);

  const ponto = (e: React.PointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    return { x: limitar(((e.clientX - r.left) / r.width) * 100), y: limitar(((e.clientY - r.top) / r.height) * 100) };
  };

  function comecar(e: React.PointerEvent) {
    if (marcacoes.length >= MAX_MARCACOES) return setErro(`No máximo ${MAX_MARCACOES} apontamentos por peça.`);
    e.currentTarget.setPointerCapture(e.pointerId);
    inicio.current = ponto(e);
    setRascunho({ ...inicio.current, w: 0, h: 0 });
  }
  function mover(e: React.PointerEvent) {
    if (!inicio.current) return;
    const p = ponto(e);
    const i = inicio.current;
    setRascunho({ x: Math.min(i.x, p.x), y: Math.min(i.y, p.y), w: Math.abs(p.x - i.x), h: Math.abs(p.y - i.y) });
  }
  function terminar() {
    const r = rascunho;
    inicio.current = null;
    setRascunho(null);
    if (!r) return;
    // Um clique simples cria uma marcação pequena naquele ponto.
    const pequeno = r.w < MIN_ARRASTO && r.h < MIN_ARRASTO;
    const caixa = pequeno ? { x: limitar(r.x - 4), y: limitar(r.y - 4), w: 8, h: 8 } : r;
    const n = marcacoes.length + 1;
    setMarcacoes((l) => [...l, { n, ...caixa, texto: "" }]);
    setDestaque(n);
    setTimeout(() => document.getElementById(`rev-texto-${n}`)?.focus(), 30);
  }

  function remover(n: number) {
    setMarcacoes((l) => l.filter((m) => m.n !== n).map((m, i) => ({ ...m, n: i + 1 })));
    setDestaque(null);
  }

  function enviar() {
    if (!imagem) return;
    setErro(null);
    startTransition(async () => {
      const r = await enviarRevisao(conversaId, { imagem, nome, veredito, marcacoes, comentario, respostaA });
      if (r.erro) setErro(r.erro);
      else aoFechar();
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
      <div className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-background text-foreground shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="font-semibold">Revisar peça</h2>
            <p className="text-xs text-muted-foreground">Arraste sobre a imagem para marcar o que precisa ser corrigido e comente cada ponto.</p>
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
              <span className="font-medium">{lendo ? "Preparando a imagem…" : "Escolha a imagem da peça"}</span>
              <span className="text-sm text-muted-foreground">Clique, arraste um arquivo para cá ou cole um print (Ctrl+V). PNG, JPG ou WebP.</span>
            </button>
            {erro ? <p className="mt-3 text-sm text-destructive">{erro}</p> : null}
          </div>
        ) : (
          <>
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[1fr_340px]">
              <div className="flex min-h-0 items-start justify-center overflow-auto rounded-lg bg-muted/40 p-2">
                <PecaMarcada imagem={imagem} marcacoes={marcacoes} destaque={destaque} onDestaque={setDestaque} className="max-h-[62vh] w-auto">
                  <div
                    ref={area}
                    onPointerDown={comecar}
                    onPointerMove={mover}
                    onPointerUp={terminar}
                    onPointerCancel={() => {
                      inicio.current = null;
                      setRascunho(null);
                    }}
                    className="absolute inset-0 cursor-crosshair touch-none"
                  >
                    {rascunho ? (
                      <div
                        style={{ left: `${rascunho.x}%`, top: `${rascunho.y}%`, width: `${rascunho.w}%`, height: `${rascunho.h}%` }}
                        className="absolute rounded-[3px] border-2 border-dashed border-red-500 bg-red-500/15"
                      />
                    ) : null}
                  </div>
                </PecaMarcada>
              </div>

              <div className="flex min-h-0 flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Apontamentos ({marcacoes.length})</p>
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
                </div>

                {marcacoes.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    <MousePointerSquareDashed className="size-5 shrink-0" />
                    Arraste sobre a imagem para marcar uma área (ou clique para marcar um ponto).
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
                    {(Object.keys(VEREDITOS) as VereditoRevisao[]).map((k) => (
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
            </div>

            <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
              <p className="min-w-0 truncate text-sm text-destructive">{erro}</p>
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="outline" onClick={aoFechar} disabled={pendente}>
                  Cancelar
                </Button>
                <Button type="button" onClick={enviar} disabled={pendente}>
                  {pendente ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Enviar revisão
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
