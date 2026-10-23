import Link from "@/components/shared/link";
import { CalendarDays, History, Hotel } from "lucide-react";
import { cn } from "@/lib/utils";

export type AbaDivulgacao = "semana" | "historico" | "condicoes";

/** Abas da Divulgação diária: semana, histórico e condições dos hotéis. */
export function AbasDivulgacao({ ativa }: { ativa: AbaDivulgacao }) {
  const abas = [
    { chave: "semana", href: "/operacional/divulgacao", label: "Semana", icone: CalendarDays },
    { chave: "historico", href: "/operacional/divulgacao?aba=historico", label: "Histórico", icone: History },
    { chave: "condicoes", href: "/operacional/divulgacao?aba=condicoes", label: "Condições dos hotéis", icone: Hotel },
  ] as const;
  return (
    <nav aria-label="Seções da Divulgação diária" className="flex flex-wrap gap-1 border-b">
      {abas.map((a) => {
        const Icone = a.icone;
        return (
          <Link
            key={a.chave}
            href={a.href}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              a.chave === ativa ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
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
