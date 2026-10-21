"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Marca } from "@/components/shared/marca";
import { NomeMarca } from "@/components/shared/nome-marca";
import { NAVEGACAO, type ItemNav, type SubItemNav } from "@/lib/navigation";
import { pode } from "@/lib/permissions";
import { somarContagens, type Contagens } from "@/lib/contagens";
import type { Papel } from "@/types";

function estaAtivo(pathname: string, href: string, exato?: boolean) {
  return exato
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");
}

function Selo({ valor, claro = false }: { valor: number; claro?: boolean }) {
  if (valor <= 0) return null;
  return (
    <span
      className={cn(
        "ml-auto flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-5",
        claro ? "bg-white text-foreground" : "bg-destructive text-destructive-foreground"
      )}
      aria-label={`${valor} novidades`}
    >
      {valor > 99 ? "99+" : valor}
    </span>
  );
}

function ItemComFilhos({
  item,
  filhos,
  pathname,
  contagens,
}: {
  item: ItemNav;
  filhos: SubItemNav[];
  pathname: string;
  contagens: Contagens;
}) {
  const ativo = estaAtivo(pathname, item.href);
  const [aberto, setAberto] = useState(ativo);
  const Icone = item.icone;

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-center rounded-lg text-sm font-medium transition-colors",
          ativo
            ? cn("bg-gradient-to-r text-white shadow-sm", item.gradiente)
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <Link
          href={item.href}
          onClick={() => setAberto(true)}
          className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2"
        >
          <Icone className="size-4 shrink-0" />
          <span className="min-w-0 break-words leading-tight">{item.label}</span>
          <Selo valor={somarContagens(contagens, item.href)} claro={ativo} />
        </Link>
        <button
          type="button"
          aria-label={aberto ? "Recolher submenu" : "Expandir submenu"}
          aria-expanded={aberto}
          onClick={() => setAberto((v) => !v)}
          className="px-2 py-2"
        >
          <ChevronDown
            className={cn("size-4 transition-transform", aberto && "rotate-180")}
          />
        </button>
      </div>
      {aberto ? (
        <div className="ml-4 space-y-0.5 border-l pl-2">
          {filhos.map((f) => {
            const FIcone = f.icone;
            const fAtivo = estaAtivo(pathname, f.href, f.exato);
            return (
              <Link
                key={f.href}
                href={f.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                  fAtivo
                    ? "bg-accent font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <FIcone className="size-3.5 shrink-0" />
                <span className="min-w-0 break-words leading-tight">{f.label}</span>
                <Selo valor={somarContagens(contagens, f.href, f.exato)} />
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar({
  papel,
  nomePainel,
  logoUrl,
  contagens,
}: {
  papel: Papel;
  nomePainel: string;
  logoUrl: string | null;
  contagens: Contagens;
}) {
  const pathname = usePathname();
  const itens = NAVEGACAO.filter((i) => (!i.requer || pode(papel, i.requer)) && (!i.soColaborador || papel === "colaborador"));
  const principais = itens.filter((i) => !i.separado);
  const separados = itens.filter((i) => i.separado);

  function renderItem(item: ItemNav) {
    if (item.filhos && item.filhos.length > 0) {
      return (
        <ItemComFilhos
          key={item.href}
          item={item}
          filhos={item.filhos}
          pathname={pathname}
          contagens={contagens}
        />
      );
    }
    const ativo = estaAtivo(pathname, item.href);
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
        <span className="min-w-0 break-words leading-tight">{item.label}</span>
        <Selo valor={somarContagens(contagens, item.href)} claro={ativo} />
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
        <NomeMarca />
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
