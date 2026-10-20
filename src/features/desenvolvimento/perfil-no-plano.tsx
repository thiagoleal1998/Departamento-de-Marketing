import { Brain, Lightbulb } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FATOR_META, type FatorDisc, type PerfilComportamental } from "@/features/perfis/tipos";
import { FONTES, NUANCE_SECUNDARIO, ORIENTACAO } from "./disc-orientacao";
import { cn } from "@/lib/utils";

function Lista({ titulo, itens, tom }: { titulo: string; itens: string[]; tom?: "alerta" | "ok" }) {
  if (itens.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h4 className={cn("text-xs font-semibold uppercase tracking-wide", tom === "alerta" ? "text-red-600" : tom === "ok" ? "text-emerald-700" : "text-muted-foreground")}>
        {titulo}
      </h4>
      <ul className="list-disc space-y-1 pl-4 text-sm marker:text-muted-foreground">
        {itens.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

const Fator = ({ f }: { f: FatorDisc }) => (
  <span className={cn("inline-flex size-7 items-center justify-center rounded-md text-sm font-bold text-white", FATOR_META[f].cor)}>{f}</span>
);

/**
 * Embasamento do plano no perfil comportamental (DISC) da pessoa, com sugestões de
 * abordagem ao gestor. Aparece só para a liderança; a RLS já restringe quem vê cada perfil.
 */
export async function PerfilNoPlano({ colaboradorId, email }: { colaboradorId: string; email: string | null }) {
  const supabase = await criarClienteServidor();
  const filtro = email ? `profile_id.eq.${colaboradorId},email.ilike.${email}` : `profile_id.eq.${colaboradorId}`;
  const { data } = await supabase.from("perfis_comportamentais").select("*").or(filtro).limit(1).maybeSingle();
  const perfil = data as PerfilComportamental | null;

  if (!perfil) {
    return (
      <section className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Brain className="size-4" /> Embasamento no perfil comportamental
        </p>
        <p className="mt-1">
          Ainda não há perfil DISC desta pessoa no painel (ou você não tem acesso a ele). Quando o gerente sincronizar com a DISC
          RH, as sugestões de abordagem aparecem aqui.
        </p>
      </section>
    );
  }

  const o = ORIENTACAO[perfil.perfil_primario];
  const d = perfil.dados;
  const insight = (t: string) => d?.insights?.find((i) => i.titulo.toLowerCase().includes(t))?.texto;
  const sec = perfil.perfil_secundario;

  return (
    <section className="space-y-5 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Brain className="size-5 text-primary" /> Embasamento no perfil comportamental
          </h2>
          <p className="text-sm text-muted-foreground">
            Como apresentar, acompanhar e dar feedback neste plano, com base no DISC de {perfil.nome.split(" ")[0]}. Visível só para a
            liderança.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Fator f={perfil.perfil_primario} />
          <span className="font-medium">{o.rotulo}</span>
          {sec ? (
            <>
              <span className="text-muted-foreground">+</span>
              <Fator f={sec} />
              <span className="text-muted-foreground">{FATOR_META[sec].nome}</span>
            </>
          ) : null}
        </div>
      </div>

      <p className="text-sm">{o.resumo}</p>
      {sec ? <p className="rounded-md bg-muted/50 px-3 py-2 text-sm">{NUANCE_SECUNDARIO[sec]}</p> : null}

      {/* Do relatório da própria pessoa */}
      {d && (d.motivadores?.length || d.desafios?.length || d.pontos_fortes?.length) ? (
        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="size-4 text-amber-500" /> Do relatório DISC de {perfil.nome.split(" ")[0]}
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <Lista titulo="Pontos fortes" itens={d.pontos_fortes ?? []} tom="ok" />
            <Lista titulo="Motivadores" itens={d.motivadores ?? []} />
            <Lista titulo="Desafios" itens={d.desafios ?? []} tom="alerta" />
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            {[
              ["Comunicação", insight("comunica")],
              ["Tomada de decisão", insight("decis")],
              ["Sob estresse", insight("estresse")],
              ["Ambiente ideal", insight("ambiente")],
            ].map(([t, txt]) =>
              txt ? (
                <p key={t} className="rounded-md bg-muted/40 p-3">
                  <span className="font-medium">{t}: </span>
                  {txt}
                </p>
              ) : null
            )}
          </div>
          <Lista titulo="Sugestões de desenvolvimento do relatório" itens={[...(d.desenvolvimento ?? []), ...(d.recomendacoes ?? [])].slice(0, 8)} />
        </div>
      ) : null}

      {/* Orientação ao gestor */}
      <div className="grid gap-5 md:grid-cols-2">
        <Lista titulo="Como apresentar o plano" itens={o.apresentarPlano} />
        <Lista titulo="Como dar feedback" itens={o.darFeedback} />
        <Lista titulo="Como definir as metas" itens={o.metas} />
        <Lista titulo="Como acompanhar" itens={o.acompanhamento} />
        <Lista titulo="Como reconhecer" itens={o.reconhecer} tom="ok" />
        <Lista titulo="O que evitar" itens={o.evitar} tom="alerta" />
        <Lista titulo="Perguntas para a conversa" itens={o.perguntas} />
        <Lista titulo="Ideias de ações de desenvolvimento" itens={o.acoesDeDesenvolvimento} />
        <Lista titulo="O que costuma ocorrer sob pressão" itens={o.sobPressao} tom="alerta" />
        <Lista titulo="O que a motiva" itens={o.motivadores} tom="ok" />
      </div>

      <p className="rounded-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <strong>Atenção: </strong>
        {o.atencao}
      </p>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium">Base das orientações e cuidados no uso</summary>
        <div className="mt-2 space-y-2">
          <p>
            O DISC descreve preferências de comportamento; <strong>não é um preditor validado de desempenho</strong> e não define quem a
            pessoa é. Use estas dicas como ponto de partida, confirme com o que você observa no dia a dia e com a própria pessoa, e
            evite rotular. Ela pode ter ajustado o comportamento ao contexto de trabalho.
          </p>
          <p>As orientações sintetizam materiais de prática de gestão e coaching com DISC:</p>
          <ul className="list-disc space-y-0.5 pl-4">
            {FONTES.map((f) => (
              <li key={f.url}>
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {f.titulo}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </section>
  );
}
