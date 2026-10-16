"use client";

import { useRef, useState } from "react";
import { ExternalLink, Loader2, Send, Sparkles } from "lucide-react";
import {
  conversarAgente,
  type ModoAgente,
  type LinkAgente,
  type MensagemAgente,
} from "./canva-agente";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Item = MensagemAgente & { links?: LinkAgente[] };

const SUGESTOES: Record<ModoAgente, string[]> = {
  redator: [
    "Escreva 3 opções de título e CTA para um story de oferta de fim de ano",
    "Crie uma legenda de Instagram para a promoção de feriado",
    "Escreva um e-mail curto de reengajamento para hóspedes",
  ],
  canva: [
    "Crie um story chamado Teste na campanha Black Friday",
    "Liste meus designs recentes",
    "Redimensione o último design para feed",
  ],
};

export function AgenteCanva() {
  const [modo, setModo] = useState<ModoAgente>("redator");
  const [conversas, setConversas] = useState<Record<ModoAgente, Item[]>>({
    redator: [],
    canva: [],
  });
  const itens = conversas[modo];
  const setItens = (v: Item[], m: ModoAgente = modo) =>
    setConversas((c) => ({ ...c, [m]: v }));
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  async function enviar(conteudo: string) {
    const msg = conteudo.trim();
    if (!msg || ocupado) return;
    const modoEnvio = modo;
    const novo: Item[] = [...itens, { papel: "usuario", texto: msg }];
    setItens(novo, modoEnvio);
    setTexto("");
    setErro(null);
    setOcupado(true);
    try {
      const r = await conversarAgente(
        novo.map(({ papel, texto }) => ({ papel, texto })),
        modoEnvio
      );
      if (r.erro) setErro(r.erro);
      else
        setItens(
          [...novo, { papel: "agente", texto: r.texto, links: r.links }],
          modoEnvio
        );
    } catch {
      setErro("Não foi possível falar com o assistente. Tente de novo.");
    } finally {
      setOcupado(false);
      setTimeout(() => fim.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="size-5 text-primary" />
        <h3 className="font-semibold">Assistentes de criação</h3>
        <div className="ml-auto flex gap-1">
          <Button type="button" size="sm" variant={modo === "redator" ? "default" : "outline"} onClick={() => setModo("redator")}>
            Redator
          </Button>
          <Button type="button" size="sm" variant={modo === "canva" ? "default" : "outline"} onClick={() => setModo("canva")}>
            Operador do Canva
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {modo === "redator"
          ? "Escreve títulos, legendas, CTAs e e-mails. Não mexe no Canva."
          : "Cria designs, pastas, exporta e redimensiona no Canva. Diga o que quer fazer."}
      </p>

      <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-lg border p-3">
        {itens.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            {SUGESTOES[modo].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => enviar(s)}
                className="rounded-full border px-3 py-1 text-left text-xs hover:bg-accent/40"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
        {itens.map((m, i) => (
          <div
            key={i}
            className={
              m.papel === "usuario"
                ? "ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                : "max-w-[85%] space-y-2 rounded-lg bg-muted px-3 py-2 text-sm"
            }
          >
            <p className="whitespace-pre-wrap">{m.texto}</p>
            {m.links?.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-medium text-primary underline"
              >
                {l.rotulo} <ExternalLink className="size-3.5" />
              </a>
            ))}
          </div>
        ))}
        {ocupado ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Trabalhando nisso…
          </p>
        ) : null}
        <div ref={fim} />
      </div>

      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="flex gap-2"
      >
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: crie um story da campanha Verão com o texto…"
          aria-label="Mensagem para o assistente"
        />
        <Button type="submit" disabled={ocupado || !texto.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
