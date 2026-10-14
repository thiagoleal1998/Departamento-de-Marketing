"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Marca } from "@/components/shared/marca";
import { NAVEGACAO, type ItemNav } from "@/lib/navigation";
import { pode } from "@/lib/permissions";
import type { Papel } from "@/types";

export function Sidebar({
  papel,
  nomePainel,
  logoUrl,
}: {
  papel: Papel;
  nomePainel: string;
  logoUrl: string | null;
}) {
  const pathname = usePathname();
  const itens = NAVEGACAO.filter((i) => !i.requer || pode(papel, i.requer));
  const principais = itens.filter((i) => !i.separado);
  const separados = itens.filter((i) => i.separado);

  function renderItem(item: ItemNav) {
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
            ? cn("bg-gradient-to-r text-white shadow-sm", item.gradiente)
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <Icone className="size-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <Marca
          logoUrl={logoUrl}
          boxClassName="size-8"
          iconClassName="size-4"
          imgClassName="h-8 max-w-[104px]"
        />
        <span className="truncate text-sm font-semibold leading-tight">
          {nomePainel}
        </span>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto p-3">
        <div className="space-y-1">{principais.map(renderItem)}</div>
        {separados.length > 0 ? (
          <div className="mt-auto space-y-1 border-t pt-3">
            {separados.map(renderItem)}
          </div>
        ) : null}
      </nav>

      <div className="border-t p-3 text-center text-xs text-muted-foreground">
        Versão {process.env.NEXT_PUBLIC_APP_VERSION}
      </div>
    </aside>
  );
}
