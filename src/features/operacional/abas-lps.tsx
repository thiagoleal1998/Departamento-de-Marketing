import Link from "@/components/shared/link";
import { BarChart3, History, ListTree } from "lucide-react";
import { cn } from "@/lib/utils";

export type AbaLps = "dados" | "lps" | "historico";

/** Abas de Landing Pages: dados gerais, lista e histórico. */
export function AbasLps({ ativa }: { ativa: AbaLps }) {
  const abas = [
    { chave: "dados", href: "/operacional/landing-pages", label: "Dados Gerais", icone: BarChart3 },
    { chave: "lps", href: "/operacional/landing-pages?aba=lps", label: "Landing pages", icone: ListTree },
    { chave: "historico", href: "/operacional/landing-pages?aba=historico", label: "Histórico", icone: History },
  ] as const;

  return (
    <nav aria-label="Seções de Landing Pages" className="flex flex-wrap gap-1 border-b">
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
