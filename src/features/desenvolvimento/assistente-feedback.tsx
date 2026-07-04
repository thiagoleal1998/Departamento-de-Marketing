"use client";

import { Fragment, useState } from "react";
import {
  Wand2,
  MessageSquareText,
  Target,
  Loader2,
  ArrowDownToLine,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";
import { analisarComunicacao, gerarResumoEPlano } from "./ai";
import type { DadosRoteiro, ResultadoPlano } from "./ai-types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Renderiza um markdown bem simples (negrito **x** + listas com "- "). */
function TextoFormatado({ texto }: { texto: string }) {
  const linhas = texto.split("\n");
  return (
    <div className="space-y-1.5 text-sm text-foreground/90">
      {linhas.map((linha, i) => {
        const conteudo = linha.replace(/^-\s+/, "").trim();
        if (!conteudo) return null;
        const ehItem = /^-\s+/.test(linha);
        const partes = conteudo.split(/(\*\*[^*]+\*\*)/g);
        const render = partes.map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <strong key={j} className="font-semibold text-foreground">
              {p.slice(2, -2)}
            </strong>
          ) : (
            <Fragment key={j}>{p}</Fragment>
          )
        );
        return ehItem ? (
          <p key={i} className="flex gap-2">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-warm" />
            <span>{render}</span>
          </p>
        ) : (
          <p key={i}>{render}</p>
        );
      })}
    </div>
  );
}

export function AssistenteFeedback({
  coletar,
  onUsarResumo,
}: {
  coletar: () => DadosRoteiro;
  onUsarResumo: (texto: string) => void;
}) {
  const [carregando, setCarregando] = useState<null | "analise" | "plano">(null);
  const [analise, setAnalise] = useState<string | null>(null);
  const [plano, setPlano] = useState<ResultadoPlano | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function rodarAnalise() {
    setErro(null);
    setCarregando("analise");
    try {
      const res = await analisarComunicacao(coletar());
      if (res.ok) setAnalise(res.texto);
      else setErro(res.erro);
    } finally {
      setCarregando(null);
    }
  }

  async function rodarPlano() {
    setErro(null);
    setCarregando("plano");
    try {
      const res = await gerarResumoEPlano(coletar());
      if (res.ok) setPlano(res.plano);
      else setErro(res.erro);
    } finally {
      setCarregando(null);
    }
  }

  return (
    <Card className="border-warm/30 bg-warm/5 no-print">
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-start gap-3">
          <Wand2 className="mt-0.5 size-5 shrink-0 text-warm" />
          <div>
            <h2 className="text-base font-semibold">Assistente de IA</h2>
            <p className="text-sm text-muted-foreground">
              Peça ajuda para deixar a comunicação clara e para gerar o plano de
              ação a partir do que você escreveu.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={rodarAnalise}
            disabled={carregando !== null}
          >
            {carregando === "analise" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageSquareText className="size-4" />
            )}
            Revisar minha comunicação
          </Button>
          <Button
            type="button"
            variant="warm"
            size="sm"
            onClick={rodarPlano}
            disabled={carregando !== null}
          >
            {carregando === "plano" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Target className="size-4" />
            )}
            Gerar resumo e plano de ação
          </Button>
        </div>

        {erro ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {erro}
          </p>
        ) : null}

        {/* Resultado da análise de comunicação */}
        {analise ? (
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warm">
              <MessageSquareText className="size-3.5" /> Como está sua comunicação
            </p>
            <TextoFormatado texto={analise} />
          </div>
        ) : null}

        {/* Resultado do plano */}
        {plano ? (
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warm">
              <Target className="size-3.5" /> Resultado da conversa
            </p>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Resumo
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground/90">
                {plano.resumo}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => onUsarResumo(plano.resumo)}
              >
                <ArrowDownToLine className="size-4" /> Usar como resumo
              </Button>
            </div>

            {plano.resultado_esperado ? (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Resultado esperado
                </p>
                <p className="text-sm text-foreground/90">
                  {plano.resultado_esperado}
                </p>
              </div>
            ) : null}

            {plano.plano_acao?.length ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Plano de ação
                </p>
                <ul className="space-y-1.5">
                  {plano.plano_acao.map((a, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/90">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-warm" />
                      <span>
                        {a.acao}
                        {a.prazo_sugestao ? (
                          <span className="text-muted-foreground">
                            {" "}
                            — {a.prazo_sugestao}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {plano.pontos_acompanhamento?.length ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Pontos de acompanhamento
                </p>
                <ul className="space-y-1">
                  {plano.pontos_acompanhamento.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/90">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warm" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {plano.proxima_conversa_sugestao ? (
              <div className="flex items-start gap-2 rounded-lg bg-warm/10 p-3 text-sm text-foreground/90">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-warm" />
                <span>
                  <span className="font-medium">Próxima conversa: </span>
                  {plano.proxima_conversa_sugestao}
                </span>
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Você pode transformar isso em um plano de ação salvo depois de
              registrar o feedback.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
