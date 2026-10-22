import Link from "next/link";
import { ArrowRight, Mail, Newspaper } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ofertasDoPeriodo } from "./data";
import { blocosNacional, dataBr, dataCurta, diaSemana, hojeSP, type Oferta } from "./tipos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const primeiraLinha = (t: string | null) => (t ?? "").split("\n").map((x) => x.trim()).find(Boolean) ?? "";
const MAX = 6;

/** Quadro do dashboard (gerente e líder): o e-mail e a divulgação programados para hoje. */
export async function DivulgacaoHoje() {
  const hoje = hojeSP();
  const { itens, indisponivel } = await ofertasDoPeriodo(hoje, hoje);
  if (indisponivel) return null; // migration ainda não aplicada: o quadro simplesmente não aparece

  let proxima: string | null = null;
  if (itens.length === 0) {
    const supabase = await criarClienteServidor();
    const { data } = await supabase.from("divulgacao_ofertas").select("data").gt("data", hoje).order("data", { ascending: true }).limit(1);
    proxima = (data as { data: string }[] | null)?.[0]?.data ?? null;
  }

  const inter = itens.filter((o) => o.tipo === "internacional");
  const nac = itens.filter((o) => o.tipo === "nacional");
  // "Qual é o e-mail do dia": o tipo de divulgação programado (e-mail técnico, lâmina, e-mail de sábado…).
  const emails = Array.from(new Set(inter.map((o) => (o.canal ?? "").trim()).filter(Boolean)));

  const linhasNacional = nac.flatMap((o) =>
    blocosNacional(o)
      .filter((b) => b.produto)
      .map((b) => ({ titulo: primeiraLinha(b.produto), detalhe: [b.temporada && primeiraLinha(b.temporada), b.periodo && primeiraLinha(b.periodo)].filter(Boolean).join(" · ") }))
  );
  const linhasInter = inter
    .filter((o: Oferta) => o.produto)
    .map((o) => ({ titulo: primeiraLinha(o.produto), detalhe: o.canal ?? "" }));

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="size-5 text-primary" />
            Divulgação de hoje
          </CardTitle>
          <CardDescription className="capitalize">
            {diaSemana(hoje)}, {dataBr(hoje)}
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/operacional/divulgacao">
            Ver semana <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nada cadastrado para hoje.
            {proxima ? (
              <>
                {" "}
                Próxima divulgação:{" "}
                <Link href={`/operacional/divulgacao?semana=${proxima}`} className="font-medium text-primary hover:underline">
                  <span className="capitalize">{diaSemana(proxima)}</span>, {dataCurta(proxima)}
                </Link>
                .
              </>
            ) : null}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Mail className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">E-mail do dia:</span>
              {emails.length > 0 ? (
                emails.map((e) => (
                  <span key={e} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {e}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">sem e-mail internacional programado</span>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Coluna titulo="Nacional" cor="bg-emerald-100 text-emerald-900" linhas={linhasNacional} />
              <Coluna titulo="Internacional" cor="bg-sky-100 text-sky-900" linhas={linhasInter} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Coluna({ titulo, cor, linhas }: { titulo: string; cor: string; linhas: { titulo: string; detalhe: string }[] }) {
  return (
    <div className="space-y-2">
      <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${cor}`}>{titulo}</span>
      {linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem divulgação hoje.</p>
      ) : (
        <ul className="space-y-1.5">
          {linhas.slice(0, MAX).map((l, i) => (
            <li key={i} className="text-sm leading-snug">
              <span className="font-medium">{l.titulo}</span>
              {l.detalhe ? <span className="block text-xs text-muted-foreground">{l.detalhe}</span> : null}
            </li>
          ))}
          {linhas.length > MAX ? <li className="text-xs text-muted-foreground">+ {linhas.length - MAX} outra(s)</li> : null}
        </ul>
      )}
    </div>
  );
}
