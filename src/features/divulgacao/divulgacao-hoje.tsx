import Link from "next/link";
import { ArrowRight, Mail, Newspaper, Tag } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ofertasDoPeriodo } from "./data";
import { blocosNacional, dataCurta, diaSemana, hojeSP, type Oferta } from "./tipos";

const primeiraLinha = (t: string | null) => (t ?? "").split("\n").map((x) => x.trim()).find(Boolean) ?? "";
const MAX = 4;

/**
 * Quadro compacto do canto do cabeçalho do dashboard (gerente e líder):
 * a oferta do dia (nacional e internacional) e o e-mail programado para hoje.
 */
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
  // O e-mail do dia é o tipo de divulgação programado (e-mail técnico, e-mail de sábado…); lâmina não é e-mail.
  const emails = Array.from(new Set(inter.map((o) => (o.canal ?? "").trim()).filter((c) => /e-?mail/i.test(c))));

  const ofertas = [
    ...nac.flatMap((o) =>
      blocosNacional(o)
        .filter((b) => b.produto)
        .map((b) => ({ tag: "Nacional", titulo: primeiraLinha(b.produto), detalhe: [b.temporada && primeiraLinha(b.temporada), b.periodo && primeiraLinha(b.periodo)].filter(Boolean).join(" · ") }))
    ),
    ...inter
      .filter((o: Oferta) => o.produto && !/e-?mail/i.test(o.canal ?? ""))
      .map((o) => ({ tag: "Internacional", titulo: primeiraLinha(o.produto), detalhe: o.canal ?? "" })),
  ];

  return (
    <section aria-label="Divulgação de hoje" className="w-full rounded-xl border bg-card p-4 shadow-sm lg:w-[440px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Newspaper className="size-4 text-primary" /> Divulgação de hoje
          </h2>
          <p className="text-xs capitalize text-muted-foreground">
            {diaSemana(hoje)}, {dataCurta(hoje)}
          </p>
        </div>
        <Link href="/operacional/divulgacao" className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline">
          Ver semana <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {itens.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nada cadastrado para hoje.
          {proxima ? (
            <>
              {" "}
              Próxima:{" "}
              <Link href={`/operacional/divulgacao?semana=${proxima}`} className="font-medium text-primary hover:underline">
                <span className="capitalize">{diaSemana(proxima)}</span>, {dataCurta(proxima)}
              </Link>
              .
            </>
          ) : null}
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Oferta do dia */}
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Tag className="size-3.5" /> Oferta do dia
            </p>
            {ofertas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Não tem oferta hoje.</p>
            ) : (
              <ul className="space-y-2">
                {ofertas.slice(0, MAX).map((o, i) => (
                  <li key={i} className="text-sm leading-snug">
                    <span className="font-medium">{o.titulo}</span>
                    <span className={`ml-2 rounded px-1 py-0.5 text-[10px] font-semibold ${o.tag === "Nacional" ? "bg-emerald-100 text-emerald-900" : "bg-sky-100 text-sky-900"}`}>{o.tag}</span>
                    {o.detalhe ? <span className="block text-xs text-muted-foreground">{o.detalhe}</span> : null}
                  </li>
                ))}
                {ofertas.length > MAX ? <li className="text-xs text-muted-foreground">+ {ofertas.length - MAX} outra(s)</li> : null}
              </ul>
            )}
          </div>

          {/* E-mail do dia */}
          <div className="border-t pt-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Mail className="size-3.5" /> E-mail do dia
            </p>
            {emails.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {emails.map((e) => (
                  <span key={e} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {e}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Não tem e-mail hoje.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
