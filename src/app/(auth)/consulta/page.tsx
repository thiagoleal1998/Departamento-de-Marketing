import Link from "next/link";
import { ArrowLeft, LogIn } from "lucide-react";
import { obterConfig } from "@/lib/config";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { ConsultaLps, type LpPublica } from "@/features/portal/consulta-lps";
import { ConsultaSite, type PaginaSite } from "@/features/portal/consulta-site";
import { ResumoLpsPublico } from "@/features/operacional/resumo-lps";
import { ResumoConteudos } from "@/features/operacional/resumo-conteudos";
import { Marca } from "@/components/shared/marca";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ConsultaPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams;
  const ativa = aba === "site" ? "site" : aba === "lps" ? "lps" : "dados";
  const { textos, logo } = await obterConfig();

  // Página pública: só expõe títulos, categorias e links.
  let lps: LpPublica[] = [];
  let paginas: PaginaSite[] = [];
  let resumoLps: Record<string, string | null>[] = [];
  let resumoSite: Record<string, string | null>[] = [];
  if (servicoDisponivel()) {
    const supabase = criarClienteAdmin();
    if (ativa === "dados") {
      const [a, b] = await Promise.all([
        supabase
          .from("landing_pages")
          .select("grupo, status_patrocinio, destino, tipo_pagina, estado, pais")
          .eq("status_patrocinio", "ativo")
          .not("grupo", "in", "(antigas,epic,feriados)")
          .limit(1000),
        supabase.from("conteudos_site").select("categoria, estrelas, abrangencia").eq("status", "publicado").limit(3000),
      ]);
      resumoLps = (a.data as Record<string, string | null>[] | null) ?? [];
      resumoSite = (b.data as Record<string, string | null>[] | null) ?? [];
    } else if (ativa === "lps") {
      const { data } = await supabase
        .from("landing_pages")
        .select("id, nome, grupo, url")
        .eq("status_patrocinio", "ativo")
        .order("nome")
        .limit(1000);
      lps = (data as LpPublica[] | null) ?? [];
    } else {
      const { data } = await supabase
        .from("conteudos_site")
        .select("id, titulo, pagina_url, categoria, estrelas, abrangencia")
        .eq("status", "publicado")
        .order("titulo")
        .limit(2000);
      paginas = (data as PaginaSite[] | null) ?? [];
    }
  }

  const abas = [
    { id: "dados", rotulo: "Dados gerais", href: "/consulta" },
    { id: "lps", rotulo: "Landing pages ativas", href: "/consulta?aba=lps" },
    { id: "site", rotulo: "Site da LV", href: "/consulta?aba=site" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2">
          <Marca logoUrl={logo} boxClassName="size-9 rounded-xl" iconClassName="size-5" imgClassName="h-10 max-w-[160px]" />
          <span className="text-sm font-semibold">{textos.painel_nome}</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
            <Link href="/login">
              <LogIn className="size-4" /> Área do time
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 pb-16 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar para o início
        </Link>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Consulta</h1>
          <p className="text-sm text-muted-foreground">
            {ativa === "dados"
              ? "Números gerais das landing pages ativas e das páginas publicadas no site da LV."
              : ativa === "lps"
              ? "Landing pages ativas e os sites em que estão publicadas. Use a busca para encontrar o link que precisa."
              : "Páginas e conteúdos publicados no site da LV: resorts, hotéis, destinos, circuitos e LV Magazine."}
          </p>
        </div>

        <nav className="flex gap-1 border-b" aria-label="Seções da consulta">
          {abas.map((a) => (
            <Link
              key={a.id}
              href={a.href}
              aria-current={a.id === ativa ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                a.id === ativa
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {a.rotulo}
            </Link>
          ))}
        </nav>

        {ativa === "dados" ? (
          // Só leitura: os números não levam às telas internas.
          <div className="space-y-8 [&_a]:pointer-events-none [&_a]:cursor-default">
            <ResumoLpsPublico linhas={resumoLps} />
            <ResumoConteudos linhas={resumoSite} />
          </div>
        ) : ativa === "lps" ? (
          <ConsultaLps lps={lps} />
        ) : (
          <ConsultaSite paginas={paginas} />
        )}
      </main>
    </div>
  );
}
