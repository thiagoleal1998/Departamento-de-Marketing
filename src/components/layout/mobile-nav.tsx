"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAVEGACAO } from "@/lib/navigation";
import { pode } from "@/lib/permissions";
import type { Papel } from "@/types";

/** Navegação horizontal para telas pequenas (abaixo da topbar). */
export function MobileNav({ papel }: { papel: Papel }) {
  const pathname = usePathname();
  const itens = NAVEGACAO.filter((i) => !i.requer || pode(papel, i.requer));

  return (
    <nav className="flex gap-1 overflow-x-auto border-b bg-card px-2 py-2 lg:hidden">
      {itens.map((item) => {
        const ativo =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icone = item.icone;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              ativo
                ? cn("bg-gradient-to-r text-white shadow-sm", item.gradiente)
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <Icone className="size-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
