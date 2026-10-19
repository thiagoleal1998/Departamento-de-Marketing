import Link from "next/link";
import { ArrowRight, Inbox, LogIn, Search, Users } from "lucide-react";
import { obterConfig } from "@/lib/config";
import { Marca } from "@/components/shared/marca";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const ATALHOS = [
  {
    href: "/central",
    icone: Inbox,
    titulo: "Central de Solicitações",
    texto: "Peça artes, campanhas e materiais ao marketing e receba um número de acompanhamento.",
    acao: "Abrir uma solicitação",
  },
  {
    href: "/consulta",
    icone: Search,
    titulo: "Consulta",
    texto: "Veja as landing pages ativas, os sites e os links oficiais, sem precisar pedir ao time.",
    acao: "Consultar dados",
  },
  {
    href: "/login",
    icone: Users,
    titulo: "Área do time",
    texto: "Acesso do time de marketing ao painel de gestão, criação, operação e desenvolvimento.",
    acao: "Entrar",
  },
];

export default async function HomePage() {
  const { textos, logo } = await obterConfig();

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <Marca logoUrl={logo} boxClassName="size-9 rounded-xl" iconClassName="size-5" imgClassName="h-10 max-w-[160px]" />
          <span className="text-sm font-semibold">{textos.painel_nome}</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
            <Link href="/login">
              <LogIn className="size-4" /> Área do time
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 pb-16 pt-8 lg:pt-14">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Marketing</h1>
          <p className="text-lg text-muted-foreground">
            Tudo o que você precisa do marketing em um só lugar: peça serviços, consulte informações e acesse a área do
            time.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {ATALHOS.map(({ href, icone: Icone, titulo, texto, acao }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icone className="size-6" />
              </span>
              <h2 className="text-lg font-semibold">{titulo}</h2>
              <p className="flex-1 text-sm text-muted-foreground">{texto}</p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                {acao} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          Já abriu uma solicitação?{" "}
          <Link href="/acompanhar" className="font-medium text-primary underline">
            Acompanhe pelo número do chamado
          </Link>
          .
        </p>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">{textos.painel_nome}</footer>
    </div>
  );
}
