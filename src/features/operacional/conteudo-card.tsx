"use client";

import { useState } from "react";
import { Pencil, Eye, Square, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Negrito simples: **texto**. */
function Inline({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

const RE_CHECK = /^(\s*)-\s\[( |x|X)\]\s?(.*)$/;

/**
 * Corpo do card, no estilo do Notion: texto livre, títulos (#, ##),
 * listas (-) e checklists (- [ ] / - [x]) clicáveis.
 */
export function ConteudoCard({
  valor,
  onChange,
}: {
  valor: string;
  onChange: (novo: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const linhas = valor.split("\n");

  function alternar(idx: number) {
    const novas = [...linhas];
    const m = RE_CHECK.exec(novas[idx]);
    if (!m) return;
    novas[idx] = `${m[1]}- [${m[2] === " " ? "x" : " "}] ${m[3]}`;
    onChange(novas.join("\n"));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Conteúdo</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditando((v) => !v)}
        >
          {editando ? (
            <>
              <Eye className="size-4" /> Visualizar
            </>
          ) : (
            <>
              <Pencil className="size-4" /> Editar
            </>
          )}
        </Button>
      </div>

      {editando ? (
        <div className="space-y-1.5">
          <Textarea
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[220px] font-mono text-sm"
            placeholder={
              "Escreva aqui, como na página do Notion.\n\n## Subtarefas\n- [ ] Primeira etapa\n- [x] Etapa concluída\n\n**Por que será feito:** …"
            }
          />
          <p className="text-xs text-muted-foreground">
            Use <code>## Título</code>, <code>- item</code>,{" "}
            <code>- [ ] tarefa</code> e <code>**negrito**</code>.
          </p>
        </div>
      ) : valor.trim() === "" ? (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="w-full rounded-md border border-dashed p-4 text-left text-sm text-muted-foreground hover:bg-accent/40"
        >
          Clique para escrever no card… (subtarefas, detalhes, anotações)
        </button>
      ) : (
        <div className="space-y-1 rounded-md border p-3 text-sm">
          {linhas.map((linha, idx) => {
            const check = RE_CHECK.exec(linha);
            if (check) {
              const feito = check[2] !== " ";
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => alternar(idx)}
                  className="flex w-full items-start gap-2 text-left"
                >
                  {feito ? (
                    <CheckSquare className="mt-0.5 size-4 shrink-0 text-primary" />
                  ) : (
                    <Square className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span
                    className={cn(
                      feito && "text-muted-foreground line-through"
                    )}
                  >
                    <Inline texto={check[3]} />
                  </span>
                </button>
              );
            }
            if (linha.startsWith("## ")) {
              return (
                <h4 key={idx} className="pt-2 text-base font-semibold">
                  <Inline texto={linha.slice(3)} />
                </h4>
              );
            }
            if (linha.startsWith("# ")) {
              return (
                <h4 key={idx} className="pt-2 text-lg font-bold">
                  <Inline texto={linha.slice(2)} />
                </h4>
              );
            }
            if (/^\s*-\s/.test(linha)) {
              return (
                <p key={idx} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>
                    <Inline texto={linha.replace(/^\s*-\s/, "")} />
                  </span>
                </p>
              );
            }
            if (linha.trim() === "") return <div key={idx} className="h-2" />;
            return (
              <p key={idx}>
                <Inline texto={linha} />
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
