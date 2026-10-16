import Link from "next/link";
import { BarChart3, ListTree } from "lucide-react";
import { cn } from "@/lib/utils";

/** Abas de Conteúdos do site: dados gerais e lista de páginas. */
export function AbasConteudos({ ativa }: { ativa: "dados" | "paginas" }) {
  const abas = [
    {
      chave: "dados",
      href: "/operacional/conteudos-site",
      label: "Dados gerais",
      icone: BarChart3,
    },
    {
      chave: "paginas",
      href: "/operacional/conteudos-site?aba=paginas",
      label: "Páginas",
      icone: ListTree,
    },
  ] as const;

  return (
    <nav
      aria-label="Seções de Conteúdos do site"
      className="flex flex-wrap gap-1 border-b"
    >
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
