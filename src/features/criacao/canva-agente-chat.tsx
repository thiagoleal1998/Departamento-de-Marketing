"use client";

import { useRef, useState } from "react";
import { ExternalLink, Loader2, Send, Sparkles } from "lucide-react";
import {
  conversarAgente,
  type LinkAgente,
  type MensagemAgente,
} from "./canva-agente";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Item = MensagemAgente & { links?: LinkAgente[] };

const SUGESTOES = [
  "Escreva 3 opções de título e CTA para um story de oferta de fim de ano",
  "Crie um story chamado Teste na campanha Black Friday",
  "Liste meus designs recentes",
];

export function AgenteCanva() {
  const [itens, setItens] = useState<Item[]>([]);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  async function enviar(conteudo: string) {
    const msg = conteudo.trim();
    if (!msg || ocupado) return;
    const novo: Item[] = [...itens, { papel: "usuario", texto: msg }];
    setItens(novo);
    setTexto("");
    setErro(null);
    setOcupado(true);
    try {
      const r = await conversarAgente(
        novo.map(({ papel, texto }) => ({ papel, texto }))
      );
      if (r.erro) setErro(r.erro);
      else setItens([...novo, { papel: "agente", texto: r.texto, links: r.links }]);
    } catch {
      setErro("Não foi possível falar com o assistente. Tente de novo.");
    } finally {
      setOcupado(false);
      setTimeout(() => fim.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" />
        <h3 className="font-semibold">Assistente de criação</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Peça textos ou diga o que quer criar. Ele escreve e comanda o Canva por você.
      </p>

      <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-lg border p-3">
        {itens.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
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
