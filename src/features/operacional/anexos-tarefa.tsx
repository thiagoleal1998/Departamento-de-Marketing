"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, Loader2, Paperclip, Trash2, Upload, X } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { useDialogo } from "@/components/shared/dialogo-provider";
import { listarAnexos, prepararEnvioAnexo, registrarAnexo, removerAnexo } from "./anexos-actions";
import {
  ACCEPT_ANEXO,
  BUCKET_ANEXOS,
  MAX_BYTES_ANEXO,
  TIPOS_ANEXO,
  tamanhoLegivel,
  type AnexoView,
} from "./anexos-tipos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const POR_EXTENSAO: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
};

/** Alguns navegadores deixam o tipo vazio (ex.: .csv, .docx): completa pela extensão. */
const tipoDe = (f: File) => f.type || POR_EXTENSAO[f.name.split(".").pop()?.toLowerCase() ?? ""] || "";

const dataBr = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Fotos e documentos anexados ao card (envio por arrastar, escolher arquivo ou colar com Ctrl+V). */
export function AnexosTarefa({ tarefaId }: { tarefaId: string }) {
  const { confirmar, avisar } = useDialogo();
  const [dados, setDados] = useState<{ itens: AnexoView[]; indisponivel?: boolean } | null>(null);
  const [enviando, setEnviando] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ampliada, setAmpliada] = useState<AnexoView | null>(null);
  const campo = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    setDados(await listarAnexos(tarefaId).catch(() => ({ itens: [], indisponivel: true })));
  }, [tarefaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!ampliada) return;
    const aoTecla = (e: KeyboardEvent) => e.key === "Escape" && setAmpliada(null);
    document.addEventListener("keydown", aoTecla);
    return () => document.removeEventListener("keydown", aoTecla);
  }, [ampliada]);

  async function enviar(arquivos: File[]) {
    if (arquivos.length === 0) return;
    setErro(null);
    setEnviando((n) => n + arquivos.length);
    const supabase = criarClienteBrowser();
    for (const f of arquivos) {
      try {
        const tipo = tipoDe(f);
        if (!TIPOS_ANEXO.includes(tipo)) {
          setErro(`"${f.name}": tipo não permitido. Use imagem, PDF, Word, Excel, PowerPoint, texto ou ZIP.`);
          continue;
        }
        if (f.size > MAX_BYTES_ANEXO) {
          setErro(`"${f.name}": o arquivo pode ter no máximo 20 MB.`);
          continue;
        }
        const prep = await prepararEnvioAnexo(tarefaId, f.name, tipo, f.size);
        if (prep.erro || !prep.caminho || !prep.token) {
          setErro(prep.erro ?? "Falha ao preparar o envio.");
          continue;
        }
        const { error } = await supabase.storage.from(BUCKET_ANEXOS).uploadToSignedUrl(prep.caminho, prep.token, f, { contentType: tipo });
        if (error) {
          setErro(`"${f.name}": não foi possível enviar. Tente novamente.`);
          continue;
        }
        const r = await registrarAnexo(tarefaId, { caminho: prep.caminho, nome: f.name, tipo, tamanho: f.size });
        if (r.erro) setErro(r.erro);
      } catch {
        setErro(`"${f.name}": não foi possível enviar. Tente novamente.`);
      } finally {
        setEnviando((n) => n - 1);
      }
    }
    await carregar();
    if (campo.current) campo.current.value = "";
  }

  async function remover(a: AnexoView) {
    const ok = await confirmar({
      titulo: "Remover este anexo?",
      descricao: a.nome,
      confirmar: "Remover",
      perigo: true,
    });
    if (!ok) return;
    const r = await removerAnexo(a.id);
    if (r.erro) void avisar(r.erro, "Não foi possível remover");
    else await carregar();
  }

  const itens = dados?.itens ?? [];
  const fotos = itens.filter((a) => a.ehImagem && a.url);
  const documentos = itens.filter((a) => !(a.ehImagem && a.url));

  return (
    <div
      className="space-y-3"
      onPaste={(e) => {
        const arqs = Array.from(e.clipboardData.files);
        if (arqs.length) {
          e.preventDefault();
          void enviar(arqs);
        }
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Paperclip className="size-4" /> Anexos {itens.length > 0 ? <span className="font-normal text-muted-foreground">({itens.length})</span> : null}
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={() => campo.current?.click()} disabled={dados?.indisponivel}>
          <Upload className="size-4" /> Anexar
        </Button>
      </div>
      <input ref={campo} type="file" multiple accept={ACCEPT_ANEXO} className="hidden" onChange={(e) => void enviar(Array.from(e.target.files ?? []))} />

      {dados?.indisponivel ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Os anexos ainda não foram ativados no banco (migration 0061).</p>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            void enviar(Array.from(e.dataTransfer.files));
          }}
          className={cn(
            "rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground transition-colors",
            arrastando ? "border-primary bg-primary/5 text-primary" : ""
          )}
        >
          {enviando > 0 ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Enviando {enviando} arquivo(s)…
            </span>
          ) : (
            "Arraste fotos e documentos aqui, clique em Anexar ou cole uma imagem (Ctrl+V). Até 20 MB por arquivo."
          )}
        </div>
      )}

      {erro ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p> : null}

      {dados === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Carregando anexos…
        </p>
      ) : null}

      {fotos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {fotos.map((a) => (
            <li key={a.id} className="group relative overflow-hidden rounded-lg border bg-muted/30">
              <button type="button" onClick={() => setAmpliada(a)} className="block w-full" title="Ampliar">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url!} alt={a.nome} className="h-28 w-full cursor-zoom-in object-cover" />
              </button>
              <div className="flex items-center justify-between gap-1 px-2 py-1 text-[11px]">
                <span className="truncate" title={`${a.nome} · ${a.criadoPorNome ?? ""} · ${dataBr(a.criadoEm)}`}>
                  {a.nome}
                </span>
                {a.podeExcluir ? (
                  <button type="button" onClick={() => void remover(a)} aria-label="Remover anexo" className="shrink-0 text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {documentos.length > 0 ? (
        <ul className="space-y-1.5">
          {documentos.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
              <FileText className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {[tamanhoLegivel(a.tamanho), a.criadoPorNome, dataBr(a.criadoEm)].filter(Boolean).join(" · ")}
                </p>
              </div>
              {a.url ? (
                <Button asChild variant="ghost" size="icon" className="size-8" aria-label="Abrir">
                  <a href={a.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              ) : null}
              {a.podeExcluir ? (
                <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Remover anexo" onClick={() => void remover(a)}>
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {ampliada ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={ampliada.nome}
          onClick={() => setAmpliada(null)}
        >
          <button type="button" aria-label="Fechar" onClick={() => setAmpliada(null)} className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25">
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ampliada.url!} alt={ampliada.nome} className="max-h-full max-w-full rounded-md object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </div>
  );
}
