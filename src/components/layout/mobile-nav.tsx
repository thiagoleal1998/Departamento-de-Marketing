"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAVEGACAO } from "@/lib/navigation";
import { pode } from "@/lib/permissions";
import { somarContagens, type Contagens } from "@/lib/contagens";
import type { Papel } from "@/types";

interface ItemPlano {
  href: string;
  label: string;
  icone: LucideIcon;
  gradiente: string;
  exato?: boolean;
  separado?: boolean;
}

/** Navegação horizontal para telas pequenas (abaixo da topbar). */
export function MobileNav({
  papel,
  contagens,
}: {
  papel: Papel;
  contagens: Contagens;
}) {
  const pathname = usePathname();
  const itens = NAVEGACAO.filter((i) => (!i.requer || pode(papel, i.requer)) && (!i.soColaborador || papel === "colaborador"));

  // Submenus ficam "achatados" na barra horizontal.
  const planos: ItemPlano[] = itens.flatMap((i): ItemPlano[] =>
    i.filhos && i.filhos.length > 0
      ? i.filhos.map((f) => ({
          href: f.href,
          label: f.label,
          icone: f.icone,
          gradiente: i.gradiente,
          exato: f.exato,
        }))
      : [
          {
            href: i.href,
            label: i.label,
            icone: i.icone,
            gradiente: i.gradiente,
            separado: i.separado,
          },
        ]
  );

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b bg-card px-2 py-2 lg:hidden">
      {planos.map((item, idx) => {
        const abreSeparados = item.separado && !planos[idx - 1]?.separado;
        const ativo = item.exato
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icone = item.icone;
        return (
          <div key={item.href} className="flex shrink-0 items-center gap-1">
            {abreSeparados ? (
              <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            ) : null}
            <Link
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
              {somarContagens(contagens, item.href, item.exato) > 0 ? (
                <span className="rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-4 text-destructive-foreground">
                  {somarContagens(contagens, item.href, item.exato)}
                </span>
              ) : null}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
