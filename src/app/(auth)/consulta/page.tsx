import Link from "@/components/shared/link";
import { ArrowLeft, LogIn } from "lucide-react";
import { obterConfig } from "@/lib/config";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { ConsultaLps, type LpPublica } from "@/features/portal/consulta-lps";
import { ConsultaSite, type PaginaSite } from "@/features/portal/consulta-site";
import { ResumoLpsPublico } from "@/features/operacional/resumo-lps";
import { ResumoConteudos } from "@/features/operacional/resumo-conteudos";
import { NomeMarca } from "@/components/shared/nome-marca";
import { Marca } from "@/components/shared/marca";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ConsultaPage({ searchParams }: { searchParams: Promise<{ aba?: string; sub?: string }> }) {
  const { aba, sub } = await searchParams;
  const secao: "lps" | "site" = aba === "site" ? "site" : "lps";
  const dados = sub !== "lista";
  const { textos, logo } = await obterConfig();

  // Página pública: só expõe títulos, categorias e links.
  let lps: LpPublica[] = [];
  let paginas: PaginaSite[] = [];
  let resumoLps: Record<string, string | null>[] = [];
  let resumoSite: Record<string, string | null>[] = [];
  if (servicoDisponivel()) {
    const supabase = criarClienteAdmin();
    if (dados && secao === "lps") {
      const { data } = await supabase
        .from("landing_pages")
        .select("grupo, status_patrocinio, destino, tipo_pagina, estado, pais")
        .eq("status_patrocinio", "ativo")
        .not("grupo", "in", "(antigas,epic,feriados)")
        .limit(1000);
      resumoLps = (data as Record<string, string | null>[] | null) ?? [];
    } else if (dados) {
      const { data } = await supabase.from("conteudos_site").select("categoria, estrelas, abrangencia").eq("status", "publicado").limit(3000);
      resumoSite = (data as Record<string, string | null>[] | null) ?? [];
    } else if (secao === "lps") {
      const { data } = await supabase
        .from("landing_pages")
        .select("id, nome, grupo, url, status_patrocinio")
        .in("status_patrocinio", ["ativo", "inativo"])
        .not("grupo", "in", "(antigas,epic,feriados)")
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

  const secoes = [
    { id: "lps", rotulo: "Landing pages", href: "/consulta" },
    { id: "site", rotulo: "Site", href: "/consulta?aba=site" },
  ];
  const subabas =
    secao === "lps"
      ? [
          { id: "dados", rotulo: "Dados Gerais", href: "/consulta" },
          { id: "lista", rotulo: "LPs", href: "/consulta?sub=lista" },
        ]
      : [
          { id: "dados", rotulo: "Dados Gerais", href: "/consulta?aba=site" },
          { id: "lista", rotulo: "Páginas", href: "/consulta?aba=site&sub=lista" },
        ];
  const subAtiva = dados ? "dados" : "lista";

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2">
          <Marca logoUrl={logo} boxClassName="size-9 rounded-xl" iconClassName="size-5" imgClassName="h-10 max-w-[160px]" />
          <NomeMarca />
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
            {secao === "lps"
              ? dados
                ? "Números gerais das landing pages ativas."
                : "Landing pages ativas e inativas e os sites em que estão publicadas. Use a busca para encontrar o link que precisa."
              : dados
              ? "Números gerais das páginas publicadas no site da LV."
              : "Páginas e conteúdos publicados no site da LV: resorts, hotéis, destinos, circuitos e LV Magazine."}
          </p>
        </div>

        <nav className="flex gap-1 border-b" aria-label="Seções da consulta">
          {secoes.map((a) => (
            <Link
              key={a.id}
              href={a.href}
              aria-current={a.id === secao ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
                a.id === secao ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {a.rotulo}
            </Link>
          ))}
        </nav>
        <nav className="flex gap-2" aria-label="Subseções">
          {subabas.map((a) => (
            <Link
              key={a.id}
              href={a.href}
              aria-current={a.id === subAtiva ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                a.id === subAtiva ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {a.rotulo}
            </Link>
          ))}
        </nav>

        {dados ? (
          // Só leitura: os números não levam às telas internas.
          <div className="[&_a]:pointer-events-none [&_a]:cursor-default">
            {secao === "lps" ? <ResumoLpsPublico linhas={resumoLps} /> : <ResumoConteudos linhas={resumoSite} />}
          </div>
        ) : secao === "lps" ? (
          <ConsultaLps lps={lps} />
        ) : (
          <ConsultaSite paginas={paginas} />
        )}
      </main>
    </div>
  );
}
