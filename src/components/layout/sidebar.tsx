"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAVEGACAO } from "@/lib/navigation";
import { pode } from "@/lib/permissions";
import type { Papel } from "@/types";

export function Sidebar({
  papel,
  nomePainel,
}: {
  papel: Papel;
  nomePainel: string;
}) {
  const pathname = usePathname();
  const itens = NAVEGACAO.filter((i) => !i.requer || pode(papel, i.requer));

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Megaphone className="size-4" />
        </div>
        <span className="text-sm font-semibold leading-tight">{nomePainel}</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {itens.map((item) => {
          const ativo =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icone = item.icone;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                ativo
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icone className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
