import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROTULO_DIVERGENCIA, type LpSistema } from "./conferencia";
import type { ProdutoView } from "./cards";

function Indicador({ rotulo, valor, tom }: { rotulo: string; valor: number; tom?: "ok" | "alerta" }) {
  return (
    <Card>
      <CardContent className="space-y-0.5 p-4">
        <p className="text-xs text-muted-foreground">{rotulo}</p>
        <p
          className={
            "text-2xl font-semibold " +
            (tom === "alerta" && valor > 0 ? "text-red-600" : tom === "ok" ? "text-emerald-600" : "")
          }
        >
          {valor}
        </p>
      </CardContent>
    </Card>
  );
}

function Tabela({
  titulo,
  descricao,
  vazio,
  cabecalho,
  linhas,
}: {
  titulo: string;
  descricao: string;
  vazio: string;
  cabecalho: string[];
  linhas: React.ReactNode[][];
}) {
  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-lg font-semibold">
          {titulo} <span className="text-sm font-normal text-muted-foreground">({linhas.length})</span>
        </h2>
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </div>
      {linhas.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  {cabecalho.map((c) => (
                    <th key={c} className="px-4 py-2 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {linhas.map((l, i) => (
                  <tr key={i}>
                    {l.map((c, j) => (
                      <td key={j} className="px-4 py-2 align-top">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

const linkProduto = (p: ProdutoView) => (
  <Link href={`/comercial?aba=${encodeURIComponent(p.secao)}`} className="font-medium hover:underline">
    {p.nome}
  </Link>
);

const lpsDe = (p: ProdutoView) =>
  p.conferencia.lps.length === 0 ? (
    "—"
  ) : (
    <div className="flex flex-wrap gap-1.5">
      {p.conferencia.lps.map((l) => (
        <Badge key={l.id} variant={l.status === "ativo" ? "success" : "muted"}>
          {l.nome} · {l.status ?? "sem status"}
        </Badge>
      ))}
    </div>
  );

/** Comparativo entre o Comercial (planilha) e as landing pages cadastradas no sistema. */
export function ConferenciaPainel({
  produtos,
  lpsAtivasSemProduto,
  totalLpsAtivas,
}: {
  produtos: ProdutoView[];
  lpsAtivasSemProduto: LpSistema[];
  totalLpsAtivas: number;
}) {
  const nasAtivas = produtos.filter((p) => !/inativ/i.test(p.secao));
  const comLpAtiva = produtos.filter((p) => p.conferencia.situacao === "ativa");
  const d1 = produtos.filter((p) => p.conferencia.divergencia === "planilha_ativa_lp_inativa");
  const d2 = produtos.filter((p) => p.conferencia.divergencia === "planilha_inativa_lp_ativa");
  const d3 = produtos.filter((p) => p.conferencia.divergencia === "sem_lp");

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        O Comercial só considera um produto realmente ativo quando a landing page correspondente está com status de
        patrocínio <strong>Ativo</strong> em Operacional &gt; Landing Pages. A correspondência é feita pelo link da LP
        e, na falta dele, pelo nome.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Indicador rotulo="Produtos nas abas ativas" valor={nasAtivas.length} />
        <Indicador rotulo="Realmente ativos (LP ativa)" valor={comLpAtiva.length} tom="ok" />
        <Indicador rotulo="Divergências" valor={d1.length + d2.length} tom="alerta" />
        <Indicador rotulo="Sem LP no sistema" valor={d3.length} tom="alerta" />
        <Indicador rotulo={`LPs ativas fora do Comercial (de ${totalLpsAtivas})`} valor={lpsAtivasSemProduto.length} tom="alerta" />
      </div>

      <Tabela
        titulo="Planilha diz ativo, mas a LP está inativa"
        descricao="Estão nas abas ativas do Comercial, porém a LP não está com patrocínio ativo. Ou a LP precisa ser reativada, ou o produto deve sair das abas ativas."
        vazio="Nenhuma divergência deste tipo."
        cabecalho={["Produto", "Aba da planilha", "LPs encontradas no sistema"]}
        linhas={d1.map((p) => [linkProduto(p), p.secao, lpsDe(p)])}
      />

      <Tabela
        titulo="Planilha diz inativo, mas a LP está ativa"
        descricao="Estão nas abas inativas do Comercial, mas a LP está com patrocínio ativo."
        vazio="Nenhuma divergência deste tipo."
        cabecalho={["Produto", "Aba da planilha", "LPs encontradas no sistema"]}
        linhas={d2.map((p) => [linkProduto(p), p.secao, lpsDe(p)])}
      />

      <Tabela
        titulo="Ativos na planilha sem LP no sistema"
        descricao={`${ROTULO_DIVERGENCIA.sem_lp}. Cadastre a LP em Landing Pages ou ajuste o nome/link na planilha.`}
        vazio="Todos os produtos ativos têm LP cadastrada."
        cabecalho={["Produto", "Aba da planilha"]}
        linhas={d3.map((p) => [linkProduto(p), p.secao])}
      />

      <Tabela
        titulo="LPs ativas que não aparecem no Comercial"
        descricao="Landing pages com patrocínio ativo sem produto correspondente na planilha de condições."
        vazio="Toda LP ativa tem produto no Comercial."
        cabecalho={["Landing page", "Grupo", "Link"]}
        linhas={lpsAtivasSemProduto.map((l) => [
          <Link key={l.id} href="/operacional/landing-pages" className="font-medium hover:underline">
            {l.nome}
          </Link>,
          l.grupo ?? "—",
          l.url ? (
            <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              {l.url.replace(/^https?:\/\//, "").slice(0, 50)}
            </a>
          ) : (
            "—"
          ),
        ])}
      />
    </div>
  );
}
