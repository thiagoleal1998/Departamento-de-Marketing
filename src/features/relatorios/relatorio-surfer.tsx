import { ExternalLink, Plug } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { listarEditoresSurfer, surferConfigurado, workspaceSurfer } from "@/lib/surfer";

const numero = (valor: number | null | undefined) =>
  typeof valor === "number" ? valor.toLocaleString("pt-BR") : "—";

export async function RelatorioSurfer() {
  if (!surferConfigurado()) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Plug className="size-5 text-primary" /> Surfer SEO</h2>
          <p className="text-sm text-muted-foreground">Para consultar os scores de SEO, configure <code>SURFER_API_KEY</code> nas variáveis de ambiente do servidor. O workspace padrão já está definido como <code>1209274</code>.</p>
          <p className="text-sm text-muted-foreground">A chave da API é fornecida pelo suporte do Surfer ao titular de uma conta com acesso à API. A conexão deste chat com o Surfer não fornece uma chave ao painel.</p>
        </CardContent>
      </Card>
    );
  }

  let dados: Awaited<ReturnType<typeof listarEditoresSurfer>>;
  try {
    dados = await listarEditoresSurfer();
  } catch (erro) {
    return <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{erro instanceof Error ? erro.message : "Não foi possível consultar o Surfer."}</p>;
  }

  const concluidos = dados.editores.filter((e) => e.state === "completed");
  const comSeo = concluidos.filter((e) => typeof e.content_score?.seo === "number");
  const media = comSeo.length ? Math.round(comSeo.reduce((s, e) => s + e.content_score.seo!, 0) / comSeo.length) : null;
  const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(dados.consultadoEm));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>Workspace {workspaceSurfer()} · consultado em {data}</p>
        <a className="text-primary hover:underline" href="/relatorios?aba=surfer">Atualizar dados</a>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { rotulo: "Content Editors", valor: numero(dados.total) },
          { rotulo: "Concluídos", valor: numero(concluidos.length) },
          { rotulo: "Score SEO médio", valor: numero(media) },
        ].map((item) => (
          <Card key={item.rotulo}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{item.rotulo}</p><p className="text-2xl font-bold tabular-nums">{item.valor}</p></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <div className="px-4 pt-4"><h2 className="font-semibold">Conteúdos analisados</h2><p className="text-xs text-muted-foreground">Scores informados pelo Surfer para cada Content Editor.</p></div>
          {dados.editores.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Ainda não há Content Editors neste workspace.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-4 py-2 font-medium">Palavra-chave</th><th className="px-4 py-2 font-medium">Local</th><th className="px-4 py-2 font-medium">Estado</th><th className="px-4 py-2 text-right font-medium">SEO</th><th className="px-4 py-2 text-right font-medium">Busca com IA</th><th className="px-4 py-2 text-right font-medium">Total</th><th className="px-4 py-2 font-medium">Criado em</th></tr></thead>
              <tbody className="divide-y">
                {dados.editores.map((editor) => (
                  <tr key={editor.id}>
                    <td className="px-4 py-2 font-medium"><a className="inline-flex items-center gap-1 text-primary hover:underline" href={`https://app.surferseo.com/drafts/${editor.id}`} target="_blank" rel="noopener noreferrer">{editor.main_keyword}<ExternalLink className="size-3" /></a></td>
                    <td className="px-4 py-2">{editor.location}</td>
                    <td className="px-4 py-2">{editor.state === "completed" ? "Concluído" : editor.state === "failed" ? "Falhou" : "Em preparação"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{numero(editor.content_score?.seo)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{numero(editor.content_score?.ai_search)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{numero(editor.content_score?.total)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(editor.inserted_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      {dados.total > dados.editores.length ? <p className="text-xs text-muted-foreground">Exibindo {dados.editores.length} de {dados.total} conteúdos.</p> : null}
    </div>
  );
}
