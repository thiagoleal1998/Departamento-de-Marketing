import Link from "next/link";
import { NotebookPen, AlertTriangle, CalendarClock } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { mapaDePerfis } from "@/features/chamados/data";
import {
  carregarAtas,
  itemAberto,
  STATUS_ITEM_LABEL,
  type ItemAta,
  type Reuniao,
} from "@/features/atas/data";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FUSO = "America/Sao_Paulo";
const DIA_MS = 86_400_000;

function dataBR(iso: string | null, comHora = false) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(comHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Situação do prazo de um item aberto. */
function situacaoPrazo(prazo: string | null, agora: number) {
  if (!prazo) return { tom: "neutro" as const, texto: "Sem prazo" };
  const dif = new Date(prazo).getTime() - agora;
  if (dif < 0) {
    const dias = Math.max(1, Math.ceil(-dif / DIA_MS));
    return { tom: "atrasado" as const, texto: `Atrasado há ${dias} dia(s)` };
  }
  if (dif <= 2 * DIA_MS) return { tom: "proximo" as const, texto: "Vence em breve" };
  return { tom: "ok" as const, texto: "No prazo" };
}

const TOM: Record<string, string> = {
  atrasado: "border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  proximo: "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  ok: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  neutro: "border-muted bg-muted text-muted-foreground",
};

function LinhaItem({
  it,
  agora,
  vezes,
  mostrarSituacao,
}: {
  it: ItemAta;
  agora: number;
  vezes?: number;
  mostrarSituacao: boolean;
}) {
  const aberto = itemAberto(it.status);
  const sit = situacaoPrazo(it.prazo, agora);
  return (
    <div className="space-y-1.5 border-b p-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium leading-tight">
          {it.prioridade ? (
            <Badge variant="outline" className="mr-2">
              P{it.prioridade}
            </Badge>
          ) : null}
          {it.titulo}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {mostrarSituacao && aberto ? (
            <span className={cn("rounded border px-2 py-0.5 text-xs", TOM[sit.tom])}>
              {sit.texto}
            </span>
          ) : null}
          <Badge variant={aberto ? "secondary" : "outline"}>
            {STATUS_ITEM_LABEL[it.status ?? "sem"]}
          </Badge>
        </div>
      </div>
      {it.detalhamento ? (
        <p className="line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">
          {it.detalhamento}
        </p>
      ) : null}
      {it.plano_acao ? (
        <p className="whitespace-pre-line text-sm">
          <span className="font-medium">Plano de ação: </span>
          {it.plano_acao}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Prazo: {dataBR(it.prazo, true)}
        {it.responsaveis_texto ? ` · ${it.responsaveis_texto}` : ""}
        {vezes && vezes > 1 ? ` · aparece há ${vezes} reuniões` : ""}
        {it.link ? (
          <>
            {" · "}
            <a
              href={it.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              link
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}

export default async function AtasPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba: abaRaw } = await searchParams;
  await exigirUsuario();
  const [{ reunioes, itens }, perfis] = await Promise.all([
    carregarAtas(),
    mapaDePerfis(),
  ]);
  const aba = abaRaw === "reunioes" ? "reunioes" : "pendencias";
  const agora = Date.now();

  const porReuniao = new Map<string, ItemAta[]>();
  for (const it of itens) {
    const l = porReuniao.get(it.reuniao_id) ?? [];
    l.push(it);
    porReuniao.set(it.reuniao_id, l);
  }
  for (const l of porReuniao.values()) {
    l.sort((a, b) =>
      a.secao === b.secao ? a.ordem - b.ordem : a.secao === "ata" ? -1 : 1
    );
  }

  const ultima: Reuniao | undefined = reunioes[reunioes.length - 1];
  const vezesPorSerie = new Map<string, number>();
  for (const it of itens) {
    vezesPorSerie.set(it.serie, (vezesPorSerie.get(it.serie) ?? 0) + 1);
  }

  // Pendências = itens ainda abertos na reunião mais recente.
  const pendentes = (ultima ? porReuniao.get(ultima.id) ?? [] : []).filter(
    (it) => it.secao === "ata" && itemAberto(it.status)
  );
  const atrasados = pendentes.filter(
    (it) => it.prazo && new Date(it.prazo).getTime() < agora
  ).length;

  const grupos = new Map<string, ItemAta[]>();
  for (const it of pendentes) {
    const chave = it.responsavel_id
      ? perfis.get(it.responsavel_id)?.nome ?? it.responsaveis_texto ?? "Sem responsável"
      : it.responsaveis_texto ?? "Sem responsável";
    const l = grupos.get(chave) ?? [];
    l.push(it);
    grupos.set(chave, l);
  }
  const ordemGrupos = Array.from(grupos.entries()).sort((a, b) => {
    if (a[0] === "Sem responsável") return 1;
    if (b[0] === "Sem responsável") return -1;
    return b[1].length - a[1].length;
  });

  const abas = [
    { chave: "pendencias", rotulo: "Pendências", href: "/atas" },
    { chave: "reunioes", rotulo: "Reuniões", href: "/atas?aba=reunioes" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Atas"
        descricao="Reuniões de planejamento de marketing: o que foi combinado, quem é o responsável e até quando."
      />

      <nav aria-label="Seções das atas" className="flex flex-wrap gap-1 border-b">
        {abas.map((a) => (
          <Link
            key={a.chave}
            href={a.href}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              a.chave === aba
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {a.rotulo}
          </Link>
        ))}
      </nav>

      {reunioes.length === 0 ? (
        <EmptyState
          icone={NotebookPen}
          titulo="Nenhuma ata ainda"
          descricao="Rode a migration 0038 no Supabase para importar as atas das reuniões."
        />
      ) : aba === "pendencias" ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarClock className="size-4" />
              Última reunião: {ultima ? dataBR(ultima.data + "T12:00:00-03:00") : "—"}
            </span>
            <Badge variant="secondary">{pendentes.length} em aberto</Badge>
            {atrasados > 0 ? (
              <Badge variant="danger" className="gap-1">
                <AlertTriangle className="size-3" /> {atrasados} atrasado(s)
              </Badge>
            ) : null}
          </div>

          {ordemGrupos.length === 0 ? (
            <EmptyState
              icone={NotebookPen}
              titulo="Tudo em dia"
              descricao="Nenhum item aberto na última reunião."
            />
          ) : (
            ordemGrupos.map(([nome, lista]) => (
              <Card key={nome}>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
                    <h2 className="font-semibold">{nome}</h2>
                    <Badge variant="secondary">{lista.length}</Badge>
                  </div>
                  {lista
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(a.prazo ?? "2999-01-01").getTime() -
                        new Date(b.prazo ?? "2999-01-01").getTime()
                    )
                    .map((it) => (
                      <LinhaItem
                        key={it.id}
                        it={it}
                        agora={agora}
                        vezes={vezesPorSerie.get(it.serie)}
                        mostrarSituacao
                      />
                    ))}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {reunioes
            .slice()
            .reverse()
            .map((r) => {
              const lista = porReuniao.get(r.id) ?? [];
              const ausentes = r.presencas.filter((p) =>
                /ausente/i.test(p.presenca)
              );
              return (
                <Card key={r.id}>
                  <CardContent className="p-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2">
                      <h2 className="font-semibold">
                        {dataBR(r.data + "T12:00:00-03:00")}
                        {r.estado === "em_andamento" ? (
                          <Badge variant="secondary" className="ml-2">
                            Em andamento
                          </Badge>
                        ) : null}
                      </h2>
                      <span className="text-xs text-muted-foreground">
                        {lista.length} item(ns)
                        {ausentes.length > 0
                          ? ` · ausentes: ${ausentes.map((a) => a.nome).join(", ")}`
                          : ""}
                      </span>
                    </div>
                    {lista.map((it) => (
                      <LinhaItem
                        key={it.id}
                        it={it}
                        agora={agora}
                        mostrarSituacao={false}
                      />
                    ))}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}
