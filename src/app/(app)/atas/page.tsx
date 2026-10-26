import Link from "@/components/shared/link";
import { NotebookPen, AlertTriangle, CalendarClock } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { mapaDePerfis } from "@/features/chamados/data";
import { ehLideranca } from "@/lib/permissions";
import { estadoVivoPorSerie } from "@/features/atas/vivo";
import { criarReuniao } from "@/features/atas/actions";
import { ItemCard, type ItemCardDados } from "@/features/atas/item-card";
import { Relatorios } from "@/features/atas/relatorios";
import { calcularRelatorio } from "@/features/atas/relatorios-calculo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  carregarAtas,
  carregarMembros,
  itemAberto,
  STATUS_ITEM_LABEL,
  situacaoNaData,
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

function paraCard(
  it: ItemAta,
  agora: number,
  opcoes: { situacao: boolean; vezes?: number; responsavel: string | null }
): ItemCardDados {
  const aberto = itemAberto(it.status);
  return {
    id: it.id,
    titulo: it.titulo,
    prioridade: it.prioridade,
    statusRotulo: STATUS_ITEM_LABEL[it.status ?? "sem"],
    aberto,
    situacao: opcoes.situacao && aberto ? situacaoPrazo(it.prazo, agora) : undefined,
    prazo: dataBR(it.prazo, true),
    responsavel: opcoes.responsavel,
    vezes: opcoes.vezes,
    detalhamento: it.detalhamento,
    plano: it.plano_acao,
    link: it.link,
  };
}

export default async function AtasPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba: abaRaw } = await searchParams;
  const usuario = await exigirUsuario();
  const [{ reunioes, itens }, perfis, membros] = await Promise.all([carregarAtas(), mapaDePerfis(), carregarMembros()]);
  // Só os itens da ata mais recente precisam do andamento real (é o que aparece nas pendências).
  const idUltima = reunioes[reunioes.length - 1]?.id;
  const vivo = await estadoVivoPorSerie(itens.filter((it) => it.reuniao_id === idUltima && it.secao === "ata"));
  const lideranca = ehLideranca(usuario.role);
  const hojeBR = new Date().toLocaleDateString("en-CA", { timeZone: FUSO });
  const aba =
    abaRaw === "reunioes" ? "reunioes" : abaRaw === "relatorios" ? "relatorios" : "pendencias";
  const agora = Date.now();

  const porReuniao = new Map<string, ItemAta[]>();
  for (const it of itens) {
    const l = porReuniao.get(it.reuniao_id) ?? [];
    l.push(it);
    porReuniao.set(it.reuniao_id, l);
  }
  for (const l of porReuniao.values()) {
    l.sort((a, b) => (a.secao === b.secao ? a.ordem - b.ordem : a.secao === "ata" ? -1 : 1));
  }

  const ultima: Reuniao | undefined = reunioes[reunioes.length - 1];
  const vezesPorSerie = new Map<string, number>();
  for (const it of itens) {
    vezesPorSerie.set(it.serie, (vezesPorSerie.get(it.serie) ?? 0) + 1);
  }

  // O andamento real vem da tarefa vinculada (atualizada pelo responsável no kanban).
  const comEstadoAtual = (it: ItemAta): ItemAta => {
    const v = vivo.get(it.serie);
    return v
      ? {
          ...it,
          status: v.status,
          prazo: v.prazo ?? it.prazo,
          responsavel_id: v.responsavel_id ?? it.responsavel_id,
          prioridade: v.prioridade ?? it.prioridade,
        }
      : it;
  };

  // Pendências = itens ainda abertos na reunião mais recente.
  const pendentes = (ultima ? porReuniao.get(ultima.id) ?? [] : [])
    .filter((it) => it.secao === "ata")
    .map(comEstadoAtual)
    .filter((it) => itemAberto(it.status));
  const atrasados = pendentes.filter(
    (it) => it.prazo && new Date(it.prazo).getTime() < agora
  ).length;

  const nomeResp = (it: ItemAta) =>
    (it.responsavel_id ? perfis.get(it.responsavel_id)?.nome : null) ??
    it.responsaveis_texto ??
    null;

  const grupos = new Map<string, ItemAta[]>();
  for (const it of pendentes) {
    const chave = nomeResp(it) ?? "Sem responsável";
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
    { chave: "relatorios", rotulo: "Relatórios", href: "/atas?aba=relatorios" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Atas"
        descricao="Reuniões de planejamento de marketing: o que foi combinado, quem é o responsável e até quando."
        acoes={
          lideranca ? (
            <form action={criarReuniao} className="flex items-center gap-2">
              <Input
                type="date"
                name="data"
                required
                defaultValue={hojeBR}
                aria-label="Data da reunião"
                className="h-9 w-40"
              />
              <Button type="submit">Nova reunião</Button>
            </form>
          ) : undefined
        }
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
            <span className="text-xs text-muted-foreground">
              Clique em um item para ver o card completo.
            </span>
          </div>

          {ordemGrupos.length === 0 ? (
            <EmptyState
              icone={NotebookPen}
              titulo="Tudo em dia"
              descricao="Nenhum item aberto na última reunião."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ordemGrupos.map(([nome, lista]) => {
                const atrasos = lista.filter(
                  (it) => it.prazo && new Date(it.prazo).getTime() < agora
                ).length;
                const semVinculo = lista.every((it) => !it.responsavel_id);
                return (
                  <Card key={nome} className="flex max-h-[75vh] flex-col overflow-hidden">
                    <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
                      <h2 className="font-semibold">{nome}</h2>
                      <div className="flex items-center gap-1.5">
                        {semVinculo ? (
                          <Badge variant="warning" title="Sem usuário vinculado: não recebe cobrança automática">
                            sem vínculo
                          </Badge>
                        ) : null}
                        {atrasos > 0 ? <Badge variant="danger">{atrasos} atrasado(s)</Badge> : null}
                        <Badge variant="secondary">{lista.length}</Badge>
                      </div>
                    </div>
                    <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
                      {lista
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(a.prazo ?? "2999-01-01").getTime() -
                            new Date(b.prazo ?? "2999-01-01").getTime()
                        )
                        .map((it) => (
                          <ItemCard
                            key={it.id}
                            it={paraCard(it, agora, {
                              situacao: true,
                              vezes: vezesPorSerie.get(it.serie),
                              responsavel: null,
                            })}
                          />
                        ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : aba === "relatorios" ? (
        <Relatorios
          r={calcularRelatorio(reunioes, itens, (it) => nomeResp(it) ?? "Sem responsável", membros)}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Da reunião mais recente (esquerda) para a mais antiga. Role para o lado e
            clique em um item para abrir o card completo.
          </p>
          <div className="flex items-start gap-4 overflow-x-auto pb-4">
            {reunioes
              .slice()
              .reverse()
              .map((r) => {
                const lista = porReuniao.get(r.id) ?? [];
                const ausentes = r.presencas.filter(
                  (p) =>
                    /ausente|ausentar/i.test(p.presenca) &&
                    situacaoNaData(p.nome, r.data, membros) === "ativo"
                );
                const afastados = r.presencas.filter(
                  (p) => situacaoNaData(p.nome, r.data, membros) === "afastado"
                );
                const vigente = r.id === ultima?.id;
                return (
                  <Card
                    key={r.id}
                    className={cn(
                      "flex max-h-[78vh] w-[360px] shrink-0 flex-col overflow-hidden",
                      vigente && "border-primary shadow-md ring-2 ring-primary/40"
                    )}
                  >
                    <div
                      className={cn(
                        "space-y-0.5 border-b px-4 py-2.5",
                        vigente ? "bg-primary text-primary-foreground" : "bg-muted/40"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-semibold">
                          <Link href={`/atas/${r.id}`} className="hover:underline" title="Abrir a ata">
                            {dataBR(r.data + "T12:00:00-03:00")} ↗
                          </Link>
                        </h2>
                        {vigente ? (
                          <Badge variant="warning">Vigente</Badge>
                        ) : (
                          <Badge variant="muted">{lista.length} itens</Badge>
                        )}
                      </div>
                      {ausentes.length > 0 ? (
                        <p className={cn("text-[11px]", vigente ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          Ausentes: {ausentes.map((a) => a.nome.split(" ")[0]).join(", ")}
                        </p>
                      ) : null}
                      {afastados.length > 0 ? (
                        <p className={cn("text-[11px]", vigente ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          Afastada(o): {afastados.map((a) => a.nome.split(" ")[0]).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
                      {lista.map((it) => (
                        <ItemCard
                          key={it.id}
                          it={paraCard(it, agora, {
                            situacao: false,
                            responsavel: nomeResp(it),
                          })}
                        />
                      ))}
                    </CardContent>
                    <Link
                      href={`/atas/${r.id}`}
                      className="flex items-center justify-center gap-1.5 border-t bg-muted/40 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-accent"
                    >
                      Abrir ata completa →
                    </Link>
                  </Card>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
