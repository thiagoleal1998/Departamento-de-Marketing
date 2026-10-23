"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/shared/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Loader2, MessageCircle, Send, X } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { enviarMensagem, marcarConversaLida } from "./actions";
import { abrirConversaFlutuante } from "./flutuante-actions";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  autor_id: string;
  texto: string;
  created_at: string;
}

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const CHAVE = "chat-flutuante-com";

/** Chat rápido flutuante: conversar com alguém sem sair da tela em que você está. */
export function ChatFlutuante({
  usuarioId,
  pessoas,
  naoLidas = 0,
}: {
  usuarioId: string;
  pessoas: { id: string; nome: string }[];
  naoLidas?: number;
}) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const [com, setCom] = useState<string>("");
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Msg[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  const nomes = new Map(pessoas.map((p) => [p.id, p.nome]));

  // Lembra com quem foi a última conversa.
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo && (salvo === "geral" || pessoas.some((p) => p.id === salvo))) setCom(salvo);
    } catch {
      /* sem armazenamento: segue sem lembrar */
    }
  }, [pessoas]);

  const abrirConversa = useCallback(async (alvo: string) => {
    if (!alvo) {
      setConversaId(null);
      setMensagens([]);
      return;
    }
    setCarregando(true);
    setErro(null);
    const r = await abrirConversaFlutuante(alvo === "geral" ? null : alvo);
    setCarregando(false);
    if (r.erro || !r.conversaId) {
      setErro(r.erro ?? "Não foi possível abrir a conversa.");
      return;
    }
    setConversaId(r.conversaId);
    setMensagens(r.mensagens ?? []);
    void marcarConversaLida(r.conversaId);
  }, []);

  useEffect(() => {
    if (aberto && com) void abrirConversa(com);
  }, [aberto, com, abrirConversa]);

  // Mensagens novas chegam na hora.
  useEffect(() => {
    if (!aberto || !conversaId) return;
    const supabase = criarClienteBrowser();
    const canal = supabase
      .channel("chat-flutuante-" + conversaId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_mensagens", filter: "conversa_id=eq." + conversaId }, (p) => {
        const m = p.new as Msg;
        setMensagens((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]));
        void marcarConversaLida(conversaId);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [aberto, conversaId]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [mensagens, aberto]);

  async function enviar() {
    if (!conversaId || !texto.trim() || enviando) return;
    setErro(null);
    setEnviando(true);
    const r = await enviarMensagem(conversaId, texto);
    setEnviando(false);
    if (r.erro) return setErro(r.erro);
    setTexto("");
  }

  // Na tela de Chat completa o atalho é desnecessário.
  if (caminho?.startsWith("/chat")) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-5 sm:right-5">
      {aberto ? (
        <div className="flex h-[480px] max-h-[calc(100vh-7rem)] w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b bg-primary px-3 py-2.5 text-primary-foreground">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <MessageCircle className="size-4" /> Chat rápido
            </span>
            <span className="flex items-center gap-1">
              {conversaId ? (
                <Link
                  href={com === "geral" ? "/chat" : "/chat?c=" + conversaId}
                  className="rounded p-1 hover:bg-white/15"
                  title="Abrir no chat completo"
                  aria-label="Abrir no chat completo"
                >
                  <ExternalLink className="size-4" />
                </Link>
              ) : null}
              <button type="button" onClick={() => setAberto(false)} className="rounded p-1 hover:bg-white/15" aria-label="Fechar chat">
                <X className="size-4" />
              </button>
            </span>
          </div>

          <div className="border-b p-2">
            <select
              value={com}
              onChange={(e) => {
                setCom(e.target.value);
                try {
                  localStorage.setItem(CHAVE, e.target.value);
                } catch {
                  /* ignora */
                }
              }}
              aria-label="Conversar com"
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Conversar com…</option>
              <option value="geral">Sala geral do time</option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {!com ? (
              <p className="pt-8 text-center text-sm text-muted-foreground">Escolha com quem quer conversar.</p>
            ) : carregando ? (
              <p className="flex items-center justify-center gap-2 pt-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Abrindo conversa…
              </p>
            ) : mensagens.length === 0 ? (
              <p className="pt-8 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda. Diga um oi!</p>
            ) : (
              mensagens.map((m) => {
                const minha = m.autor_id === usuarioId;
                return (
                  <div key={m.id} className={cn("flex", minha ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%] rounded-2xl px-3 py-1.5 text-sm", minha ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      {!minha && com === "geral" ? <p className="text-[11px] font-semibold opacity-70">{nomes.get(m.autor_id) ?? "—"}</p> : null}
                      <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                      <p className={cn("mt-0.5 text-right text-[10px]", minha ? "opacity-80" : "text-muted-foreground")}>{hora(m.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={fim} />
          </div>

          {erro ? <p className="border-t bg-destructive/10 px-3 py-1.5 text-xs text-destructive">{erro}</p> : null}
          <form
            className="flex items-end gap-2 border-t p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void enviar();
            }}
          >
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void enviar();
                }
              }}
              disabled={!conversaId}
              rows={1}
              maxLength={2000}
              placeholder={conversaId ? "Mensagem… (Enter envia)" : "Escolha uma pessoa"}
              aria-label="Mensagem"
              className="max-h-24 min-h-9 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!conversaId || !texto.trim() || enviando}
              aria-label="Enviar"
              className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={aberto ? "Fechar chat rápido" : "Abrir chat rápido"}
        title="Chat rápido"
        className="relative flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition hover:scale-105"
      >
        {aberto ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        {!aberto && naoLidas > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        ) : null}
      </button>
    </div>
  );
}
