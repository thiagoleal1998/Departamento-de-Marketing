"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Loader2, Link2, ClipboardPlus, ScanSearch, Paperclip, Smile, Mic, ImageIcon, FilePlus2, ChevronDown, X, ClipboardList, NotebookPen, Search } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { enviarMensagem, marcarConversaLida } from "./actions";
import {
  dadosVinculo,
  enviarMensagemVinculada,
  responderVinculo,
  tarefasParaResponder,
  type TarefaParaResponder,
} from "./vinculos-actions";
import { VinculoCard } from "./vinculo-card";
import { alvosParaChat, enviarMensagemSobre } from "./sobre-actions";
import type { AlvoChat, SobreEscolhido } from "./sobre-tipos";
import { SolicitacaoCard } from "./solicitacao-card";
import { SolicitacaoForm } from "./solicitacao-form";
import { refsDe, type DadosVinculo, type ItemEstoqueChat, type RefItem } from "./vinculo-tipos";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BarraResposta, BotaoResponder, Citacao } from "./citacao";
import { ReacoesDaMensagem, SeletorReacao, useReacoes } from "./reacoes";
import { IndicadorDigitando, useDigitando } from "./digitando";
import { StatusLeitura, useLeituras } from "./leituras";
import { RevisaoCard } from "./revisao-card";
import { AnexoMensagem } from "./anexo-mensagem";
import { AnexoEnvio, type ComandosAnexo } from "./anexo-envio";
import { TEXTOS_AUTOMATICOS, type AnexoChat } from "./anexo-tipos";
import { RevisaoEditor, type PecaInicial } from "./revisao-editor";
import { GradeEmojis, ItemMenu, MenuSuspenso } from "./menu-chat";
import type { RevisaoPeca } from "./revisao-tipos";
import { CONVERSA_GERAL } from "./constantes";
import { tocarSomChat } from "./som";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface MensagemView {
  id: string;
  autor_id: string;
  texto: string;
  created_at: string;
  tarefa_id?: string | null;
  estoque_item_id?: string | null;
  estoque_itens?: RefItem[] | null;
  projeto_id?: string | null;
  solicitacao_id?: string | null;
  resposta_a?: string | null;
  revisao?: RevisaoPeca | null;
  anexo?: AnexoChat | null;
}

export interface ProjetoOpcao {
  id: string;
  nome: string;
  status: string;
}

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatJanela({
  conversaId,
  meuId,
  mensagensIniciais,
  nomes,
  itens,
  projetos,
  pessoas,
  podeCriarTarefa,
  outroId,
  sobreInicial = null,
}: {
  conversaId: string;
  meuId: string;
  mensagensIniciais: MensagemView[];
  nomes: Record<string, string>;
  itens: ItemEstoqueChat[];
  projetos: ProjetoOpcao[];
  pessoas: { id: string; nome: string }[];
  podeCriarTarefa: boolean;
  /** Na conversa direta, a outra pessoa (responsável sugerido). */
  outroId: string | null;
  /** Assunto já escolhido ao chegar pela Ata (tarefa ou tópico). */
  sobreInicial?: SobreEscolhido | null;
}) {
  const [mensagens, setMensagens] = useState<MensagemView[]>(mensagensIniciais);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const fimRef = useRef<HTMLDivElement>(null);
  // Responder a uma mensagem específica (aparece citada acima da resposta).
  const [respondendoA, setRespondendoA] = useState<MensagemView | null>(null);
  const caixaRef = useRef<HTMLTextAreaElement>(null);
  // Ao clicar em Responder, o cursor já vai para a caixa de mensagem.
  useEffect(() => {
    if (respondendoA) caixaRef.current?.focus();
  }, [respondendoA]);
  const { lista: reacoes, reagir } = useReacoes(conversaId, meuId);
  const leituras = useLeituras(conversaId);
  const [revisando, setRevisando] = useState<null | { modo: "pedido" | "revisao"; inicial?: PecaInicial }>(null);
  const anexo = useRef<ComandosAnexo>(null);
  const { digitando, avisarDigitando, parouDeDigitar } = useDigitando(conversaId, meuId);
  const quem = (m: MensagemView) => (m.autor_id === meuId ? "Você" : nomes[m.autor_id] ?? "—");
  function irPara(id: string) {
    const el = document.getElementById("cj-msg-" + id);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.classList.add("ring-2", "ring-primary");
    setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 1500);
  }

  // Vínculos (estoque / tarefa) da próxima mensagem.
  const [vincular, setVincular] = useState(false);
  // Falar sobre uma tarefa do quadro ou um tópico da ata.
  const [sobre, setSobre] = useState<SobreEscolhido | null>(sobreInicial);
  const [escolhendoSobre, setEscolhendoSobre] = useState(false);
  const [alvos, setAlvos] = useState<AlvoChat[] | null>(null);
  const [buscaSobre, setBuscaSobre] = useState("");
  function abrirSobre() {
    setEscolhendoSobre(true);
    if (alvos === null) void alvosParaChat().then(setAlvos);
  }
  useEffect(() => {
    if (sobreInicial) caixaRef.current?.focus();
  }, [sobreInicial]);
  const [solicitando, setSolicitando] = useState(false);

  // Responder sobre uma tarefa citada nesta conversa (dá baixa no estoque e conclui).
  const [tarefasResp, setTarefasResp] = useState<TarefaParaResponder[]>([]);
  const [respTarefaId, setRespTarefaId] = useState("");
  const [respDados, setRespDados] = useState<DadosVinculo | null>(null);
  const [respEntradas, setRespEntradas] = useState<Record<string, string>>({});
  const [respConcluir, setRespConcluir] = useState(false);
  // Itens do estoque escolhidos (vários), cada um com a quantidade pedida.
  const [itensSel, setItensSel] = useState<{ id: string; qtd: string }[]>([]);
  const [projetoId, setProjetoId] = useState("");
  const [registrarProjeto, setRegistrarProjeto] = useState(true);
  const [statusProjeto, setStatusProjeto] = useState("");
  const [criarTarefa, setCriarTarefa] = useState(false);
  // Se a pessoa mexeu na caixa "Criar tarefa", não a marcamos mais sozinhos.
  const [tarefaTocada, setTarefaTocada] = useState(false);
  const [responsavel, setResponsavel] = useState(outroId ?? "");
  const [prazo, setPrazo] = useState("");
  const [tituloTarefa, setTituloTarefa] = useState("");

  // Reinicia ao trocar de conversa.
  useEffect(() => {
    setMensagens(mensagensIniciais);
    setResponsavel(outroId ?? "");
  }, [conversaId, mensagensIniciais, outroId]);

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
          if (m.autor_id !== meuId) tocarSomChat();
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

  const nomeItem = (id: string) => itens.find((i) => i.id === id)?.nome ?? "item";
  const sugestaoTitulo =
    itensSel.length === 1
      ? `Repor: ${nomeItem(itensSel[0].id)}`
      : itensSel.length > 1
        ? `Repor ${itensSel.length} itens do estoque`
        : "";
  const temVinculo = itensSel.length > 0 || !!projetoId || (criarTarefa && !!responsavel);
  const respondendo = !!respTarefaId;

  // Tarefas em aberto desta conversa que a pessoa pode responder.
  useEffect(() => {
    let vivo = true;
    void tarefasParaResponder(conversaId).then((l) => {
      if (!vivo) return;
      setTarefasResp(l);
      setRespTarefaId((atual) => (atual && !l.some((t) => t.id === atual) ? "" : atual));
    });
    return () => {
      vivo = false;
    };
  }, [conversaId, mensagens.length]);

  // Itens da tarefa escolhida (para informar a entrada de cada um).
  useEffect(() => {
    if (!respTarefaId) {
      setRespDados(null);
      setRespEntradas({});
      return;
    }
    let vivo = true;
    void dadosVinculo(respTarefaId, [], null).then((d) => vivo && setRespDados(d));
    return () => {
      vivo = false;
    };
  }, [respTarefaId]);

  function responderSobre(tarefaId: string) {
    setRespTarefaId(tarefaId);
    setVincular(true);
  }

  /** Ao responder uma mensagem, a pessoa pode escolher uma tarefa pendente dela para responder junto. */
  function escolherTarefaDaResposta() {
    const citada = respondendoA?.tarefa_id;
    setRespTarefaId(citada && tarefasResp.some((t) => t.id === citada) ? citada : "");
    setVincular(true);
  }

  function limparVinculo() {
    setSobre(null);
    setEscolhendoSobre(false);
    setVincular(false);
    setRespTarefaId("");
    setRespEntradas({});
    setRespConcluir(false);
    setItensSel([]);
    setProjetoId("");
    setStatusProjeto("");
    setRegistrarProjeto(true);
    setCriarTarefa(false);
    setTarefaTocada(false);
    setPrazo("");
    setTituloTarefa("");
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const conteudo = texto.trim();
    if ((!conteudo && !respondendo) || pendente) return;
    if (criarTarefa && !responsavel) {
      setErro("Escolha quem vai cuidar da tarefa.");
      return;
    }
    setErro(null);
    startTransition(async () => {
      const res = respondendo
        ? await responderVinculo(conversaId, respTarefaId, [], {
            texto: conteudo,
            entradas: Object.entries(respEntradas).map(([itemId, q]) => ({ itemId, qtd: Number(q) || 0 })),
            concluir: respConcluir,
            andamento: false,
          })
        : sobre
        ? await enviarMensagemSobre(conversaId, conteudo, sobre, respondendoA?.id ?? null)
        : temVinculo
        ? await enviarMensagemVinculada(conversaId, conteudo, {
            projeto: projetoId
              ? {
                  id: projetoId,
                  registrar: registrarProjeto,
                  novoStatus: (statusProjeto || null) as "planejamento" | "em_andamento" | "concluido" | "cancelado" | null,
                }
              : null,
            itens: itensSel.map((i) => ({ id: i.id, qtd: Number(i.qtd) > 0 ? Math.floor(Number(i.qtd)) : null })),
            tarefa: criarTarefa
              ? {
                  titulo: tituloTarefa || sugestaoTitulo || conteudo.slice(0, 80),
                  responsavelId: responsavel,
                  prazo: prazo || null,
                }
              : null,
          })
        : await enviarMensagem(conversaId, conteudo, respondendoA?.id ?? null);
      if (res.erro) setErro(res.erro);
      else {
        setTexto("");
        setRespondendoA(null);
        parouDeDigitar();
        limparVinculo();
        document.querySelectorAll<HTMLTextAreaElement>("form textarea").forEach((t) => (t.style.height = "auto"));
      }
    });
  }

  // Quantas mensagens citam o mesmo vínculo (para recarregar os cartões).
  const versaoDe = (m: MensagemView) =>
    mensagens.filter((x) =>
      m.tarefa_id
        ? x.tarefa_id === m.tarefa_id
        : m.projeto_id
          ? x.projeto_id === m.projeto_id
          : (x.estoque_item_id ?? "") === (m.estoque_item_id ?? "")
    ).length;

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
            const original = m.resposta_a ? mensagens.find((x) => x.id === m.resposta_a) : undefined;
            const dela = reacoes.filter((r) => r.mensagem_id === m.id);
            // Pedido de revisão: a situação vem da revisão mais recente que o responde.
            const rev = m.revisao?.imagem ? m.revisao : null;
            const ehPedido = rev?.tipo === "pedido";
            const resposta = ehPedido ? [...mensagens].reverse().find((x) => x.revisao?.pedido === m.id) : undefined;
            const situacao = resposta?.revisao?.veredito ?? "aguardando";
            const acaoRevisao =
              rev && ehPedido
                ? !minha && situacao === "aguardando"
                  ? { rotulo: "Revisar esta peça", aoClicar: () => setRevisando({ modo: "revisao", inicial: { imagem: rev.imagem, nome: rev.nome, pedidoId: m.id } }) }
                  : minha && situacao === "ajustes"
                    ? { rotulo: "Enviar nova versão", aoClicar: () => setRevisando({ modo: "pedido" }) }
                    : undefined
                : undefined;
            const botao = (
              <div className="flex items-center self-center">
                <SeletorReacao atual={dela.find((r) => r.usuario_id === meuId)?.emoji} onEscolher={(e) => void reagir(m.id, e)} />
                <BotaoResponder nome={quem(m)} onClick={() => setRespondendoA(m)} />
              </div>
            );
            return (
              <div
                key={m.id}
                className={cn("group flex gap-1", minha ? "justify-end" : "justify-start")}
              >
                {minha ? botao : null}
                <div
                  id={"cj-msg-" + m.id}
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm transition-shadow",
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
                  {m.resposta_a ? (
                    <Citacao nome={original ? quem(original) : "Mensagem anterior"} texto={original?.texto ?? null} minha={minha} onIr={original ? () => irPara(original.id) : undefined} />
                  ) : null}
                  {rev ? <RevisaoCard revisao={rev} minha={minha} status={situacao} acao={acaoRevisao} /> : null}
                  {m.anexo?.url ? <AnexoMensagem anexo={m.anexo} /> : null}
                  {m.anexo?.url && TEXTOS_AUTOMATICOS.includes(m.texto) ? null : <p className="whitespace-pre-wrap break-words">{m.texto}</p>}
                  <ReacoesDaMensagem reacoes={dela} usuarioId={meuId} nomeDe={(id) => nomes[id] ?? "—"} onReagir={(e) => void reagir(m.id, e)} minha={minha} />
                  {m.solicitacao_id && mensagens.find((x) => x.solicitacao_id === m.solicitacao_id)?.id === m.id ? (
                    <SolicitacaoCard
                      id={m.solicitacao_id}
                      versao={mensagens.filter((x) => x.solicitacao_id === m.solicitacao_id).length}
                      minha={minha}
                      conversaId={conversaId}
                      meuNome={nomes[meuId] ?? ""}
                      pessoas={pessoas}
                    />
                  ) : null}
                  {m.tarefa_id || m.estoque_item_id || m.projeto_id || (m.estoque_itens?.length ?? 0) > 0 ? (
                    <VinculoCard
                      conversaId={conversaId}
                      tarefaId={m.tarefa_id ?? null}
                      itens={refsDe(m.estoque_itens, m.estoque_item_id)}
                      projetoId={m.projeto_id ?? null}
                      versao={versaoDe(m)}
                      nomes={nomes}
                      minha={minha}
                    />
                  ) : null}
                  {m.tarefa_id && tarefasResp.some((t) => t.id === m.tarefa_id) ? (
                    <button
                      type="button"
                      onClick={() => responderSobre(m.tarefa_id as string)}
                      className={cn(
                        "mt-1 text-[11px] font-medium underline underline-offset-2",
                        minha ? "opacity-90" : "text-primary"
                      )}
                    >
                      Responder sobre esta tarefa
                    </button>
                  ) : null}
                  <p
                    className={cn(
                      "mt-0.5 text-right text-[10px]",
                      minha ? "opacity-80" : "text-muted-foreground"
                    )}
                  >
                    {hora(m.created_at)}
                    {minha ? (
                      <>
                        {" · "}
                        <StatusLeitura
                          leituras={leituras.filter((l) => l.mensagem_id === m.id && l.usuario_id !== meuId)}
                          nomeDe={(id) => nomes[id] ?? "—"}
                          ehGeral={conversaId === CONVERSA_GERAL}
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
        <div ref={fimRef} />
      </div>

      <IndicadorDigitando ids={digitando} nomeDe={(id) => nomes[id] ?? "Alguém"} />
      {respondendoA ? <BarraResposta nome={quem(respondendoA)} texto={respondendoA.texto} onCancelar={() => setRespondendoA(null)} /> : null}
      <form onSubmit={enviar} className="border-t p-3">
        {erro ? <p className="mb-2 text-xs text-destructive">{erro}</p> : null}

        {sobre ? (
          <div className="mb-2 flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2 text-xs">
            {sobre.tipo === "ata" ? <NotebookPen className="size-4 shrink-0 text-primary" /> : <ClipboardList className="size-4 shrink-0 text-primary" />}
            <span className="min-w-0 flex-1 truncate">
              <span className="text-muted-foreground">{sobre.tipo === "ata" ? "Sobre o tópico da ata: " : sobre.tipo === "calendario" ? "Sobre o item do calendário: " : "Sobre a tarefa: "}</span>
              <span className="font-medium">{sobre.titulo}</span>
            </span>
            <button type="button" onClick={() => setSobre(null)} aria-label="Tirar o assunto" className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        {escolhendoSobre ? (
          <div className="mb-2 space-y-2 rounded-xl border bg-background p-3 text-sm shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Falar sobre uma tarefa ou tópico da ata</span>
              <button type="button" onClick={() => setEscolhendoSobre(false)} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X className="size-3.5" /> Fechar
              </button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={buscaSobre} onChange={(e) => setBuscaSobre(e.target.value)} placeholder="Buscar pelo nome…" aria-label="Buscar tarefa ou tópico" className="h-9 pl-8" />
            </div>
            <div className="max-h-56 space-y-0.5 overflow-y-auto">
              {alvos === null ? (
                <p className="flex items-center gap-2 px-1 py-3 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Carregando…
                </p>
              ) : (
                (() => {
                  const q = buscaSobre.trim().toLowerCase();
                  const lista = alvos.filter((a) => !q || a.titulo.toLowerCase().includes(q) || a.detalhe.toLowerCase().includes(q));
                  if (lista.length === 0) return <p className="px-1 py-3 text-xs text-muted-foreground">Nada encontrado.</p>;
                  return lista.map((a) => (
                    <button
                      key={a.chave}
                      type="button"
                      onClick={() => {
                        setSobre({ tipo: a.tipo, titulo: a.titulo, tarefaId: a.tarefaId });
                        setEscolhendoSobre(false);
                        setBuscaSobre("");
                        caixaRef.current?.focus();
                      }}
                      className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent"
                    >
                      {a.tipo === "ata" ? <NotebookPen className="mt-0.5 size-4 shrink-0 text-primary" /> : <ClipboardList className="mt-0.5 size-4 shrink-0 text-sky-500" />}
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 block text-sm font-medium leading-tight">{a.titulo}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {a.tipo === "ata" ? "Tópico da ata" : "Tarefa"}
                          {a.detalhe ? " · " + a.detalhe : ""}
                        </span>
                      </span>
                    </button>
                  ));
                })()
              )}
            </div>
          </div>
        ) : null}

        {respondendoA && !vincular && !respondendo && tarefasResp.length > 0 ? (
          <button
            type="button"
            onClick={escolherTarefaDaResposta}
            className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200"
          >
            📌 Responder sobre uma tarefa pendente
          </button>
        ) : null}

        {vincular ? (
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground">{respondendo ? "Respondendo sobre uma tarefa" : "Vincular à mensagem"}</span>
            <button
              type="button"
              onClick={limparVinculo}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" /> Fechar
            </button>
          </div>
        ) : null}

        {vincular && tarefasResp.length > 0 ? (
          <div className="mb-2 space-y-2 rounded-lg border border-amber-300 bg-amber-50/70 p-3 text-sm dark:bg-amber-950/30">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Responder sobre a tarefa</span>
              <Select value={respTarefaId} onChange={(e) => setRespTarefaId(e.target.value)} aria-label="Tarefa que você está respondendo">
                <option value="">Nenhuma (mensagem comum)</option>
                {tarefasResp.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titulo}
                  </option>
                ))}
              </Select>
            </label>
            {respondendo && respDados ? (
              <div className="space-y-2">
                {respDados.itens.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Entrada no estoque (quantas chegaram de cada item)</p>
                    {respDados.itens.map((it) => (
                      <label key={it.id} className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate">
                          {it.nome}{" "}
                          <span className={cn("text-xs", it.quantidade <= 0 ? "font-semibold text-red-600" : "text-muted-foreground")}>
                            ({it.quantidade <= 0 ? "zerado" : "estoque: " + it.quantidade}
                            {it.pedido ? " · pedido: " + it.pedido : ""})
                          </span>
                        </span>
                        <Input
                          type="number"
                          min={0}
                          value={respEntradas[it.id] ?? ""}
                          onChange={(e) => setRespEntradas((x) => ({ ...x, [it.id]: e.target.value }))}
                          placeholder={it.pedido ? String(it.pedido) : "qtd"}
                          className="h-8 w-20"
                          aria-label={"Quantidade que entrou de " + it.nome}
                        />
                      </label>
                    ))}
                  </div>
                ) : null}
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={respConcluir} onChange={(e) => setRespConcluir(e.target.checked)} className="size-4 accent-emerald-600" />
                  Concluir a tarefa ao enviar
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        {vincular && !respondendo ? (
          <div className="mb-2 grid gap-2 rounded-lg border bg-muted/40 p-3 text-sm sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Itens do estoque (pode adicionar vários)</span>
              <Select
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id && !itensSel.some((x) => x.id === id)) setItensSel((l) => [...l, { id, qtd: "" }]);
                  // Pedido de item para a pessoa da conversa: já sugere criar a tarefa.
                  if (id && podeCriarTarefa && outroId && !tarefaTocada) setCriarTarefa(true);
                }}
                aria-label="Adicionar item do estoque"
              >
                <option value="">Adicionar item…</option>
                {itens
                  .filter((i) => !itensSel.some((x) => x.id === i.id))
                  .map((i) => (
                    <option
                      key={i.id}
                      value={i.id}
                      style={i.quantidade <= 0 ? { color: "#dc2626", fontWeight: 600 } : undefined}
                    >
                      {i.quantidade <= 0 ? `${i.nome} — ZERADO` : `${i.nome} (estoque: ${i.quantidade})`}
                    </option>
                  ))}
              </Select>
              {itensSel.length > 0 ? (
                <ul className="space-y-1">
                  {itensSel.map((s) => {
                    const it = itens.find((i) => i.id === s.id);
                    return (
                      <li key={s.id} className="flex items-center gap-2 rounded-md border bg-background px-2 py-1">
                        <span className="min-w-0 flex-1 truncate">
                          {it?.nome ?? "Item"}{" "}
                          {it && it.quantidade <= 0 ? (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">zerado</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">(estoque: {it?.quantidade ?? "—"})</span>
                          )}
                        </span>
                        <Input
                          type="number"
                          min={1}
                          value={s.qtd}
                          onChange={(e) => setItensSel((l) => l.map((x) => (x.id === s.id ? { ...x, qtd: e.target.value } : x)))}
                          placeholder="qtd"
                          className="h-8 w-20"
                          aria-label={"Quantidade pedida de " + (it?.nome ?? "item")}
                        />
                        <button
                          type="button"
                          aria-label={"Remover " + (it?.nome ?? "item")}
                          onClick={() => setItensSel((l) => l.filter((x) => x.id !== s.id))}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>

            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Projeto</span>
              <Select value={projetoId} onChange={(e) => setProjetoId(e.target.value)} aria-label="Projeto">
                <option value="">Nenhum</option>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            </label>

            {projetoId ? (
              <div className="space-y-2 sm:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={registrarProjeto}
                    onChange={(e) => setRegistrarProjeto(e.target.checked)}
                    className="size-4 accent-primary"
                  />
                  Registrar a mensagem como atualização do projeto
                </label>
                {registrarProjeto && podeCriarTarefa ? (
                  <Select value={statusProjeto} onChange={(e) => setStatusProjeto(e.target.value)} aria-label="Situação do projeto">
                    <option value="">Manter a situação atual do projeto</option>
                    <option value="planejamento">Mudar para: Planejamento</option>
                    <option value="em_andamento">Mudar para: Em andamento</option>
                    <option value="concluido">Mudar para: Concluído</option>
                    <option value="cancelado">Mudar para: Cancelado</option>
                  </Select>
                ) : null}
              </div>
            ) : null}

            {podeCriarTarefa ? (
              <div className="space-y-2 sm:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={criarTarefa}
                    onChange={(e) => {
                      setTarefaTocada(true);
                      setCriarTarefa(e.target.checked);
                    }}
                    className="size-4 accent-primary"
                  />
                  Criar tarefa a partir desta mensagem
                </label>
                {criarTarefa ? (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Select value={responsavel} onChange={(e) => setResponsavel(e.target.value)} aria-label="Responsável">
                      <option value="">Responsável…</option>
                      {pessoas
                        .filter((p) => p.id !== meuId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                    </Select>
                    <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} aria-label="Prazo" />
                    <Input
                      value={tituloTarefa}
                      onChange={(e) => setTituloTarefa(e.target.value)}
                      placeholder={sugestaoTitulo || "Título da tarefa"}
                      maxLength={200}
                      aria-label="Título da tarefa"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-end gap-1 rounded-3xl border bg-muted/40 px-1.5 py-1.5">
          <MenuSuspenso icone={<Paperclip className="size-5" />} rotulo="Anexar" titulo="Anexar" ativo={vincular || temVinculo || respondendo || !!sobre}>
            {(fechar) => (
              <>
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
                <ItemMenu
                  icone={<Link2 className="size-4" />}
                  cor="bg-sky-500/15 text-sky-500"
                  texto={vincular ? "Fechar vínculo" : "Estoque ou tarefa"}
                  detalhe="Vincular item do estoque / criar tarefa"
                  onClick={() => {
                    fechar();
                    if (vincular) limparVinculo();
                    else setVincular(true);
                  }}
                />
                <ItemMenu
                  icone={<NotebookPen className="size-4" />}
                  cor="bg-amber-500/15 text-amber-600"
                  texto="Tarefa ou tópico da ata"
                  detalhe="Falar sobre um assunto da equipe"
                  onClick={() => {
                    fechar();
                    abrirSobre();
                  }}
                />
                <ItemMenu
                  icone={<ClipboardPlus className="size-4" />}
                  cor="bg-emerald-500/15 text-emerald-500"
                  texto="Solicitar criação"
                  detalhe="LP, banner, lâmina, vídeo…"
                  onClick={() => {
                    fechar();
                    setSolicitando(true);
                  }}
                />
              </>
            )}
          </MenuSuspenso>
          <MenuSuspenso icone={<Smile className="size-5" />} rotulo="Emojis" largura="w-[19.5rem]">
            {() => (
              <GradeEmojis
                aoEscolher={(e) => {
                  setTexto((t) => t + e);
                  caixaRef.current?.focus();
                }}
              />
            )}
          </MenuSuspenso>
          <MenuSuspenso
            icone={
              <>
                <ScanSearch className="size-4" />
                <span className="hidden text-sm font-medium sm:inline">Revisão</span>
                <ChevronDown className="size-3.5" />
              </>
            }
            rotulo="Revisão"
            titulo="Revisão de peças"
            className="flex size-auto h-9 items-center gap-1.5 px-3"
            largura="w-72"
          >
            {(fechar) => (
              <>
                <ItemMenu
                  icone={<FilePlus2 className="size-4" />}
                  cor="bg-amber-500/15 text-amber-600"
                  texto="Solicitar revisão"
                  detalhe="Envie sua peça para ser revisada"
                  onClick={() => {
                    fechar();
                    setRevisando({ modo: "pedido" });
                  }}
                />
                <ItemMenu
                  icone={<ScanSearch className="size-4" />}
                  cor="bg-rose-500/15 text-rose-500"
                  texto="Revisar peça"
                  detalhe="Marque na imagem o que precisa mudar"
                  onClick={() => {
                    fechar();
                    setRevisando({ modo: "revisao" });
                  }}
                />
              </>
            )}
          </MenuSuspenso>
          <Textarea
            ref={caixaRef}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              if (e.target.value.trim()) avisarDigitando();
              else parouDeDigitar();
              // cresce com o texto (até um limite)
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
            }}
            onKeyDown={(e) => {
              // Enter envia; Shift+Enter quebra a linha.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            placeholder={
              respondendo
                ? "Sua resposta sobre a tarefa…  (Shift+Enter quebra a linha)"
                : temVinculo
                  ? "Descreva o pedido…  (Shift+Enter quebra a linha)"
                  : "Escreva uma mensagem…  (Shift+Enter quebra a linha)"
            }
            maxLength={2000}
            autoComplete="off"
            className="max-h-40 min-h-9 flex-1 resize-none border-0 bg-transparent px-1 py-2 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {texto.trim() || respondendo ? (
            <Button type="submit" size="icon" disabled={pendente || (!texto.trim() && !respondendo)} aria-label="Enviar" className="size-9 shrink-0 rounded-full">
              {pendente ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          ) : (
            <Button type="button" size="icon" aria-label="Gravar áudio" title="Gravar mensagem de voz" onClick={() => anexo.current?.gravar()} className="size-9 shrink-0 rounded-full">
              <Mic className="size-4" />
            </Button>
          )}
        </div>
      </form>

      <AnexoEnvio ref={anexo} conversaId={conversaId} respostaA={respondendoA?.id ?? null} aoEnviado={() => setRespondendoA(null)} />
      {revisando ? (
        <RevisaoEditor conversaId={conversaId} respostaA={respondendoA?.id ?? null} modo={revisando.modo} inicial={revisando.inicial} aoFechar={() => setRevisando(null)} />
      ) : null}
      {solicitando ? (
        <SolicitacaoForm conversaId={conversaId} meuNome={nomes[meuId] ?? ""} pessoas={pessoas} outroId={outroId} aoFechar={() => setSolicitando(false)} />
      ) : null}
    </div>
  );
}
