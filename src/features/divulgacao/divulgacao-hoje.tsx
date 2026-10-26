import Link from "@/components/shared/link";
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

  // E-mails programados para hoje no Calendário geral (nome, status e responsável).
  const supabase = await criarClienteServidor();
  const { data: calendario } = await supabase
    .from("calendario_conteudo")
    .select("id, nome, status, responsaveis")
    .eq("data", hoje)
    .eq("tipo", "E-mail Marketing")
    .order("created_at", { ascending: true });
  const emailsCalendario = (calendario as { id: string; nome: string; status: string; responsaveis: string[] | null }[] | null) ?? [];

  let proxima: string | null = null;
  if (itens.length === 0 && emailsCalendario.length === 0) {
    const { data } = await supabase.from("divulgacao_ofertas").select("data").gt("data", hoje).order("data", { ascending: true }).limit(1);
    proxima = (data as { data: string }[] | null)?.[0]?.data ?? null;
  }

  const inter = itens.filter((o) => o.tipo === "internacional");
  const nac = itens.filter((o) => o.tipo === "nacional");
  // O e-mail do dia é o tipo de divulgação programado (e-mail técnico, e-mail de sábado…); lâmina não é e-mail.
  const emails = Array.from(new Set(inter.map((o) => (o.canal ?? "").trim()).filter((c) => /e-?mail/i.test(c))));

  // Nacional: um item por produto (as várias opções do mesmo produto viram uma linha só, com as temporadas juntas).
  const nacionais = nac.flatMap((o) => {
    const porProduto = new Map<string, { temporadas: string[]; periodos: string[] }>();
    for (const b of blocosNacional(o)) {
      if (!b.produto) continue;
      const nome = primeiraLinha(b.produto);
      const item = porProduto.get(nome) ?? { temporadas: [], periodos: [] };
      const t = b.temporada && primeiraLinha(b.temporada);
      const p = b.periodo && primeiraLinha(b.periodo);
      if (t && t !== "---" && !item.temporadas.includes(t)) item.temporadas.push(t);
      if (p && p !== "---" && !item.periodos.includes(p)) item.periodos.push(p);
      porProduto.set(nome, item);
    }
    return Array.from(porProduto.entries()).map(([titulo, v]) => ({
      tag: "Nacional",
      titulo,
      detalhe: [v.temporadas.join(" · "), v.periodos.join(" · ")].filter(Boolean).join(" — "),
    }));
  });

  const ofertas = [
    ...nacionais,
    ...inter
      .filter((o: Oferta) => o.produto && !/e-?mail/i.test(o.canal ?? ""))
      .map((o) => ({ tag: "Internacional", titulo: primeiraLinha(o.produto), detalhe: o.canal ?? "" })),
  ];

  return (
    <section aria-label="Divulgação de hoje" className="w-full rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Newspaper className="size-4" /> Divulgação de hoje
          </h2>
          <p className="text-xs capitalize text-white/75">
            {diaSemana(hoje)}, {dataCurta(hoje)}
          </p>
        </div>
        <Link href="/operacional/divulgacao" className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-white underline-offset-2 hover:underline">
          Ver semana <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {itens.length === 0 && emailsCalendario.length === 0 ? (
        <p className="mt-4 text-sm text-white/85">
          Nada cadastrado para hoje.
          {proxima ? (
            <>
              {" "}
              Próxima:{" "}
              <Link href={`/operacional/divulgacao?semana=${proxima}`} className="font-semibold underline-offset-2 hover:underline">
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
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/70">
              <Tag className="size-3.5" /> Oferta do dia
            </p>
            {ofertas.length === 0 ? (
              <p className="text-sm text-white/85">Não tem oferta hoje.</p>
            ) : (
              <ul className="space-y-2">
                {ofertas.slice(0, MAX).map((o, i) => (
                  <li key={i} className="text-sm leading-snug">
                    <span className="font-medium">{o.titulo}</span>
                    <span className={`ml-2 rounded px-1 py-0.5 text-[10px] font-semibold bg-white/20 text-white`}>{o.tag}</span>
                    {o.detalhe ? <span className="block text-xs text-white/75">{o.detalhe}</span> : null}
                  </li>
                ))}
                {ofertas.length > MAX ? <li className="text-xs text-white/75">+ {ofertas.length - MAX} outra(s)</li> : null}
              </ul>
            )}
          </div>

          {/* E-mail do dia */}
          <div className="border-t border-white/25 pt-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/70">
              <Mail className="size-3.5" /> E-mail do dia
            </p>
            {emailsCalendario.length > 0 || emails.length > 0 ? (
              <div className="space-y-2">
                {emailsCalendario.length > 0 ? (
                  <ul className="space-y-1.5">
                    {emailsCalendario.map((e) => (
                      <li key={e.id} className="text-sm leading-snug">
                        <span className="font-medium">{e.nome}</span>
                        <span className="ml-2 rounded bg-white/20 px-1 py-0.5 text-[10px] font-semibold">{e.status}</span>
                        {e.responsaveis && e.responsaveis.length > 0 ? <span className="block text-xs text-white/75">{e.responsaveis.join(", ")}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {emails.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {emails.map((e) => (
                      <span key={e} className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
                        {e}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-white/85">Não tem e-mail hoje.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
