"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Loader2, Link2 } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { enviarMensagem, marcarConversaLida } from "./actions";
import { enviarMensagemVinculada } from "./vinculos-actions";
import { VinculoCard } from "./vinculo-card";
import { refsDe, type ItemEstoqueChat, type RefItem } from "./vinculo-tipos";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export interface MensagemView {
  id: string;
  autor_id: string;
  texto: string;
  created_at: string;
  tarefa_id?: string | null;
  estoque_item_id?: string | null;
  estoque_itens?: RefItem[] | null;
  projeto_id?: string | null;
}

export interface ProjetoOpcao {
  id: string;
  nome: string;
  status: string;
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
  itens,
  projetos,
  pessoas,
  podeCriarTarefa,
  outroId,
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
}) {
  const [mensagens, setMensagens] = useState<MensagemView[]>(mensagensIniciais);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const fimRef = useRef<HTMLDivElement>(null);

  // Vínculos (estoque / tarefa) da próxima mensagem.
  const [vincular, setVincular] = useState(false);
  // Itens do estoque escolhidos (vários), cada um com a quantidade pedida.
  const [itensSel, setItensSel] = useState<{ id: string; qtd: string }[]>([]);
  const [projetoId, setProjetoId] = useState("");
  const [registrarProjeto, setRegistrarProjeto] = useState(true);
  const [statusProjeto, setStatusProjeto] = useState("");
  const [criarTarefa, setCriarTarefa] = useState(false);
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

  function limparVinculo() {
    setVincular(false);
    setItensSel([]);
    setProjetoId("");
    setStatusProjeto("");
    setRegistrarProjeto(true);
    setCriarTarefa(false);
    setPrazo("");
    setTituloTarefa("");
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || pendente) return;
    if (criarTarefa && !responsavel) {
      setErro("Escolha quem vai cuidar da tarefa.");
      return;
    }
    setErro(null);
    startTransition(async () => {
      const res = temVinculo
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
        : await enviarMensagem(conversaId, conteudo);
      if (res.erro) setErro(res.erro);
      else {
        setTexto("");
        limparVinculo();
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

        {vincular ? (
          <div className="mb-2 grid gap-2 rounded-lg border bg-muted/40 p-3 text-sm sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Itens do estoque (pode adicionar vários)</span>
              <Select
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id && !itensSel.some((x) => x.id === id)) setItensSel((l) => [...l, { id, qtd: "" }]);
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
                    onChange={(e) => setCriarTarefa(e.target.checked)}
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

        <div className="flex gap-2">
          <Button
            type="button"
            variant={vincular || temVinculo ? "default" : "outline"}
            size="icon"
            aria-label="Vincular estoque ou tarefa"
            title="Vincular item do estoque / criar tarefa"
            onClick={() => (vincular ? limparVinculo() : setVincular(true))}
          >
            <Link2 className="size-4" />
          </Button>
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={temVinculo ? "Descreva o pedido…" : "Escreva uma mensagem…"}
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
