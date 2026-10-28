import Link from "@/components/shared/link";
import { ArrowLeft, Mail } from "lucide-react";
import { obterConfig } from "@/lib/config";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { NomeMarca } from "@/components/shared/nome-marca";
import { Marca } from "@/components/shared/marca";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const ORDEM_PAPEL: Record<string, number> = { gerente: 0, lider: 1, colaborador: 2 };

/** Posição do cargo na hierarquia (menor = mais alto). Cargo não reconhecido cai no meio, pelo papel no sistema. */
const HIERARQUIA: [RegExp, number][] = [
  [/diretor/, 0],
  [/gerente/, 1],
  [/coordenador/, 2],
  [/supervisor|lider/, 3],
  [/analista/, 4],
  [/assistente/, 5],
  [/auxiliar/, 6],
  [/estagiari|trainee/, 7],
];
const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function posicaoDoCargo(cargo: string | null, papel: string): number {
  const c = semAcento(cargo ?? "");
  const achou = HIERARQUIA.find(([re]) => re.test(c));
  return achou ? achou[1] : 4.5 + (ORDEM_PAPEL[papel] ?? 9) / 100;
}

/** Contatos do time de Marketing (página pública, ligada pela página inicial). */
export default async function ContatosPage() {
  const { textos, logo } = await obterConfig();

  let pessoas: { id: string; nome: string; cargo: string | null; email: string; avatar_url: string | null; role: string }[] = [];
  if (servicoDisponivel()) {
    const { data } = await criarClienteAdmin().from("profiles").select("id, nome, cargo, email, avatar_url, role").eq("ativo", true);
    pessoas = ((data as typeof pessoas | null) ?? [])
      .filter((p) => p.email)
      .sort((a, b) => posicaoDoCargo(a.cargo, a.role) - posicaoDoCargo(b.cargo, b.role) || a.nome.localeCompare(b.nome, "pt-BR"));
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2">
          <Marca logoUrl={logo} boxClassName="size-9 rounded-xl" iconClassName="size-5" imgClassName="h-10 max-w-[160px]" />
          <NomeMarca />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <ArrowLeft className="size-4" /> Início
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-16 pt-6">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Contatos do Marketing</h1>
          <p className="text-sm text-muted-foreground">
            Fale direto com o time. Para pedir arte, campanha, vídeo ou página, prefira a{" "}
            <Link href="/central" className="font-medium text-primary hover:underline">
              Central de Solicitações
            </Link>
            : o pedido ganha um número e você acompanha cada etapa.
          </p>
        </div>

        {pessoas.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Os contatos não estão disponíveis no momento.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {pessoas.map((p) => (
              <li key={p.id} className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm">
                <Avatar nome={p.nome} src={p.avatar_url} className="size-14 text-lg" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.nome}</p>
                  {p.cargo ? <p className="truncate text-sm text-muted-foreground">{p.cargo}</p> : null}
                  <a href={`mailto:${p.email}`} className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-sm font-medium text-primary hover:underline">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{p.email}</span>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">{textos.painel_nome}</footer>
    </div>
  );
}
