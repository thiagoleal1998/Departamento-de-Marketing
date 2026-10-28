"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Botão que abre um menu para cima (a caixa de mensagem fica embaixo da tela), fechando ao clicar fora ou com Esc. */
export function MenuSuspenso({
  icone,
  rotulo,
  titulo,
  ativo = false,
  largura = "w-60",
  className,
  children,
}: {
  icone: React.ReactNode;
  rotulo: string;
  titulo?: string;
  ativo?: boolean;
  largura?: string;
  className?: string;
  children: (fechar: () => void) => React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={rotulo}
        title={titulo ?? rotulo}
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground",
          (aberto || ativo) && "bg-foreground/10 text-foreground",
          className
        )}
      >
        {icone}
      </button>
      {aberto ? (
        <div className={cn("absolute bottom-full left-0 z-50 mb-2 overflow-hidden rounded-2xl border bg-popover p-1.5 text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-1 duration-150", largura)}>
          {children(() => setAberto(false))}
        </div>
      ) : null}
    </div>
  );
}

/** Uma linha do menu: ícone colorido + texto (e uma explicação curta, se houver). */
export function ItemMenu({
  icone,
  cor = "bg-primary/10 text-primary",
  texto,
  detalhe,
  onClick,
}: {
  icone: React.ReactNode;
  cor?: string;
  texto: string;
  detalhe?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-muted">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", cor)}>{icone}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{texto}</span>
        {detalhe ? <span className="block text-xs text-muted-foreground">{detalhe}</span> : null}
      </span>
    </button>
  );
}

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "🙂", "😉", "😍",
  "🥰", "😘", "😎", "🤩", "🥳", "🤔", "😬", "🙄", "😴", "😢", "😭", "😡",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "👀", "🤝", "✌️", "👌", "🤞", "👋",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🔥", "✨", "🎉", "🎯", "✅", "❌",
  "⚠️", "📌", "📎", "📅", "⏰", "💡", "🚀", "☀️", "🏖️", "✈️", "🌴", "📣",
];

/** Grade de emojis para inserir no texto (como no WhatsApp). */
export function GradeEmojis({ aoEscolher }: { aoEscolher: (emoji: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-0.5">
      {EMOJIS.map((e) => (
        <button key={e} type="button" onClick={() => aoEscolher(e)} className="grid size-8 place-items-center rounded-lg text-xl transition-colors hover:bg-muted">
          {e}
        </button>
      ))}
    </div>
  );
}
