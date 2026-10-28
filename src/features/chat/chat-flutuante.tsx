"use client";

import { Select } from "@/components/ui/select";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/shared/link";
import { usePathname } from "next/navigation";
import { ExternalLink, ImageIcon, Loader2, MessageCircle, Mic, Paperclip, Send, Smile, X } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { enviarMensagem, marcarConversaLida } from "./actions";
import { abrirConversaFlutuante, naoLidasPorConversa } from "./flutuante-actions";
import { CONVERSA_GERAL } from "./constantes";
import { BarraResposta, BotaoResponder, Citacao } from "./citacao";
import { ReacoesDaMensagem, SeletorReacao, useReacoes } from "./reacoes";
import { IndicadorDigitando, useDigitando } from "./digitando";
import { StatusLeitura, useLeituras } from "./leituras";
import { RevisaoCard } from "./revisao-card";
import { tocarSomChat } from "./som";
import { AnexoMensagem } from "./anexo-mensagem";
import { AnexoEnvio, type ComandosAnexo } from "./anexo-envio";
import { GradeEmojis, ItemMenu, MenuSuspenso } from "./menu-chat";
import { TEXTOS_AUTOMATICOS, type AnexoChat } from "./anexo-tipos";
import type { RevisaoPeca } from "./revisao-tipos";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  autor_id: string;
  texto: string;
  created_at: string;
  resposta_a?: string | null;
  revisao?: RevisaoPeca | null;
  anexo?: AnexoChat | null;
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
  const [respondendoA, setRespondendoA] = useState<Msg | null>(null);
  // Não lidas por conversa ("geral" ou id da pessoa) e o aviso da última mensagem que chegou.
  const [porConversa, setPorConversa] = useState<Record<string, number> | null>(null);
  const [aviso, setAviso] = useState<{ chave: string; autor: string; texto: string } | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const caixa = useRef<HTMLTextAreaElement>(null);
  const anexo = useRef<ComandosAnexo>(null);
  // Ao clicar em Responder, o cursor já vai para a caixa de mensagem.
  useEffect(() => {
    if (respondendoA) caixa.current?.focus();
  }, [respondendoA]);
  // Na tela de Chat completa (onde este atalho some) quem escuta a conversa é o próprio chat.
  const ativoAgora = aberto && !caminho?.startsWith("/chat");
  const { lista: reacoes, reagir } = useReacoes(ativoAgora ? conversaId : null, usuarioId);
  const { digitando, avisarDigitando, parouDeDigitar } = useDigitando(ativoAgora ? conversaId : null, usuarioId);
  const leituras = useLeituras(ativoAgora ? conversaId : null);
  const atual = useRef({ aberto, com });
  atual.current = { aberto, com };

  const nomes = new Map(pessoas.map((p) => [p.id, p.nome]));
  const total = porConversa ? Object.values(porConversa).reduce((s, n) => s + n, 0) : naoLidas;
  const contagem = (chave: string) => porConversa?.[chave] ?? 0;
  const quem = (m: Msg) => (m.autor_id === usuarioId ? "Você" : nomes.get(m.autor_id) ?? "—");

  function irPara(id: string) {
    const el = document.getElementById("cf-msg-" + id);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.classList.add("ring-2", "ring-primary");
    setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 1500);
  }

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
    setRespondendoA(null);
    const r = await abrirConversaFlutuante(alvo === "geral" ? null : alvo);
    setCarregando(false);
    if (r.erro || !r.conversaId) {
      setErro(r.erro ?? "Não foi possível abrir a conversa.");
      return;
    }
    setConversaId(r.conversaId);
    setMensagens(r.mensagens ?? []);
    void marcarConversaLida(r.conversaId);
    setPorConversa((p) => (p ? { ...p, [alvo]: 0 } : p));
    setAviso((a) => (a?.chave === alvo ? null : a));
  }, []);

  // Contagem de não lidas por conversa (sala geral e cada pessoa), atualizada quando o servidor recalcula.
  useEffect(() => {
    let vivo = true;
    void naoLidasPorConversa().then((c) => vivo && setPorConversa(c));
    return () => {
      vivo = false;
    };
  }, [naoLidas]);

  // Mensagem nova em QUALQUER conversa: conta, mostra o aviso e marca a conversa no seletor.
  useEffect(() => {
    const supabase = criarClienteBrowser();
    const canal = supabase
      .channel("chat-flutuante-avisos-" + usuarioId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_mensagens" }, (p) => {
        const m = p.new as Msg & { conversa_id: string };
        if (m.autor_id === usuarioId) return;
        tocarSomChat();
        const chave = m.conversa_id === CONVERSA_GERAL ? "geral" : m.autor_id;
        // A conversa aberta no chat rápido já mostra a mensagem e marca como lida.
        if (atual.current.aberto && atual.current.com === chave) return;
        setPorConversa((c) => ({ ...(c ?? {}), [chave]: ((c ?? {})[chave] ?? 0) + 1 }));
        setAviso({ chave, autor: m.autor_id, texto: m.texto });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [usuarioId]);

  // O aviso some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 9000);
    return () => clearTimeout(t);
  }, [aviso]);

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
        tocarSomChat();
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
    const r = await enviarMensagem(conversaId, texto, respondendoA?.id ?? null);
    setEnviando(false);
    if (r.erro) return setErro(r.erro);
    setTexto("");
    setRespondendoA(null);
    parouDeDigitar();
  }

  function escolher(chave: string) {
    setCom(chave);
    try {
      localStorage.setItem(CHAVE, chave);
    } catch {
      /* ignora */
    }
  }

  function abrirAviso() {
    if (!aviso) return;
    escolher(aviso.chave);
    setAberto(true);
    setAviso(null);
  }

  const resumoAviso = aviso ? `${nomes.get(aviso.autor) ?? "Alguém"}${aviso.chave === "geral" ? " · Sala geral" : ""}` : "";

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
            <Select
              value={com}
              onChange={(e) => escolher(e.target.value)}
              aria-label="Conversar com"
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Conversar com…</option>
              <option value="geral">
                {contagem("geral") > 0 ? `● (${contagem("geral")}) ` : ""}Sala geral do time
              </option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>
                  {contagem(p.id) > 0 ? `● (${contagem(p.id)}) ` : ""}
                  {p.nome}
                </option>
              ))}
            </Select>
            {aviso && (aviso.chave !== com || !aberto) ? (
              <button
                type="button"
                onClick={abrirAviso}
                className="mt-2 flex w-full items-start gap-2 rounded-md bg-primary/10 px-2.5 py-1.5 text-left text-xs hover:bg-primary/15"
              >
                <MessageCircle className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <strong>{resumoAviso}</strong> <span className="block truncate text-muted-foreground">{aviso.texto}</span>
                </span>
              </button>
            ) : null}
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
                const original = m.resposta_a ? mensagens.find((x) => x.id === m.resposta_a) : undefined;
                const dela = reacoes.filter((r) => r.mensagem_id === m.id);
                const botao = (
                  <div className="flex items-center self-center">
                    <SeletorReacao atual={dela.find((r) => r.usuario_id === usuarioId)?.emoji} onEscolher={(e) => void reagir(m.id, e)} />
                    <BotaoResponder nome={quem(m)} onClick={() => setRespondendoA(m)} />
                  </div>
                );
                return (
                  <div key={m.id} className={cn("group flex gap-1", minha ? "justify-end" : "justify-start")}>
                    {minha ? botao : null}
                    <div
                      id={"cf-msg-" + m.id}
                      className={cn("max-w-[85%] rounded-2xl px-3 py-1.5 text-sm transition-shadow", minha ? "bg-primary text-primary-foreground" : "bg-muted")}
                    >
                      {!minha && com === "geral" ? <p className="text-[11px] font-semibold opacity-70">{nomes.get(m.autor_id) ?? "—"}</p> : null}
                      {m.resposta_a ? (
                        <Citacao nome={original ? quem(original) : "Mensagem anterior"} texto={original?.texto ?? null} minha={minha} onIr={original ? () => irPara(original.id) : undefined} />
                      ) : null}
                      {m.revisao?.imagem ? <RevisaoCard revisao={m.revisao} minha={minha} /> : null}
                      {m.anexo?.url ? <AnexoMensagem anexo={m.anexo} /> : null}
                      {m.anexo?.url && TEXTOS_AUTOMATICOS.includes(m.texto) ? null : <p className="whitespace-pre-wrap break-words">{m.texto}</p>}
                      <ReacoesDaMensagem reacoes={dela} usuarioId={usuarioId} nomeDe={(id) => nomes.get(id) ?? "—"} onReagir={(e) => void reagir(m.id, e)} minha={minha} />
                      <p className={cn("mt-0.5 text-right text-[10px]", minha ? "opacity-80" : "text-muted-foreground")}>
                        {hora(m.created_at)}
                        {minha ? (
                          <>
                            {" · "}
                            <StatusLeitura
                              leituras={leituras.filter((l) => l.mensagem_id === m.id && l.usuario_id !== usuarioId)}
                              nomeDe={(id) => nomes.get(id) ?? "—"}
                              ehGeral={com === "geral"}
                            />
                          </>
                        ) : null}
                      </p>
                    </div>
                    {!minha ? botao : null}
                  </div>
                );
              })
            )}
            <div ref={fim} />
          </div>

          {erro ? <p className="border-t bg-destructive/10 px-3 py-1.5 text-xs text-destructive">{erro}</p> : null}
          {conversaId ? <IndicadorDigitando ids={digitando} nomeDe={(id) => nomes.get(id) ?? "Alguém"} /> : null}
          {respondendoA ? <BarraResposta nome={quem(respondendoA)} texto={respondendoA.texto} onCancelar={() => setRespondendoA(null)} /> : null}
          <form
            className="border-t p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void enviar();
            }}
          >
            <div className="flex items-end gap-0.5 rounded-3xl border bg-muted/40 px-1 py-1">
              <MenuSuspenso icone={<Paperclip className="size-5" />} rotulo="Anexar" titulo="Anexar">
                {(fechar) => (
                  <ItemMenu
                    icone={<ImageIcon className="size-4" />}
                    cor="bg-violet-500/15 text-violet-500"
                    texto="Imagem ou áudio"
                    detalhe="Enviar um arquivo"
                    onClick={() => {
                      fechar();
                      anexo.current?.escolherArquivo();
                    }}
                  />
                )}
              </MenuSuspenso>
              <MenuSuspenso icone={<Smile className="size-5" />} rotulo="Emojis" largura="w-[19.5rem] max-w-[calc(100vw-3rem)]">
                {() => (
                  <GradeEmojis
                    aoEscolher={(e) => {
                      setTexto((t) => t + e);
                      caixa.current?.focus();
                    }}
                  />
                )}
              </MenuSuspenso>
            <textarea
              ref={caixa}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                if (e.target.value.trim()) avisarDigitando();
                else parouDeDigitar();
              }}
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
              className="max-h-24 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
            />
              {texto.trim() ? (
                <button
                  type="submit"
                  disabled={!conversaId || enviando}
                  aria-label="Enviar"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!conversaId}
                  onClick={() => anexo.current?.gravar()}
                  aria-label="Gravar áudio"
                  title="Gravar mensagem de voz"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  <Mic className="size-4" />
                </button>
              )}
            </div>
            {conversaId ? <AnexoEnvio ref={anexo} conversaId={conversaId} respostaA={respondendoA?.id ?? null} aoEnviado={() => setRespondendoA(null)} /> : null}
          </form>
        </div>
      ) : null}

      {!aberto && aviso ? (
        <button
          type="button"
          onClick={abrirAviso}
          className="flex w-72 max-w-[calc(100vw-2rem)] items-start gap-2 rounded-2xl border bg-card px-3 py-2 text-left text-sm shadow-xl animate-in fade-in-0 slide-in-from-bottom-2"
        >
          <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="min-w-0">
            <strong className="block text-xs">{resumoAviso}</strong>
            <span className="line-clamp-2 break-words text-muted-foreground">{aviso.texto}</span>
          </span>
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={aberto ? "Fechar chat rápido" : "Abrir chat rápido"}
        title="Chat rápido"
        className="relative flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition hover:scale-105"
      >
        {aberto ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        {!aberto && total > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
            {total > 99 ? "99+" : total}
          </span>
        ) : null}
      </button>
    </div>
  );
}
