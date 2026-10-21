"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ImageIcon, Loader2, Paperclip, X } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { criarSolicitacaoChat, prepararEnvioProva } from "./solicitacoes-actions";
import {
  BUCKET_SOLICITACOES,
  MAX_BYTES_PROVA,
  TIPOS_PROVA,
  TIPOS_SOLICITACAO,
  metaDoTipo,
  type TipoSolicitacao,
} from "./solicitacao-tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/** Formulário de solicitação de criação (separado das mensagens comuns do chat). */
export function SolicitacaoForm({
  conversaId,
  meuNome,
  aoFechar,
}: {
  conversaId: string;
  meuNome: string;
  aoFechar: () => void;
}) {
  const [tipo, setTipo] = useState<TipoSolicitacao>("landing_page");
  const [produto, setProduto] = useState("");
  const [link, setLink] = useState("");
  const [solicitante, setSolicitante] = useState(meuNome);
  const [prazo, setPrazo] = useState("");
  const [detalhes, setDetalhes] = useState("");
  const [prova, setProva] = useState<{ caminho: string; nome: string; previa: string | null } | null>(null);
  const [enviandoProva, setEnviandoProva] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();
  const arq = useRef<HTMLInputElement>(null);

  const meta = metaDoTipo(tipo);

  useEffect(() => {
    function aoTecla(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", aoTecla);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTecla);
      document.body.style.overflow = anterior;
    };
  }, [aoFechar]);

  async function escolherProva(arquivos: FileList | null) {
    const f = arquivos?.[0];
    if (!f) return;
    setErro(null);
    if (!TIPOS_PROVA.includes(f.type)) return setErro("Use uma imagem (PNG, JPG, WebP, GIF) ou PDF.");
    if (f.size > MAX_BYTES_PROVA) return setErro("O arquivo pode ter no máximo 10 MB.");
    setEnviandoProva(true);
    try {
      const prep = await prepararEnvioProva(f.name, f.type, f.size);
      if (prep.erro || !prep.caminho || !prep.token) return setErro(prep.erro ?? "Falha ao preparar o envio.");
      const { error } = await criarClienteBrowser()
        .storage.from(BUCKET_SOLICITACOES)
        .uploadToSignedUrl(prep.caminho, prep.token, f, { contentType: f.type });
      if (error) return setErro("Não foi possível enviar o arquivo. Tente novamente.");
      setProva({ caminho: prep.caminho, nome: f.name, previa: f.type.startsWith("image/") ? URL.createObjectURL(f) : null });
    } catch {
      setErro("Não foi possível enviar o arquivo. Tente novamente.");
    } finally {
      setEnviandoProva(false);
      if (arq.current) arq.current.value = "";
    }
  }

  // Cola um print direto da área de transferência (Ctrl+V).
  function aoColar(e: React.ClipboardEvent) {
    const f = Array.from(e.clipboardData.files).find((x) => x.type.startsWith("image/"));
    if (f) {
      const dt = new DataTransfer();
      dt.items.add(f);
      void escolherProva(dt.files);
    }
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    start(async () => {
      const r = await criarSolicitacaoChat(conversaId, {
        tipo,
        produto,
        linkReferencia: link,
        solicitante,
        prazo: prazo || null,
        detalhes,
        prova: prova ? { caminho: prova.caminho, nome: prova.nome } : null,
      });
      if (r.erro) setErro(r.erro);
      else aoFechar();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <form
        onSubmit={enviar}
        onPaste={aoColar}
        role="dialog"
        aria-modal="true"
        aria-label="Solicitar criação"
        className="w-full max-w-xl space-y-4 rounded-xl border bg-card p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Solicitar criação</h2>
            <p className="text-sm text-muted-foreground">Pedido estruturado: aparece na conversa como um cartão próprio, com andamento.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={aoFechar}>
            <X className="size-5" />
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sol-tipo">O que você precisa? *</Label>
          <Select id="sol-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoSolicitacao)}>
            {TIPOS_SOLICITACAO.map((t) => (
              <option key={t.id} value={t.id}>
                {t.rotulo}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sol-produto">{meta.rotuloProduto} *</Label>
            <Input id="sol-produto" value={produto} onChange={(e) => setProduto(e.target.value)} maxLength={200} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sol-quem">Quem solicitou *</Label>
            <Input id="sol-quem" value={solicitante} onChange={(e) => setSolicitante(e.target.value)} maxLength={120} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sol-prazo">Prazo desejado</Label>
            <Input id="sol-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sol-link">Link de referência{meta.exigeReferencia ? " *" : ""}</Label>
            <Input
              id="sol-link"
              type="url"
              inputMode="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://"
              required={meta.exigeReferencia}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sol-det">Detalhes</Label>
            <Textarea id="sol-det" value={detalhes} onChange={(e) => setDetalhes(e.target.value)} rows={3} maxLength={3000} placeholder="Objetivo, medidas, referências, o que espera receber…" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Print de prova da solicitação{meta.exigeProva ? " *" : ""}</Label>
          <input ref={arq} type="file" accept={TIPOS_PROVA.join(",")} className="hidden" onChange={(e) => escolherProva(e.target.files)} />
          {prova ? (
            <div className="flex items-center gap-3 rounded-lg border p-2">
              {prova.previa ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={prova.previa} alt="Prévia do print" className="size-16 shrink-0 rounded object-cover" />
              ) : (
                <span className="flex size-16 shrink-0 items-center justify-center rounded bg-muted">
                  <ImageIcon className="size-6" />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm">{prova.nome}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setProva(null)}>
                Trocar
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" disabled={enviandoProva} onClick={() => arq.current?.click()} className="w-full justify-start">
              {enviandoProva ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
              Anexar o print (ou cole com Ctrl+V)
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Imagem ou PDF de até 10 MB. É a prova de que o pedido foi feito (por exemplo, a conversa ou e-mail do solicitante).
          </p>
        </div>

        {erro ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pendente || enviandoProva}>
            {pendente ? <Loader2 className="size-4 animate-spin" /> : null} Enviar solicitação
          </Button>
        </div>
      </form>
    </div>
  );
}
