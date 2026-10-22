"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MessagesSquare, Send } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { historicoChatTarefa, type MensagemDaTarefa } from "@/features/chat/vinculos-actions";
import { conversarSobreCard } from "./conversa-card-actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Conversa sobre o card: inicia o papo com alguém e acompanha as mensagens ligadas a ele. */
export function ConversaDoCard({
  tarefaId,
  pessoas,
  usuarioId,
  responsavelId,
}: {
  tarefaId: string;
  pessoas: { id: string; nome: string }[];
  usuarioId: string;
  responsavelId: string | null;
}) {
  const outras = pessoas.filter((p) => p.id !== usuarioId);
  const [dados, setDados] = useState<{ conversaId: string | null; mensagens: MensagemDaTarefa[] } | null>(null);
  const [com, setCom] = useState(
    responsavelId && responsavelId !== usuarioId ? responsavelId : ""
  );
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    setDados(await historicoChatTarefa(tarefaId).catch(() => ({ conversaId: null, mensagens: [] })));
  }, [tarefaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Mensagens novas sobre este card chegam na hora.
  useEffect(() => {
    const supabase = criarClienteBrowser();
    const canal = supabase
      .channel("conversa-card-" + tarefaId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_mensagens", filter: "tarefa_id=eq." + tarefaId }, () => void carregar())
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [tarefaId, carregar]);

  async function enviar() {
    setErro(null);
    if (!com) return setErro("Escolha com quem conversar.");
    if (!texto.trim()) return;
    setEnviando(true);
    const r = await conversarSobreCard(tarefaId, com, texto);
    setEnviando(false);
    if (r.erro) return setErro(r.erro);
    setTexto("");
    await carregar();
  }

  const mensagens = dados?.mensagens ?? [];

  return (
    <section className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <MessagesSquare className="size-4" /> Conversa sobre este card
        </h3>
        {dados?.conversaId ? (
          <Link href={"/chat?c=" + dados.conversaId} className="text-xs font-medium text-primary hover:underline">
            Abrir no chat
          </Link>
        ) : null}
      </div>

      {mensagens.length > 0 ? (
        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {mensagens.map((m) => (
            <li key={m.id} className="rounded-md border bg-background p-2 text-sm">
              <p className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{m.autor}</span>
                <span>{quando(m.quando)}</span>
              </p>
              <p className="mt-0.5 whitespace-pre-wrap break-words">{m.texto}</p>
            </li>
          ))}
        </ul>
      ) : dados ? (
        <p className="text-xs text-muted-foreground">Ainda não há conversa sobre este card. Escolha alguém e envie a primeira mensagem.</p>
      ) : (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Carregando…
        </p>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-muted-foreground">Conversar com</span>
          <Select value={com} onChange={(e) => setCom(e.target.value)} aria-label="Conversar com" className="h-9">
            <option value="">Selecione…</option>
            {outras.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void enviar();
              }
            }}
            placeholder="Escreva sobre este card… (Enter envia, Shift+Enter quebra a linha)"
            rows={2}
            maxLength={2000}
            className="min-h-[44px]"
          />
          <Button type="button" onClick={() => void enviar()} disabled={enviando || !texto.trim() || !com} aria-label="Enviar mensagem">
            {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
        {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
        <p className="text-[11px] text-muted-foreground">A mensagem vai para o chat da pessoa, com este card anexado à conversa.</p>
      </div>
    </section>
  );
}
