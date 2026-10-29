import Link from "@/components/shared/link";
import { ArrowRight, ArrowUpRight, Inbox, LogIn, Mail, Radar, Search, Sparkles } from "lucide-react";
import { obterConfig } from "@/lib/config";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { NomeMarca } from "@/components/shared/nome-marca";
import { Marca } from "@/components/shared/marca";
import { CartaoHolofote, Contador, TextoRotativo } from "@/features/portal/home-efeitos";

export const dynamic = "force-dynamic";

const SERVICOS = [
  "Landing pages",
  "Banners",
  "Vídeos",
  "Lâminas",
  "E-mail marketing",
  "Artes para redes sociais",
  "Campanhas",
  "Conteúdo para o site",
  "Materiais gráficos",
  "Eventos e feiras",
];

/** Números reais do marketing (só contagens, sem dados internos). */
async function numeros() {
  if (!servicoDisponivel()) return { lps: 0, paginas: 0, atendidos: 0 };
  const sb = criarClienteAdmin();
  const head = { count: "exact" as const, head: true };
  const [lps, paginas, atendidos] = await Promise.all([
    sb.from("landing_pages").select("id", head).eq("status_patrocinio", "ativo").not("grupo", "in", "(antigas,epic,feriados)"),
    sb.from("conteudos_site").select("id", head).eq("status", "publicado"),
    sb.from("chamados").select("id", head).eq("origem", "portal").in("status", ["resolvido", "fechado"]),
  ]);
  return { lps: lps.count ?? 0, paginas: paginas.count ?? 0, atendidos: atendidos.count ?? 0 };
}

export default async function HomePage() {
  const [{ logo }, n] = await Promise.all([obterConfig(), numeros()]);
  const versao = process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-[#060a12] text-foreground">
      {/* Aurora: luzes nas cores da marca */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="home-aurora absolute -left-32 -top-32 size-[520px] rounded-full bg-emerald-500/30 blur-[120px]" />
        <div className="home-aurora absolute -right-24 top-10 size-[480px] rounded-full bg-teal-400/25 blur-[120px] [animation-delay:-6s]" />
        <div className="home-aurora absolute left-1/3 top-[420px] size-[420px] rounded-full bg-amber-400/15 blur-[130px] [animation-delay:-11s]" />
        <div className="home-aurora absolute -right-40 top-[780px] size-[460px] rounded-full bg-orange-500/15 blur-[130px] [animation-delay:-3s]" />
        <div
          className="absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,black,transparent)]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-3">
          <Marca logoUrl={logo} boxClassName="size-10 rounded-xl" iconClassName="size-5" imgClassName="h-10 max-w-[160px]" />
          <NomeMarca />
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:border-white/30 hover:bg-white/10"
        >
          <LogIn className="size-4" /> Área do time
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20">
        {/* Hero */}
        <section className="home-entrar space-y-8 pb-14 pt-10 sm:pt-16 lg:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3.5 py-1.5 text-xs font-medium text-emerald-200">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-300" />
            </span>
            Marketing em movimento
          </span>

          <h1 className="max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Ideias que viram <TextoRotativo palavras={["campanhas", "landing pages", "vídeos", "experiências", "resultados"]} />
          </h1>

          <p className="max-w-2xl text-lg text-slate-300 sm:text-xl">
            Peça ao marketing, acompanhe cada etapa e encontre os links oficiais da Litoral Verde — tudo num só lugar, sem
            e-mail perdido e sem precisar perguntar.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/central"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-300 px-6 py-3.5 text-base font-semibold text-slate-950 shadow-[0_0_40px_-8px_rgba(52,211,153,0.7)] transition hover:scale-[1.03] hover:shadow-[0_0_55px_-6px_rgba(52,211,153,0.9)]"
            >
              <Sparkles className="size-5" /> Pedir ao marketing
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/consulta"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-base font-medium text-white backdrop-blur transition hover:border-white/40 hover:bg-white/10"
            >
              <Search className="size-5" /> Consultar dados
            </Link>
          </div>
        </section>

        {/* Números ao vivo */}
        <section aria-label="Números do marketing" className="home-entrar grid gap-4 [animation-delay:150ms] sm:grid-cols-3">
          {[
            { valor: n.lps, rotulo: "landing pages no ar", cor: "from-emerald-300 to-teal-300" },
            { valor: n.paginas, rotulo: "páginas publicadas no site", cor: "from-teal-300 to-sky-300" },
            { valor: n.atendidos, rotulo: "solicitações atendidas", cor: "from-amber-300 to-orange-300" },
          ].map((s) => (
            <div key={s.rotulo} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <p className={`bg-gradient-to-r ${s.cor} bg-clip-text pb-1 text-5xl font-bold leading-tight text-transparent sm:text-6xl`}>
                <Contador valor={s.valor} />
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                <Radar className="size-4 text-emerald-300" /> {s.rotulo}
              </p>
            </div>
          ))}
        </section>

        {/* Faixa de serviços */}
        <section
          aria-label="O que o marketing faz"
          className="relative my-14 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]"
        >
          <div className="home-faixa flex w-max gap-3">
            {[...SERVICOS, ...SERVICOS].map((s, i) => (
              <span
                key={i}
                className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.05] px-5 py-2.5 text-sm font-medium text-slate-200"
              >
                {s}
              </span>
            ))}
          </div>
        </section>

        {/* Atalhos (bento) */}
        <section className="grid gap-4 md:grid-cols-3 md:grid-rows-2">
          <CartaoHolofote href="/central" className="gap-4 md:col-span-2 md:row-span-2 md:p-9">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950">
              <Inbox className="size-7" />
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Central de Solicitações</h2>
            <p className="max-w-md flex-1 text-base text-slate-300">
              Precisa de arte, campanha, vídeo ou página? Descreva o pedido, anexe referências e receba um número para
              acompanhar do início ao fim.
            </p>
            <span className="inline-flex items-center gap-2 text-base font-semibold text-emerald-300">
              Abrir uma solicitação{" "}
              <ArrowUpRight className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </CartaoHolofote>

          <CartaoHolofote href="/consulta" className="gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-amber-300">
              <Search className="size-5" />
            </span>
            <h2 className="text-xl font-semibold text-white">Consulta</h2>
            <p className="flex-1 text-sm text-slate-300">Landing pages, sites e links oficiais, na hora.</p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-300">
              Consultar dados <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </CartaoHolofote>

          <CartaoHolofote href="/acompanhar" className="gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-teal-300">
              <Radar className="size-5" />
            </span>
            <h2 className="text-xl font-semibold text-white">Acompanhar pedido</h2>
            <p className="flex-1 text-sm text-slate-300">Veja o andamento com o número do seu chamado.</p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-300">
              Acompanhar <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </CartaoHolofote>
        </section>

        <section className="mt-4">
          <CartaoHolofote href="/contatos" className="flex-row items-center justify-between gap-4 !p-6">
            <span className="flex items-center gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-orange-300">
                <Mail className="size-5" />
              </span>
              <span>
                <span className="block text-lg font-semibold text-white">Contatos do Marketing</span>
                <span className="block text-sm text-slate-300">Quem é quem no time e como falar direto com cada pessoa.</span>
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-orange-300">
              Ver contatos <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </CartaoHolofote>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-xs text-slate-400">
        Departamento de Marketing · Litoral Verde Operadora{versao ? ` · v${versao}` : ""}
      </footer>
    </div>
  );
}
