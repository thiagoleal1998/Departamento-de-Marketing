import { CheckCircle2, ExternalLink, ShieldAlert } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ofertasDoPeriodo } from "@/features/divulgacao/data";
import { hojeSP } from "@/features/divulgacao/tipos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORIA_META } from "./classificar";
import type { LpLocal } from "./destinos";
import { destinosDeHoje } from "./lugares";
import { alertasDosDestinos } from "./buscar";

function haQuanto(iso: string): string {
  const min = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

/** Notícias de risco (clima, natureza, segurança…) sobre os destinos das ofertas de hoje. */
export async function AlertasDestinos() {
  const hoje = hojeSP();
  const { itens, indisponivel } = await ofertasDoPeriodo(hoje, hoje);
  if (indisponivel || itens.length === 0) return null;

  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("landing_pages").select("nome, cidade, estado, pais").limit(1000);
  // A IA lê cada oferta e diz o lugar real (ex.: circuito Portugal e Madri → Porto, Lisboa, Madri).
  const destinos = await destinosDeHoje(itens, (data as LpLocal[] | null) ?? []);
  if (destinos.length === 0) return null;

  const resultados = await alertasDosDestinos(destinos);
  const comAlerta = resultados.filter((r) => r.noticias.length > 0);
  const semAlerta = resultados.filter((r) => r.noticias.length === 0);

  return (
    <Card className={comAlerta.length > 0 ? "border-red-300" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {comAlerta.length > 0 ? <ShieldAlert className="size-5 text-red-600" /> : <CheckCircle2 className="size-5 text-emerald-600" />}
          Alertas dos destinos de hoje
        </CardTitle>
        <CardDescription>
          {comAlerta.length > 0
            ? "Notícias das últimas 72 horas sobre clima, natureza e segurança nos destinos das ofertas de hoje."
            : "Nenhuma notícia de risco nas últimas 72 horas nos destinos das ofertas de hoje."}
        </CardDescription>
      </CardHeader>
      <CardContent className="max-h-[300px] space-y-4 overflow-y-auto">
        {comAlerta.map(({ destino, noticias, buscaUrl }) => (
          <div key={destino.termo} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                {destino.nome}
                <span className="ml-2 text-xs font-normal text-muted-foreground">{destino.tipo === "nacional" ? "Nacional" : "Internacional"}</span>
              </h3>
              <a href={buscaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Ver mais <ExternalLink className="size-3" />
              </a>
            </div>
            <ul className="space-y-2">
              {noticias.map((n) => (
                <li key={n.link || n.titulo} className="rounded-lg border p-3">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    {n.categorias.map((c) => (
                      <span key={c} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORIA_META[c].classe}`}>
                        {CATEGORIA_META[c].rotulo}
                      </span>
                    ))}
                    <span className="text-xs text-muted-foreground">
                      {n.fonte ? `${n.fonte} · ` : ""}
                      {haQuanto(n.quando)}
                    </span>
                  </div>
                  <a href={n.link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium leading-snug hover:underline">
                    {n.titulo}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {semAlerta.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Sem alertas: {semAlerta.map((r) => r.destino.nome).join(" · ")}
          </p>
        ) : null}
        <p className="text-[11px] text-muted-foreground">
          Manchetes do Google Notícias (G1, CNN Brasil, O Globo e outras), filtradas por palavras de risco. Use como aviso e confirme na matéria.
        </p>
      </CardContent>
    </Card>
  );
}
