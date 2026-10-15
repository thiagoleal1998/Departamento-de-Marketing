"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Loader2 } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { enviarMensagem, marcarConversaLida } from "./actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface MensagemView {
  id: string;
  autor_id: string;
  texto: string;
  created_at: string;
}

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatJanela({
  conversaId,
  meuId,
  mensagensIniciais,
  nomes,
}: {
  conversaId: string;
  meuId: string;
  mensagensIniciais: MensagemView[];
  nomes: Record<string, string>;
}) {
  const [mensagens, setMensagens] = useState<MensagemView[]>(mensagensIniciais);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const fimRef = useRef<HTMLDivElement>(null);

  // Reinicia ao trocar de conversa.
  useEffect(() => {
    setMensagens(mensagensIniciais);
  }, [conversaId, mensagensIniciais]);

  // Tempo real: novas mensagens da conversa.
  useEffect(() => {
    const supabase = criarClienteBrowser();
    const canal = supabase
      .channel(`chat-${conversaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_mensagens",
          filter: `conversa_id=eq.${conversaId}`,
        },
        (payload) => {
          const m = payload.new as MensagemView;
          setMensagens((atual) =>
            atual.some((x) => x.id === m.id) ? atual : [...atual, m]
          );
          if (m.autor_id !== meuId) {
            void marcarConversaLida(conversaId);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [conversaId, meuId]);

  // Marca como lida ao abrir.
  useEffect(() => {
    void marcarConversaLida(conversaId);
  }, [conversaId]);

  // Rola para a última mensagem.
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || pendente) return;
    setErro(null);
    startTransition(async () => {
      const res = await enviarMensagem(conversaId, conteudo);
      if (res.erro) setErro(res.erro);
      else setTexto("");
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {mensagens.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Ainda não há mensagens. Diga olá! 👋
          </p>
        ) : (
          mensagens.map((m) => {
            const minha = m.autor_id === meuId;
            return (
              <div
                key={m.id}
                className={cn("flex", minha ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                    minha
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted"
                  )}
                >
                  {!minha ? (
                    <p className="mb-0.5 text-xs font-semibold opacity-80">
                      {nomes[m.autor_id] ?? "—"}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                  <p
                    className={cn(
                      "mt-0.5 text-right text-[10px]",
                      minha ? "opacity-80" : "text-muted-foreground"
                    )}
                  >
                    {hora(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={fimRef} />
      </div>

      <form onSubmit={enviar} className="border-t p-3">
        {erro ? <p className="mb-2 text-xs text-destructive">{erro}</p> : null}
        <div className="flex gap-2">
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva uma mensagem…"
            maxLength={2000}
            autoComplete="off"
          />
          <Button type="submit" disabled={pendente || !texto.trim()}>
            {pendente ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            <span className="sr-only sm:not-sr-only">Enviar</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
