import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  FATOR_META,
  nivelSubtraco,
  type FatorDisc,
  type PerfilComportamental,
} from "@/features/perfis/tipos";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn, formatarData } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FATORES: FatorDisc[] = ["D", "I", "S", "C"];

function Barra({
  rotulo,
  pct,
  classe,
  direita,
}: {
  rotulo: string;
  pct: number;
  classe: string;
  direita: React.ReactNode;
}) {
  const largura = Math.max(0, Math.min(100, pct));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{rotulo}</span>
        <span className="text-xs text-muted-foreground">{direita}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full", classe)} style={{ width: `${largura}%` }} />
      </div>
    </div>
  );
}

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (!itens?.length) return null;
  return (
    <div>
      <h4 className="mb-1.5 text-sm font-semibold">{titulo}</h4>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {itens.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

export default async function PerfilDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await exigirUsuario();
  if (!ehLideranca(usuario.role)) redirect("/dashboard");

  const supabase = await criarClienteServidor();
  // A RLS retorna vazio quando o líder tenta abrir o perfil do gerente.
  const { data } = await supabase
    .from("perfis_comportamentais")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const p = data as PerfilComportamental | null;
  if (!p) notFound();

  let foto: string | null = null;
  if (p.profile_id) {
    const { data: u } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", p.profile_id)
      .maybeSingle();
    foto = (u as { avatar_url: string | null } | null)?.avatar_url ?? null;
  }

  const d = p.dados;
  const primario = FATOR_META[p.perfil_primario];
  const secundario = p.perfil_secundario
    ? FATOR_META[p.perfil_secundario]
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar nome={p.nome} src={foto} className="size-20 text-xl" />
        <div className="min-w-0 flex-1">
      <PageHeader
        titulo={p.nome}
        descricao={`${p.pesquisa ?? "Perfil comportamental"}${
          p.concluido_em ? ` · concluído em ${formatarData(p.concluido_em)}` : ""
        }`}
        acoes={
          <Button asChild variant="outline">
            <Link href="/gestao/perfis">
              <ArrowLeft className="size-4" /> Voltar
            </Link>
          </Button>
        }
      />
        </div>
      </div>

      {/* Perfil e pontuações */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perfil DISC</CardTitle>
            <CardDescription>
              Dominante e secundário, segundo o relatório DISC RH.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Badge className={cn("text-white", primario.cor)}>
                Dominante: {p.perfil_primario} · {primario.nome}
              </Badge>
              <p className="mt-2 text-sm text-muted-foreground">
                {primario.descricao}
              </p>
            </div>
            {secundario && p.perfil_secundario ? (
              <div>
                <Badge className={cn("text-white", secundario.cor)}>
                  Secundário: {p.perfil_secundario} · {secundario.nome}
                </Badge>
                <p className="mt-2 text-sm text-muted-foreground">
                  {secundario.descricao}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pontuações</CardTitle>
            <CardDescription>Escala de -24 a +24.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {FATORES.map((f) => {
              const v = d.pontuacoes?.[f] ?? 0;
              return (
                <Barra
                  key={f}
                  rotulo={`${f} · ${FATOR_META[f].nome}`}
                  pct={((v + 24) / 48) * 100}
                  classe={FATOR_META[f].cor}
                  direita={`${v}/24`}
                />
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Competências */}
      <Card>
        <CardHeader>
          <CardTitle>Competências</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          {d.competencias?.map((c) => (
            <div key={c.nome} className="space-y-1.5">
              <Barra
                rotulo={c.nome}
                pct={c.pct}
                classe={
                  c.pct >= 70
                    ? "bg-emerald-600"
                    : c.pct >= 50
                      ? "bg-blue-600"
                      : "bg-amber-500"
                }
                direita={`${c.pct}%`}
              />
              <p className="text-xs text-muted-foreground">{c.texto}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Subtraços e compatibilidade */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subtraços comportamentais</CardTitle>
            <CardDescription>
              Natural 76–100% · Potencial 51–75% · Adaptado 26–50% · Limitado
              0–25%
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.subtracos?.map((s) => {
              const n = nivelSubtraco(s.valor);
              return (
                <Barra
                  key={s.nome}
                  rotulo={s.nome}
                  pct={s.valor}
                  classe="bg-primary"
                  direita={
                    <span className={n.classe}>
                      {s.valor}% · {n.rotulo}
                    </span>
                  }
                />
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compatibilidade com perfis padrão</CardTitle>
            <CardDescription>
              Alinhamento natural com os 12 perfis comportamentais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.compatibilidade?.map((c) => (
              <Barra
                key={c.nome}
                rotulo={c.nome}
                pct={c.pct}
                classe={
                  c.pct >= 75
                    ? "bg-emerald-600"
                    : c.pct >= 50
                      ? "bg-amber-500"
                      : "bg-red-500"
                }
                direita={`${c.pct}%`}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Insights comportamentais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          {d.insights?.map((i) => (
            <div key={i.titulo}>
              <h4 className="text-sm font-semibold">{i.titulo}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{i.texto}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Motivadores e desenvolvimento */}
      <Card>
        <CardHeader>
          <CardTitle>Motivadores e desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <Lista titulo="O que motiva este perfil" itens={d.motivadores} />
          <Lista
            titulo="Áreas de desenvolvimento recomendadas"
            itens={d.desenvolvimento}
          />
          <Lista titulo="Pontos fortes" itens={d.pontos_fortes} />
          <Lista titulo="Desafios" itens={d.desafios} />
          <Lista titulo="Recomendações" itens={d.recomendacoes} />
        </CardContent>
      </Card>
    </div>
  );
}
