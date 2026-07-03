import Link from "next/link";
import { Megaphone, LogIn, Clock, Palette, MessagesSquare } from "lucide-react";
import { obterConfig } from "@/lib/config";
import { PortalForm } from "@/features/portal/portal-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const { textos } = await obterConfig();

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background">
      {/* Topo */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Megaphone className="size-5" />
          </div>
          <span className="text-sm font-semibold">{textos.painel_nome}</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/login">
            <LogIn className="size-4" /> Área do time
          </Link>
        </Button>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-4 pb-16 pt-6 lg:grid-cols-2 lg:gap-12 lg:pt-12">
        {/* Apresentação */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {textos.portal_titulo}
            </h1>
            <p className="text-lg text-muted-foreground">
              {textos.portal_subtitulo}
            </p>
            <p className="text-sm text-muted-foreground">
              {textos.portal_descricao}
            </p>
          </div>

          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <Palette className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                Peça <strong>artes, campanhas e materiais</strong> em um só lugar.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Clock className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                Receba um <strong>número de acompanhamento</strong> na hora.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <MessagesSquare className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                A equipe de marketing <strong>faz a triagem e acompanha</strong>{" "}
                cada solicitação.
              </span>
            </li>
          </ul>
        </div>

        {/* Formulário */}
        <div>
          <PortalForm titulo={textos.portal_form_titulo} />
        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        {textos.painel_nome} · Central de Solicitações
      </footer>
    </div>
  );
}
