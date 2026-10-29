"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ChatJanela, type MensagemView, type ProjetoOpcao } from "./chat-janela";
import { ListaConversas, type PessoaDaLista } from "./lista-conversas";
import { abrirConversaCom, conversasDiretas, mensagensDaConversa } from "./conversa-actions";
import { CONVERSA_GERAL } from "./constantes";
import type { ItemEstoqueChat } from "./vinculo-tipos";
import type { SobreEscolhido } from "./sobre-tipos";

/**
 * Chat com troca de conversa instantânea: a página carrega uma vez e, ao clicar em outra conversa, só as mensagens
 * dela são buscadas (e guardadas na memória; passar o mouse já adianta a busca). Antes, cada clique recarregava a
 * página inteira no servidor.
 */
export function ChatAgora({
  meuId,
  pessoas,
  todas,
  nomes,
  itens,
  projetos,
  podeCriarTarefa,
  conversaInicial,
  mensagensIniciais,
  sobreInicial,
  naoLidasIniciais,
}: {
  meuId: string;
  /** As outras pessoas (lista lateral), com a conversa direta de cada uma, se já existir. */
  pessoas: PessoaDaLista[];
  /** Todas as pessoas, inclusive você (nomes nas mensagens e vínculos). */
  todas: { id: string; nome: string }[];
  nomes: Record<string, string>;
  itens: ItemEstoqueChat[];
  projetos: ProjetoOpcao[];
  podeCriarTarefa: boolean;
  conversaInicial: string;
  mensagensIniciais: MensagemView[];
  sobreInicial: SobreEscolhido | null;
  naoLidasIniciais: Record<string, number>;
}) {
  const [conversaId, setConversaId] = useState(conversaInicial);
  const [conversas, setConversas] = useState<Record<string, string | null>>(() => Object.fromEntries(pessoas.map((p) => [p.id, p.conversa])));
  const [cache, setCache] = useState<Record<string, MensagemView[]>>({ [conversaInicial]: mensagensIniciais });
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const buscando = useRef(new Set<string>());

  const lista: PessoaDaLista[] = pessoas.map((p) => ({ ...p, conversa: conversas[p.id] ?? null }));
  const ehGeral = conversaId === CONVERSA_GERAL;
  const outra = ehGeral ? null : lista.find((p) => p.conversa === conversaId) ?? null;
  const titulo = ehGeral ? "Sala geral do time" : outra?.nome ?? "Conversa";

  /** Busca as mensagens da conversa e guarda; se já houver cópia, ela continua à mostra enquanto atualiza. */
  const carregar = useCallback(async (conv: string) => {
    if (buscando.current.has(conv)) return;
    buscando.current.add(conv);
    try {
      const m = (await mensagensDaConversa(conv)) as unknown as MensagemView[];
      setCache((c) => ({ ...c, [conv]: m }));
    } finally {
      buscando.current.delete(conv);
    }
  }, []);

  const preparar = useCallback(
    (conv: string) => {
      if (!(conv in cache)) void carregar(conv);
    },
    [cache, carregar]
  );

  function ir(conv: string) {
    setErro(null);
    setConversaId(conv);
    // O endereço acompanha a conversa (para recarregar ou compartilhar), sem recarregar a página.
    try {
      window.history.replaceState(null, "", conv === CONVERSA_GERAL ? "/chat" : `/chat?c=${conv}`);
    } catch {
      /* sem histórico */
    }
    void carregar(conv); // atualiza em segundo plano, mesmo que já haja cópia
  }

  async function escolher(alvo: { tipo: "geral" } | { tipo: "pessoa"; id: string }) {
    if (alvo.tipo === "geral") return ir(CONVERSA_GERAL);
    const conhecida = conversas[alvo.id];
    if (conhecida) return ir(conhecida);
    // Primeira conversa com a pessoa: cria e abre.
    setAbrindo(alvo.id);
    const r = await abrirConversaCom(alvo.id);
    setAbrindo(null);
    if (!r.conversaId) {
      setErro(r.erro ?? "Não foi possível abrir a conversa.");
      return;
    }
    setConversas((c) => ({ ...c, [alvo.id]: r.conversaId as string }));
    setCache((c) => ({ ...c, [r.conversaId as string]: [] }));
    ir(r.conversaId);
  }

  async function atualizarConversas() {
    const mapa = await conversasDiretas();
    setConversas((c) => ({ ...c, ...mapa }));
  }

  const mensagens = cache[conversaId];

  return (
    <Card className="grid h-[calc(100vh-15rem)] min-h-[420px] grid-cols-1 overflow-hidden md:grid-cols-[260px_1fr]">
      <ListaConversas
        pessoas={lista}
        conversaAtiva={conversaId}
        naoLidasIniciais={naoLidasIniciais}
        abrindo={abrindo}
        aoEscolher={(a) => void escolher(a)}
        aoPrepararConversa={preparar}
        aoSurgirConversaNova={() => void atualizarConversas()}
      />

      <section className="flex min-h-0 flex-col">
        <header className="flex items-center gap-2.5 border-b px-4 py-2.5 text-sm font-semibold">
          {ehGeral ? <Users className="size-5 text-muted-foreground" /> : <Avatar nome={titulo} src={outra?.foto} className="size-8 text-[11px]" />}
          {titulo}
          {erro ? <span className="ml-auto text-xs font-normal text-destructive">{erro}</span> : null}
        </header>
        <div className="min-h-0 flex-1">
          {mensagens ? (
            <ChatJanela
              key={conversaId}
              conversaId={conversaId}
              meuId={meuId}
              mensagensIniciais={mensagens}
              nomes={nomes}
              itens={itens}
              projetos={projetos}
              pessoas={todas}
              podeCriarTarefa={podeCriarTarefa}
              outroId={outra?.id ?? null}
              sobreInicial={conversaId === conversaInicial ? sobreInicial : null}
            />
          ) : (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Abrindo a conversa…
            </div>
          )}
        </div>
      </section>
    </Card>
  );
}
