import { LogIn } from "lucide-react";
import Link from "@/components/shared/link";
import { Marca } from "@/components/shared/marca";
import { NomeMarca } from "@/components/shared/nome-marca";

const ITENS = [
  { href: "#setores", rotulo: "Liderança e setores" },
  { href: "/central", rotulo: "Pedir ao marketing" },
  { href: "/acompanhar", rotulo: "Acompanhar pedido" },
  { href: "/consulta", rotulo: "Consulta" },
  { href: "/contatos", rotulo: "Contatos" },
];

const ESTILO = "whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white";

/** Menu superior da página inicial: fica preso no topo; em telas estreitas os itens rolam de lado numa segunda linha. */
export function MenuSuperior({ logo }: { logo?: string | null }) {
  return (
    <header className="home-menu sticky top-0 z-30 border-b border-white/10 bg-[#060a12]/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Marca logoUrl={logo} boxClassName="size-10 rounded-xl" iconClassName="size-5" imgClassName="h-10 max-w-[160px]" />
          <NomeMarca />
        </Link>
        <nav aria-label="Menu principal" className="order-3 -mx-5 flex w-[calc(100%+2.5rem)] gap-1 overflow-x-auto px-5 [scrollbar-width:none] lg:order-none lg:mx-0 lg:w-auto lg:px-0">
          {ITENS.map((i) =>
            i.href.startsWith("#") ? (
              <a key={i.href} href={i.href} className={ESTILO}>
                {i.rotulo}
              </a>
            ) : (
              <Link key={i.href} href={i.href} className={ESTILO}>
                {i.rotulo}
              </Link>
            )
          )}
        </nav>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/10"
        >
          <LogIn className="size-4" /> Área do time
        </Link>
      </div>
    </header>
  );
}
