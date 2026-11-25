import Link from "@/components/shared/link";
import { ArrowRight, CalendarOff, Palmtree } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeSP } from "@/features/divulgacao/tipos";
import { proximoDiaUtil, rotuloTipo, textoPeriodo, textoRetorno } from "@/features/folgas/tipos";
import { cn } from "@/lib/utils";

/** Quantos dias à frente o quadro olha (cobre a próxima semana e o próximo mês). */
const DIAS_A_FRENTE = 45;

const DIA = 86_400_000;
const utc = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
};
const somarDias = (iso: string, n: number) => new Date(utc(iso) + n * DIA).toISOString().slice(0, 10);

interface Ausencia {
  chave: string;
  tipo: "ferias" | "folga";
  nome: string;
  rotulo: string;
  inicio: string;
  fim: string;
  retorno: string | null;
}

/** Quando começa: "Agora", "Hoje", "Amanhã", "Na próxima semana", "Em 12 dias". */
function quando(inicio: string, fim: string, hoje: string): { texto: string; cor: string } {
  if (inicio <= hoje && fim >= hoje) return { texto: "Agora", cor: "bg-emerald-100 text-emerald-900" };
  const dias = Math.round((utc(inicio) - utc(hoje)) / DIA);
  if (dias === 1) return { texto: "Amanhã", cor: "bg-amber-100 text-amber-900" };
  if (dias <= 7) return { texto: `Em ${dias} dias`, cor: "bg-amber-100 text-amber-900" };
  if (dias <= 14) return { texto: "Na próxima semana", cor: "bg-sky-100 text-sky-900" };
  return { texto: `Em ${dias} dias`, cor: "bg-muted text-muted-foreground" };
}

/**
 * Quadro do dashboard da liderança: quem está de férias ou de folga agora e quem vai estar nas próximas semanas,
 * para planejar a cobertura. Só nome, tipo e período: a justificativa das folgas nunca aparece aqui.
 */
export async function ProximasAusencias() {
  const hoje = hojeSP();
  const limite = somarDias(hoje, DIAS_A_FRENTE);
  const supabase = await criarClienteServidor();

  const lerFolgas = (colunas: string) =>
    supabase.from("folgas").select(colunas).gte("fim", hoje).lte("inicio", limite).order("inicio", { ascending: true });
  const [feriasR, folgasComRetorno, pessoasR] = await Promise.all([
    supabase.from("ferias").select("id, profile_id, inicio, fim").gte("fim", hoje).lte("inicio", limite).order("inicio", { ascending: true }),
    lerFolgas("id, profile_id, tipo, inicio, fim, retorno"),
    supabase.from("profiles").select("id, nome"),
  ]);
  // Antes da migration 0091 não existe a coluna "retorno"; sem a 0090 não existe a tabela (o quadro mostra só as férias).
  const folgasR = folgasComRetorno.error ? await lerFolgas("id, profile_id, tipo, inicio, fim") : folgasComRetorno;

  const nomes = new Map(((pessoasR.data as { id: string; nome: string }[] | null) ?? []).map((p) => [p.id, p.nome]));
  const primeiro = (id: string) => (nomes.get(id) ?? "—").split(" ").slice(0, 2).join(" ");

  const lista: Ausencia[] = [
    ...((feriasR.data as { id: string; profile_id: string; inicio: string; fim: string }[] | null) ?? []).map((f) => ({
      chave: "f" + f.id,
      tipo: "ferias" as const,
      nome: primeiro(f.profile_id),
      rotulo: "Férias",
      inicio: f.inicio,
      fim: f.fim,
      retorno: proximoDiaUtil(f.fim), // férias: volta no próximo dia útil
    })),
    ...(((folgasR.error ? [] : folgasR.data) as unknown as { id: string; profile_id: string; tipo: string; inicio: string; fim: string; retorno?: string | null }[] | null) ?? []).map((f) => ({
      chave: "o" + f.id,
      tipo: "folga" as const,
      nome: primeiro(f.profile_id),
      rotulo: rotuloTipo(f.tipo),
      inicio: f.inicio,
      fim: f.fim,
      retorno: f.retorno ?? null,
    })),
  ].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Próximas folgas e férias</h2>
          <p className="text-xs text-muted-foreground">Quem estará ausente nos próximos {DIAS_A_FRENTE} dias.</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <Link href="/gestao/folgas" className="inline-flex items-center gap-1 text-primary hover:underline">
            Folgas <ArrowRight className="size-3" />
          </Link>
          <Link href="/gestao/ferias" className="inline-flex items-center gap-1 text-primary hover:underline">
            Férias <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">Ninguém com folga ou férias programadas nesse período.</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((a) => {
            const q = quando(a.inicio, a.fim, hoje);
            const Icone = a.tipo === "ferias" ? Palmtree : CalendarOff;
            return (
              <li key={a.chave} className="flex items-start gap-3 rounded-xl border bg-background/60 p-3">
                <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", a.tipo === "ferias" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700")}>
                  <Icone className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <p className="truncate text-sm font-semibold">{a.nome}</p>
                    <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", q.cor)}>{q.texto}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {a.rotulo} · {textoPeriodo(a)}
                    {a.retorno ? ` · volta em ${textoRetorno(a)}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
