import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { obterConfig } from "@/lib/config";
import { AcompanharForm } from "@/features/portal/acompanhar-form";
import { Marca } from "@/components/shared/marca";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AcompanharPage() {
  const { textos, logo } = await obterConfig();

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2">
          <Marca
            logoUrl={logo}
            boxClassName="size-9 rounded-xl"
            iconClassName="size-5"
            imgClassName="h-10 max-w-[160px]"
          />
          <span className="text-sm font-semibold">{textos.painel_nome}</span>
        </Link>
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft className="size-4" /> Abrir chamado
          </Link>
        </Button>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar para a central
        </Link>
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Acompanhar chamado
          </h1>
          <p className="text-sm text-muted-foreground">
            Informe o número do chamado e o e-mail usado na abertura para ver a
            situação.
          </p>
        </div>
        <AcompanharForm />
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        {textos.painel_nome} · Central de Solicitações
      </footer>
    </div>
  );
}
