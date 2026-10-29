"use client";

import { useEffect, useRef } from "react";
import { Loader2, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CONVERSA_GERAL } from "./constantes";
import { useChatContagem } from "./contagem-chat";

export interface PessoaDaLista {
  id: string;
  nome: string;
  foto: string | null;
  /** Conversa direta já existente com a pessoa (null = ainda não conversaram). */
  conversa: string | null;
}

function Selo({ valor }: { valor: number }) {
  return (
    <span className="flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold leading-5 text-destructive-foreground">
      {valor > 99 ? "99+" : valor}
    </span>
  );
}

/** Lista de conversas do Chat com as não lidas ao vivo (chega mensagem e o número aparece sem recarregar). */
export function ListaConversas({
  pessoas,
  conversaAtiva,
  naoLidasIniciais,
  abrindo,
  aoEscolher,
  aoPrepararConversa,
  aoSurgirConversaNova,
}: {
  pessoas: PessoaDaLista[];
  conversaAtiva: string;
  /** Não lidas por conversa, como o servidor viu ao abrir a página. */
  naoLidasIniciais: Record<string, number>;
  /** Pessoa cuja conversa está sendo criada agora. */
  abrindo: string | null;
  aoEscolher: (alvo: { tipo: "geral" } | { tipo: "pessoa"; id: string }) => void;
  /** Passou o mouse: já vai buscando as mensagens para a troca ser instantânea. */
  aoPrepararConversa: (conversa: string) => void;
  /** Chegou mensagem de uma conversa que ainda não estava na lista. */
  aoSurgirConversaNova: () => void;
}) {
  const vivo = useChatContagem();
  const por = vivo.carregado ? vivo.porConversa : naoLidasIniciais;
  const ehGeral = conversaAtiva === CONVERSA_GERAL;

  const conhecidas = new Set<string>([CONVERSA_GERAL]);
  for (const p of pessoas) if (p.conversa) conhecidas.add(p.conversa);
  const desconhecida = Object.keys(por).find((c) => !conhecidas.has(c));
  const jaAvisou = useRef<string | null>(null);
  useEffect(() => {
    if (desconhecida && jaAvisou.current !== desconhecida) {
      jaAvisou.current = desconhecida;
      aoSurgirConversaNova();
    }
  }, [desconhecida, aoSurgirConversaNova]);

  const nGeral = ehGeral ? 0 : por[CONVERSA_GERAL] ?? 0;

  return (
    <aside className="overflow-y-auto border-b md:border-b-0 md:border-r">
      <button
        type="button"
        onClick={() => aoEscolher({ tipo: "geral" })}
        onMouseEnter={() => aoPrepararConversa(CONVERSA_GERAL)}
        className={cn("flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent/50", ehGeral && "bg-accent")}
      >
        <Users className="size-4" />
        <span className="flex-1">Sala geral</span>
        {nGeral > 0 ? <Selo valor={nGeral} /> : null}
      </button>

      <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase text-muted-foreground">Pessoas</p>
      {pessoas.map((p) => {
        const conv = p.conversa;
        const ativa = !!conv && conv === conversaAtiva;
        // A conversa aberta é lida na hora: nunca mostra número nela.
        const n = conv && !ativa ? por[conv] ?? 0 : 0;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => aoEscolher({ tipo: "pessoa", id: p.id })}
            onMouseEnter={() => conv && aoPrepararConversa(conv)}
            onFocus={() => conv && aoPrepararConversa(conv)}
            className={cn(
              "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent/50",
              ativa && "bg-accent font-medium",
              !conv && "text-muted-foreground hover:text-foreground"
            )}
          >
            <Avatar nome={p.nome} src={p.foto} className="size-7 text-[10px]" />
            <span className={cn("flex-1 truncate", n > 0 && "font-semibold")}>{p.nome}</span>
            {abrindo === p.id ? <Loader2 className="size-4 animate-spin" /> : n > 0 ? <Selo valor={n} /> : null}
          </button>
        );
      })}
    </aside>
  );
}
