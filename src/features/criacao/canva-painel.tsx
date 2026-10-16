import { conexaoDoUsuario, canvaConfigurado, canvaFetch } from "@/lib/canva";
import { BotaoDesconectar } from "./canva-cliente";
import { BriefingCanva } from "./canva-briefing";
import { AgenteCanva } from "./canva-agente-chat";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatarData } from "@/lib/utils";

const AVISOS: Record<string, string> = {
  conectado: "Canva conectado com sucesso.",
  negado: "A autorização no Canva foi cancelada.",
  invalido: "Não foi possível validar a conexão. Tente de novo.",
  erro: "O Canva recusou a conexão. Tente de novo.",
  nao_configurado: "Canva ainda não configurado no servidor.",
};

interface DesignCanva {
  id: string;
  title?: string;
  updated_at: number;
  urls: { edit_url: string };
}

export async function CanvaPainel({
  userId,
  aviso,
}: {
  userId: string;
  aviso?: string;
}) {
  if (!canvaConfigurado()) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          As chaves do Canva ainda não foram configuradas.
        </CardContent>
      </Card>
    );
  }

  const conexao = await conexaoDoUsuario(userId);
  const msg = aviso ? AVISOS[aviso] : null;

  if (!conexao) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
          <div>
            <p className="font-medium">Conecte sua conta do Canva</p>
            <p className="text-sm text-muted-foreground">
              Cada pessoa conecta a própria conta. Depois, é possível criar
              designs e ver os mais recentes direto daqui.
            </p>
          </div>
          <Button asChild>
            <a href="/api/canva/conectar">Conectar ao Canva</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const lista = await canvaFetch<{ items: DesignCanva[] }>(
    userId,
    "/designs?limit=12&sort_by=modified_descending"
  );
  const designs = lista.dados?.items ?? [];

  return (
    <div className="space-y-6">
      {msg ? <p className="text-sm text-emerald-600">{msg}</p> : null}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Conectado{conexao.canva_nome ? ` como ${conexao.canva_nome}` : ""}.
            </p>
            <BotaoDesconectar />
          </div>
          <AgenteCanva />
          <div className="border-t pt-4">
            <h3 className="mb-3 font-semibold">Ou preencha o briefing</h3>
            <BriefingCanva />
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Designs recentes</h2>
        {lista.erro ? (
          <p className="text-sm text-destructive">{lista.erro}</p>
        ) : designs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum design ainda.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {designs.map((d) => (
              <li key={d.id}>
                <a
                  href={d.urls.edit_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border p-3 text-sm transition-colors hover:bg-accent/40"
                >
                  <span className="block truncate font-medium">
                    {d.title || "Sem título"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Editado em{" "}
                    {formatarData(new Date(d.updated_at * 1000).toISOString())}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
