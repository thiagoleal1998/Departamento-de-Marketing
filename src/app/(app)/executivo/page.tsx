import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  CalendarRange,
  CheckCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  Handshake,
  MessagesSquare,
  Package,
  Search,
} from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { podeAprovarComoDiretoria, temVisaoExecutiva } from "@/features/executivo/acesso";
import { obterResumoExecutivo } from "@/features/executivo/data";
import { AprovacaoCard } from "@/features/executivo/aprovacao-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FUSO = "America/Sao_Paulo";
const dia = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  const sem = new Date(Date.UTC(a, m - 1, d)).toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" });
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")} · ${sem.replace(".", "")}`;
};

function Numero({ valor, rotulo, tom }: { valor: number; rotulo: string; tom?: "alerta" | "ok" }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center shadow-sm">
      <p
        className={cn(
          "text-3xl font-bold leading-none",
          tom === "alerta" && valor > 0 && "text-red-600",
          tom === "ok" && "text-emerald-600"
        )}
      >
        {valor}
      </p>
      <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{rotulo}</p>
    </div>
  );
}

function Secao({ titulo, icone: Icone, extra, children }: { titulo: string; icone: React.ElementType; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Icone className="size-4" /> {titulo} {extra}
      </h2>
      {children}
    </section>
  );
}

const ATALHOS = [
  { href: "/comercial", rotulo: "Comercial", icone: Handshake },
  { href: "/operacional/calendario", rotulo: "Calendário", icone: CalendarRange },
  { href: "/projetos", rotulo: "Projetos", icone: FolderOpen },
  { href: "/documentos", rotulo: "Documentos", icone: FileText },
  { href: "/consulta", rotulo: "LPs e site", icone: Search },
  { href: "/chat", rotulo: "Chat", icone: MessagesSquare },
];

/** Visão geral do marketing pensada para o celular: o que aprovar, o que está atrasado e o que vem aí. */
export default async function ExecutivoPage() {
  const usuario = await exigirUsuario();
  if (!temVisaoExecutiva(usuario)) redirect("/dashboard");
  const podeDecidir = podeAprovarComoDiretoria(usuario);

  const r = await obterResumoExecutivo();
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight">Olá, {usuario.nome.split(" ")[0]}</h1>
        <p className="text-sm capitalize text-muted-foreground">{hoje}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Numero valor={r.paraAprovar.length} rotulo="para aprovar" tom={r.paraAprovar.length > 0 ? "alerta" : "ok"} />
        <Numero valor={r.numeros.atrasadas} rotulo="tarefas atrasadas" tom="alerta" />
        <Numero valor={r.numeros.tarefasAtivas} rotulo="tarefas em aberto" />
        <Numero valor={r.numeros.emAprovacao} rotulo="em aprovação (todas)" />
        <Numero valor={r.numeros.projetosAndamento} rotulo="projetos em andamento" />
        <Numero valor={r.numeros.chamadosAbertos} rotulo="chamados abertos" />
      </div>

      <Secao
        titulo="Para você aprovar"
        icone={CheckCheck}
        extra={r.paraAprovar.length > 0 ? <Badge variant="danger">{r.paraAprovar.length}</Badge> : undefined}
      >
        {r.paraAprovar.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            Nada aguardando a sua aprovação. ✅
          </p>
        ) : (
          <ul className="space-y-3">
            {r.paraAprovar.map((t) => (
              <AprovacaoCard key={t.id} item={t} podeDecidir={podeDecidir} />
            ))}
          </ul>
        )}
      </Secao>

      {r.atrasadas.length > 0 ? (
        <Secao titulo="Atrasadas" icone={AlertTriangle}>
          <ul className="divide-y rounded-xl border bg-card">
            {r.atrasadas.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                <span className="min-w-0">
                  <span className="block font-medium leading-snug">{t.titulo}</span>
                  <span className="text-xs text-muted-foreground">{t.responsavel ?? "Sem responsável"}</span>
                </span>
                <span className="shrink-0 text-xs font-medium text-red-600">{dia(t.prazo)}</span>
              </li>
            ))}
          </ul>
        </Secao>
      ) : null}

      <Secao titulo="Próximos 7 dias" icone={CalendarRange}>
        {r.semana.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            Nada agendado no calendário de conteúdo.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {r.semana.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                <span className="min-w-0">
                  <span className="block font-medium leading-snug">{i.nome}</span>
                  <span className="text-xs text-muted-foreground">
                    {[i.tipo, i.status].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">{dia(i.data)}</span>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      {r.alteracoesComercial.length > 0 ? (
        <Secao titulo="Comercial: mudanças nos últimos 7 dias" icone={Handshake}>
          <ul className="divide-y rounded-xl border bg-card">
            {r.alteracoesComercial.map((a, n) => (
              <li key={n} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="font-medium">{a.nome}</span>
                <span className="text-xs text-muted-foreground">{a.secao}</span>
              </li>
            ))}
          </ul>
          <Link href="/comercial?alterados=1" className="text-sm font-medium text-primary hover:underline">
            Ver os produtos alterados →
          </Link>
        </Secao>
      ) : null}

      {r.projetos.length > 0 ? (
        <Secao titulo="Projetos em andamento" icone={ClipboardList}>
          <ul className="divide-y rounded-xl border bg-card">
            {r.projetos.map((p) => (
              <li key={p.id}>
                <Link href={"/projetos/" + p.id} className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-accent/50">
                  <span className="font-medium">{p.nome}</span>
                  <span className="text-xs text-muted-foreground">{p.responsavel ?? "—"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Secao>
      ) : null}

      {r.estoqueZerado.length > 0 ? (
        <Secao titulo="Estoque zerado" icone={Package}>
          <div className="flex flex-wrap gap-1.5">
            {r.estoqueZerado.map((n) => (
              <Badge key={n} variant="danger">
                {n}
              </Badge>
            ))}
          </div>
        </Secao>
      ) : null}

      <Secao titulo="Consultar" icone={BookOpen}>
        <div className="grid grid-cols-3 gap-2">
          {ATALHOS.map(({ href, rotulo, icone: Icone }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-center text-xs font-medium shadow-sm transition-colors hover:bg-accent/50"
            >
              <Icone className="size-6 text-primary" />
              {rotulo}
            </Link>
          ))}
        </div>
      </Secao>
    </div>
  );
}
