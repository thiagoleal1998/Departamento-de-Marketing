import Link from "@/components/shared/link";
import { BarChart3, Brain, CalendarCheck, Palmtree } from "lucide-react";
import { cn } from "@/lib/utils";

/** Abas da área de Gestão: indicadores, perfis comportamentais e férias. */
export function GestaoAbas({ ativa }: { ativa: "indicadores" | "perfis" | "ferias" | "feriados" }) {
  const abas = [
    { chave: "indicadores", href: "/gestao", label: "Indicadores", icone: BarChart3 },
    {
      chave: "perfis",
      href: "/gestao/perfis",
      label: "Perfis comportamentais",
      icone: Brain,
    },
    { chave: "ferias", href: "/gestao/ferias", label: "Férias", icone: Palmtree },
    { chave: "feriados", href: "/gestao/feriados", label: "Escala de feriados", icone: CalendarCheck },
  ] as const;

  return (
    <nav
      aria-label="Seções de Gestão"
      className="flex flex-wrap gap-1 border-b"
    >
      {abas.map((a) => {
        const Icone = a.icone;
        const ativaAgora = a.chave === ativa;
        return (
          <Link
            key={a.chave}
            href={a.href}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              ativaAgora
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
