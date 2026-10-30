"use client";

/* eslint-disable @next/next/no-img-element */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Loader2, Mic, Send, Square, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { enviarAnexo } from "./anexo-actions";
import { imagemDaColagem } from "./colagem";
import { duracaoTexto, MAX_BYTES_ANEXO, MAX_SEGUNDOS_GRAVACAO, TIPOS_AUDIO, TIPOS_IMAGEM } from "./anexo-tipos";

type Rascunho = { blob: Blob; nome: string; url: string; tipo: "imagem" | "audio"; duracao?: number };

const MAX_LADO = 1600;

/** Reduz fotos grandes no navegador (GIFs seguem como estão, para não perder a animação). */
async function reduzirImagem(arquivo: File): Promise<{ blob: Blob; nome: string }> {
  if (arquivo.type === "image/gif" || arquivo.size < 400 * 1024) return { blob: arquivo, nome: arquivo.name };
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error("imagem"));
      i.src = url;
    });
    const k = Math.min(1, MAX_LADO / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    const ctx = c.getContext("2d");
    if (!ctx) return { blob: arquivo, nome: arquivo.name };
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.85));
    return blob ? { blob, nome: arquivo.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg" } : { blob: arquivo, nome: arquivo.name };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const FORMATOS_GRAVACAO = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

/** O que a caixa de mensagem pode pedir a este componente. */
export interface ComandosAnexo {
  escolherArquivo: () => void;
  gravar: () => void;
  colarImagem: (dados: DataTransfer) => boolean;
}

/**
 * Envio de imagem e áudio (a caixa de mensagem chama `escolherArquivo` ou `gravar`). Abre uma janela de conferência
 * (prévia da imagem ou player do áudio, com legenda) antes de enviar para a conversa.
 */
export const AnexoEnvio = forwardRef<ComandosAnexo, { conversaId: string; respostaA?: string | null; aoEnviado?: () => void }>(function AnexoEnvio(
  { conversaId, respostaA, aoEnviado },
  refExterno
) {
  const [aberto, setAberto] = useState<"escolha" | "gravando" | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [legenda, setLegenda] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [pendente, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const gravador = useRef<MediaRecorder | null>(null);
  const fluxo = useRef<MediaStream | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const relogio = useRef<ReturnType<typeof setInterval> | null>(null);
  const descartar = useRef(false);

  const soltarMicrofone = useCallback(() => {
    if (relogio.current) clearInterval(relogio.current);
    relogio.current = null;
    fluxo.current?.getTracks().forEach((t) => t.stop());
    fluxo.current = null;
  }, []);

  const fechar = useCallback(() => {
    descartar.current = true;
    if (gravador.current && gravador.current.state !== "inactive") gravador.current.stop();
    gravador.current = null;
    soltarMicrofone();
    setRascunho((r) => {
      if (r) URL.revokeObjectURL(r.url);
      return null;
    });
    setAberto(null);
    setLegenda("");
    setErro(null);
    setSegundos(0);
  }, [soltarMicrofone]);

  useImperativeHandle(refExterno, () => ({
    escolherArquivo: () => input.current?.click(),
    gravar: () => void comecarGravacao(),
    colarImagem: (dados) => {
      const arquivo = imagemDaColagem(dados);
      if (!arquivo) return false; // Colagem de texto continua funcionando normalmente.
      if (!pendente && aberto !== "gravando") {
        setAberto("escolha");
        void receberArquivo(arquivo);
      }
      return true;
    },
  }));

  // Ao sair da tela com o microfone aberto, solta o microfone.
  useEffect(() => () => soltarMicrofone(), [soltarMicrofone]);

  useEffect(() => {
    if (!aberto) return;
    const t = (e: KeyboardEvent) => e.key === "Escape" && !pendente && fechar();
    document.addEventListener("keydown", t);
    return () => document.removeEventListener("keydown", t);
  }, [aberto, pendente, fechar]);

  async function receberArquivo(arquivo: File | undefined | null) {
    if (!arquivo) return;
    const tipo = arquivo.type.split(";")[0];
    const ehImagem = TIPOS_IMAGEM.includes(tipo);
    if (!ehImagem && !TIPOS_AUDIO.includes(tipo)) return setErro("Use uma imagem (PNG, JPG, WebP, GIF) ou um áudio (WebM, OGG, M4A, MP3, WAV).");
    if (arquivo.size > 30 * 1024 * 1024) return setErro("O arquivo é muito grande (máx. 15 MB).");
    setErro(null);
    let pronto: { blob: Blob; nome: string } = { blob: arquivo, nome: arquivo.name };
    if (ehImagem) {
      try {
        pronto = await reduzirImagem(arquivo);
      } catch {
        return setErro("Não foi possível ler esta imagem.");
      }
    }
    if (pronto.blob.size > MAX_BYTES_ANEXO) return setErro("O arquivo pode ter no máximo 15 MB.");
    setRascunho((r) => {
      if (r) URL.revokeObjectURL(r.url);
      return { blob: pronto.blob, nome: pronto.nome, url: URL.createObjectURL(pronto.blob), tipo: ehImagem ? "imagem" : "audio" };
    });
    setAberto("escolha");
  }

  async function comecarGravacao() {
    setErro(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setAberto("escolha");
      return setErro("Este navegador não permite gravar áudio. Use o botão de imagem/áudio para enviar um arquivo.");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      fluxo.current = stream;
      const formato = FORMATOS_GRAVACAO.find((f) => MediaRecorder.isTypeSupported(f));
      const rec = new MediaRecorder(stream, formato ? { mimeType: formato } : undefined);
      const inicio = Date.now();
      pedacos.current = [];
      descartar.current = false;
      rec.ondataavailable = (e) => e.data.size > 0 && pedacos.current.push(e.data);
      rec.onstop = () => {
        const duracao = Math.max(1, Math.round((Date.now() - inicio) / 1000));
        soltarMicrofone();
        if (descartar.current) return;
        const tipo = (rec.mimeType || formato || "audio/webm").split(";")[0];
        const blob = new Blob(pedacos.current, { type: tipo });
        const ext = tipo.includes("mp4") ? "m4a" : tipo.includes("ogg") ? "ogg" : "webm";
        setRascunho({ blob, nome: `voz.${ext}`, url: URL.createObjectURL(blob), tipo: "audio", duracao });
        setAberto("escolha");
      };
      rec.start();
      gravador.current = rec;
      setSegundos(0);
      setAberto("gravando");
      relogio.current = setInterval(() => {
        const s = Math.round((Date.now() - inicio) / 1000);
        setSegundos(s);
        if (s >= MAX_SEGUNDOS_GRAVACAO && rec.state !== "inactive") rec.stop();
      }, 250);
    } catch {
      soltarMicrofone();
      setAberto("escolha");
      setErro("Não consegui usar o microfone. Libere a permissão do navegador para este site e tente de novo.");
    }
  }

  function pararGravacao() {
    if (gravador.current && gravador.current.state !== "inactive") gravador.current.stop();
  }

  function enviar() {
    if (!rascunho) return;
    setErro(null);
    const dados = new FormData();
    dados.set("arquivo", new File([rascunho.blob], rascunho.nome, { type: rascunho.blob.type }));
    dados.set("legenda", legenda);
    if (respostaA) dados.set("resposta_a", respostaA);
    if (rascunho.duracao) dados.set("duracao", String(rascunho.duracao));
    startTransition(async () => {
      const r = await enviarAnexo(conversaId, dados);
      if (r.erro) setErro(r.erro);
      else {
        fechar();
        aoEnviado?.();
      }
    });
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={[...TIPOS_IMAGEM, ...TIPOS_AUDIO].join(",")}
        className="hidden"
        onChange={(e) => {
          void receberArquivo(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {aberto
        ? createPortal(
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
              <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-background text-foreground shadow-2xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <h2 className="font-semibold">{aberto === "gravando" ? "Gravando…" : rascunho?.tipo === "audio" ? "Enviar áudio" : "Enviar imagem"}</h2>
                  <button type="button" onClick={fechar} disabled={pendente} aria-label="Fechar" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <X className="size-5" />
                  </button>
                </div>

                <div className="space-y-3 p-4">
                  {aberto === "gravando" ? (
                    <div className="flex flex-col items-center gap-4 py-6">
                      <span className="relative grid size-20 place-items-center rounded-full bg-red-500/10">
                        <span className="absolute inset-0 animate-ping rounded-full bg-red-500/20" />
                        <Mic className="relative size-8 text-red-600" />
                      </span>
                      <p className="font-mono text-2xl font-semibold tabular-nums">
                        {duracaoTexto(segundos)} <span className="text-sm font-normal text-muted-foreground">/ {duracaoTexto(MAX_SEGUNDOS_GRAVACAO)}</span>
                      </p>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={fechar}>
                          <Trash2 className="size-4" /> Descartar
                        </Button>
                        <Button type="button" onClick={pararGravacao} className="bg-red-600 text-white hover:bg-red-700">
                          <Square className="size-4 fill-current" /> Parar
                        </Button>
                      </div>
                    </div>
                  ) : rascunho ? (
                    <>
                      {rascunho.tipo === "imagem" ? (
                        <img src={rascunho.url} alt="Prévia" className="mx-auto max-h-72 w-auto rounded-lg object-contain" />
                      ) : (
                        <div className="flex items-center gap-3 rounded-xl bg-muted px-3 py-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                            <Mic className="size-5" />
                          </span>
                          <audio controls src={rascunho.url} className="h-9 min-w-0 flex-1" />
                          {rascunho.duracao ? <span className="shrink-0 text-xs text-muted-foreground">{duracaoTexto(rascunho.duracao)}</span> : null}
                        </div>
                      )}
                      <Input
                        value={legenda}
                        onChange={(e) => setLegenda(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !pendente && enviar()}
                        placeholder="Adicionar uma legenda (opcional)"
                        maxLength={1500}
                        autoFocus
                      />
                      <div className={cn("flex items-center gap-2", erro ? "justify-between" : "justify-end")}>
                        {erro ? <p className="min-w-0 flex-1 text-sm text-destructive">{erro}</p> : null}
                        <div className="flex shrink-0 gap-2">
                          {rascunho.tipo === "audio" && rascunho.duracao ? (
                            <Button type="button" variant="outline" onClick={() => void comecarGravacao()} disabled={pendente}>
                              Regravar
                            </Button>
                          ) : null}
                          <Button type="button" onClick={enviar} disabled={pendente}>
                            {pendente ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                            Enviar
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className={cn("py-4 text-center text-sm", erro ? "text-destructive" : "text-muted-foreground")}>{erro ?? "Nada selecionado."}</p>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
});
