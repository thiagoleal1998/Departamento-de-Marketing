import Link from "@/components/shared/link";
import { Columns3, Send } from "lucide-react";
import { cn } from "@/lib/utils";

/** Abas do Feedback: enviar um relato e acompanhar (kanban/lista). */
export function AbasFeedback({
  ativa,
  rotuloAcompanhar,
}: {
  ativa: "enviar" | "acompanhar";
  rotuloAcompanhar: string;
}) {
  const abas = [
    { chave: "enviar", href: "/sugestoes", label: "Feedback", icone: Send },
    {
      chave: "acompanhar",
      href: "/sugestoes?aba=acompanhar",
      label: rotuloAcompanhar,
      icone: Columns3,
    },
  ] as const;

  return (
    <nav aria-label="Seções do Feedback" className="flex flex-wrap gap-1 border-b">
      {abas.map((a) => {
        const Icone = a.icone;
        return (
          <Link
            key={a.chave}
            href={a.href}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              a.chave === ativa
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icone className="size-4" />
            {a.label}
          </Link>
        );
      })}
    </nav>
  );
}
