import { ExternalLink } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ofertasDoPeriodo } from "@/features/divulgacao/data";
import { diaSemana, dataCurta, hojeSP, somarDias } from "@/features/divulgacao/tipos";
import { CATEGORIA_META } from "./classificar";
import type { DestinoMonitorado, LpLocal } from "./destinos";
import { destinosDoDia } from "./lugares";
import { alertasDosDestinos, type AlertaDestino, type Noticia } from "./buscar";
import { CarrosselAlertas } from "./carrossel-alertas";

function haQuanto(iso: string): string {
  const min = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

function Manchete({ n }: { n: Noticia }) {
  return (
    <li className="rounded-lg border p-3">
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
  );
}

const Rodape = () => (
  <p className="text-[11px] text-muted-foreground">
    Manchetes do Google Notícias (G1, CNN Brasil, O Globo e UOL), filtradas por palavras de risco e por interesse a turistas. Use como aviso e confirme na matéria.
  </p>
);

/** Slide "hoje": cada destino com alerta e suas manchetes; os demais numa linha só. */
function SlideHoje({ resultados }: { resultados: AlertaDestino[] }) {
  const comAlerta = resultados.filter((r) => r.noticias.length > 0);
  const semAlerta = resultados.filter((r) => r.noticias.length === 0);
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {comAlerta.length > 0
          ? "Notícias das últimas 72 horas sobre clima, natureza e segurança nos destinos das ofertas de hoje."
          : "Nenhuma notícia de risco nas últimas 72 horas nos destinos das ofertas de hoje."}
      </p>
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
              <Manchete key={n.link || n.titulo} n={n} />
            ))}
          </ul>
        </div>
      ))}
      {semAlerta.length > 0 ? <p className="text-xs text-muted-foreground">Sem alertas: {semAlerta.map((r) => r.destino.nome).join(" · ")}</p> : null}
      <Rodape />
    </>
  );
}

interface DiaSemana {
  data: string;
  destinos: DestinoMonitorado[];
}

/** Slide "semana": um bloco por dia (Segunda, Terça…) com os destinos das ofertas e o que apareceu de risco. */
function SlideSemana({ dias, porTermo, hoje, pendente }: { dias: DiaSemana[]; porTermo: Map<string, AlertaDestino>; hoje: string; pendente: boolean }) {
  const comOfertas = dias.filter((d) => d.destinos.length > 0);
  return (
    <>
      <p className="text-sm text-muted-foreground">Destinos das ofertas de hoje até daqui a 6 dias e o que apareceu de risco nas últimas 72 horas.</p>
      {pendente ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          A IA que identifica os lugares estava ocupada e algumas ofertas ainda não foram lidas. Atualize a página em instantes para completar.
        </p>
      ) : null}
      {comOfertas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum destino identificado nas ofertas dos próximos dias.</p> : null}
      {comOfertas.map((d) => {
        const lista = d.destinos.map((x) => porTermo.get(x.termo.toLowerCase())).filter((x): x is AlertaDestino => !!x);
        const comAlerta = lista.filter((r) => r.noticias.length > 0);
        const semAlerta = d.destinos.filter((x) => !porTermo.get(x.termo.toLowerCase())?.noticias.length);
        return (
          <div key={d.data} className="space-y-1.5 border-t pt-3 first:border-t-0 first:pt-0">
            <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <span className="capitalize">{diaSemana(d.data)}</span>
              <span className="font-normal text-muted-foreground">{dataCurta(d.data)}</span>
              {d.data === hoje ? <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Hoje</span> : null}
              {comAlerta.length > 0 ? <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">{comAlerta.length} alerta(s)</span> : null}
            </h3>
            {comAlerta.map(({ destino, noticias }) => (
              <div key={destino.termo} className="space-y-1.5">
                <p className="text-sm font-medium">{destino.nome}</p>
                <ul className="space-y-2">
                  {noticias.slice(0, 2).map((n) => (
                    <Manchete key={n.link || n.titulo} n={n} />
                  ))}
                </ul>
              </div>
            ))}
            {semAlerta.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {comAlerta.length > 0 ? "Sem alertas: " : "Sem alertas — "}
                {semAlerta.map((x) => x.nome).join(" · ")}
              </p>
            ) : null}
          </div>
        );
      })}
      <Rodape />
    </>
  );
}

/** Notícias de risco sobre os destinos das ofertas: slide de hoje e slide da semana. */
export async function AlertasDestinos() {
  const hoje = hojeSP();
  // O slide da semana olha para frente: de hoje até daqui a 6 dias (não mostra dias que já passaram).
  const inicio = hoje;
  const { itens, indisponivel } = await ofertasDoPeriodo(inicio, somarDias(inicio, 6));
  if (indisponivel || itens.length === 0) return null;

  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("landing_pages").select("nome, cidade, estado, pais").limit(1000);
  const lps = (data as LpLocal[] | null) ?? [];

  // Destinos de cada dia: a IA lê as ofertas do dia e diz o lugar real (mesma regra para hoje e para a semana toda).
  // Uma chamada por dia, guardada por 7 dias; começa por hoje, para o slide principal ficar pronto primeiro.
  const prazoFinal = Date.now() + 40_000;
  const ordem = Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
  const porData = new Map<string, DiaSemana>();
  let pendente = false;
  for (const dia of ordem) {
    const doDia = itens.filter((o) => o.data === dia);
    if (doDia.length === 0) {
      porData.set(dia, { data: dia, destinos: [] });
      continue;
    }
    const r = await destinosDoDia(doDia, lps, prazoFinal);
    pendente = pendente || r.pendente;
    porData.set(dia, { data: dia, destinos: r.destinos });
  }
  const dias: DiaSemana[] = Array.from({ length: 7 }, (_, i) => porData.get(somarDias(inicio, i))!);

  // Cada lugar é pesquisado uma vez só, mesmo que apareça em vários dias.
  const unicos = new Map<string, DestinoMonitorado>();
  for (const d of dias) for (const x of d.destinos) if (!unicos.has(x.termo.toLowerCase())) unicos.set(x.termo.toLowerCase(), x);
  const resultados = await alertasDosDestinos(Array.from(unicos.values()), 24);
  if (resultados.length === 0) return null;
  const porTermo = new Map(resultados.map((r) => [r.destino.termo.toLowerCase(), r]));

  const hojeDia = dias.find((d) => d.data === hoje);
  const resultadosHoje = (hojeDia?.destinos ?? []).map((x) => porTermo.get(x.termo.toLowerCase())).filter((x): x is AlertaDestino => !!x);
  const alertasHoje = resultadosHoje.filter((r) => r.noticias.length > 0).length;
  const alertasSemana = resultados.filter((r) => r.noticias.length > 0).length;

  return (
    <CarrosselAlertas
      alertasHoje={alertasHoje}
      alertasSemana={alertasSemana}
      hoje={<SlideHoje resultados={resultadosHoje} />}
      semana={<SlideSemana dias={dias} porTermo={porTermo} hoje={hoje} pendente={pendente} />}
    />
  );
}
