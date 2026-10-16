"use client";

import { useRef, useState } from "react";
import { Film, ImageIcon, Loader2, Paperclip, X } from "lucide-react";
import { prepararEnvioAnexo } from "./anexos-actions";
import {
  BUCKET_FEEDBACK,
  MAX_ANEXOS,
  TIPOS_ANEXO,
  type AnexoSugestao,
} from "./anexos";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * Campo de anexos (imagens e vídeos) do formulário de Feedback.
 * Envia cada arquivo na hora e guarda a lista no campo oculto `anexos`.
 */
export function AnexosCampo({
  aoMudarEnvio,
  resetKey,
}: {
  /** Avisa o formulário se há envio em andamento (para travar o botão). */
  aoMudarEnvio?: (enviando: boolean) => void;
  /** Muda para limpar a lista (após enviar o formulário). */
  resetKey?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [anexos, setAnexos] = useState<AnexoSugestao[]>([]);
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [chave, setChave] = useState(resetKey);

  if (chave !== resetKey) {
    setChave(resetKey);
    setAnexos([]);
    setErro(null);
  }

  async function escolher(arquivos: FileList | null) {
    if (!arquivos || arquivos.length === 0) return;
    setErro(null);
    const lista = Array.from(arquivos);
    if (anexos.length + lista.length > MAX_ANEXOS) {
      setErro(`Envie no máximo ${MAX_ANEXOS} arquivos por relato.`);
      return;
    }
    const supabase = criarClienteBrowser();
    setEnviando((n) => n + lista.length);
    aoMudarEnvio?.(true);

    for (const arq of lista) {
      try {
        if (!TIPOS_ANEXO.includes(arq.type)) {
          setErro("Use imagens (PNG, JPG, GIF, WebP) ou vídeos (MP4, MOV, WebM).");
          continue;
        }
        const prep = await prepararEnvioAnexo(arq.name, arq.type, arq.size);
        if (prep.erro || !prep.caminho || !prep.token) {
          setErro(prep.erro ?? "Falha ao preparar o envio.");
          continue;
        }
        const { error } = await supabase.storage
          .from(BUCKET_FEEDBACK)
          .uploadToSignedUrl(prep.caminho, prep.token, arq, {
            contentType: arq.type,
          });
        if (error) {
          setErro(`Não foi possível enviar "${arq.name}".`);
          continue;
        }
        setAnexos((a) => [
          ...a,
          { caminho: prep.caminho!, nome: arq.name, tipo: arq.type, tamanho: arq.size },
        ]);
      } catch {
        setErro(`Não foi possível enviar "${arq.name}".`);
      } finally {
        setEnviando((n) => n - 1);
      }
    }
    aoMudarEnvio?.(false);
    if (ref.current) ref.current.value = "";
  }

  return (
    <div className="space-y-2">
      <input
        ref={ref}
        type="file"
        multiple
        accept={TIPOS_ANEXO.join(",")}
        className="hidden"
        onChange={(e) => escolher(e.target.files)}
      />
      <input type="hidden" name="anexos" value={JSON.stringify(anexos)} />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={enviando > 0 || anexos.length >= MAX_ANEXOS}
          onClick={() => ref.current?.click()}
        >
          {enviando > 0 ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Paperclip className="size-4" />
          )}
          Anexar imagens ou vídeos
        </Button>
        <span className="text-xs text-muted-foreground">
          Até {MAX_ANEXOS} arquivos, 50 MB cada.
        </span>
      </div>
      {anexos.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {anexos.map((a) => (
            <li
              key={a.caminho}
              className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
            >
              {a.tipo.startsWith("video/") ? (
                <Film className="size-3.5" />
              ) : (
                <ImageIcon className="size-3.5" />
              )}
              <span className="max-w-[180px] truncate">{a.nome}</span>
              <button
                type="button"
                aria-label={`Remover ${a.nome}`}
                onClick={() =>
                  setAnexos((l) => l.filter((x) => x.caminho !== a.caminho))
                }
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
    </div>
  );
}
