import Link from "next/link";
import { Boxes, Store } from "lucide-react";
import { cn } from "@/lib/utils";

/** Abas do Estoque: produtos e fornecedores. */
export function AbasEstoque({ ativa }: { ativa: "produtos" | "fornecedores" }) {
  const abas = [
    { chave: "produtos", href: "/estoque", label: "Produtos", icone: Boxes },
    { chave: "fornecedores", href: "/estoque?aba=fornecedores", label: "Fornecedores", icone: Store },
  ] as const;
  return (
    <nav aria-label="Seções do Estoque" className="flex flex-wrap gap-1 border-b">
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
