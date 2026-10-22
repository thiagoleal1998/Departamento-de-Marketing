"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useDialogo } from "@/components/shared/dialogo-provider";
import { excluirOferta, salvarOferta } from "./actions";
import { blocosNacional, dataBr, dataCurta, diaSemana, moeda, type DadosOferta, type Oferta, type TipoOferta } from "./tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface Dia {
  data: string;
  hoje?: boolean;
  itens: Oferta[];
}

/** Texto longo: mostra as primeiras linhas e deixa abrir o resto. */
function TextoLongo({ texto, linhas = 4 }: { texto: string; linhas?: number }) {
  const [aberto, setAberto] = useState(false);
  const longo = texto.split("\n").length > linhas || texto.length > 260;
  return (
    <div>
      <p className={cn("whitespace-pre-line text-sm", !aberto && longo ? "line-clamp-4" : "")}>{texto}</p>
      {longo ? (
        <button type="button" onClick={() => setAberto((v) => !v)} className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          {aberto ? (
            <>
              <ChevronUp className="size-3.5" /> Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5" /> Ver tudo
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</span>;
}

function OfertaCard({ o, podeExcluir, aoEditar }: { o: Oferta; podeExcluir: boolean; aoEditar: (o: Oferta) => void }) {
  const { confirmar, avisar } = useDialogo();
  const [pendente, start] = useTransition();

  async function excluir() {
    const ok = await confirmar({
      titulo: "Excluir esta oferta?",
      descricao: `${dataBr(o.data)} — ${(o.produto ?? o.canal ?? "oferta").split("\n")[0]}`,
      confirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    start(async () => {
      const r = await excluirOferta(o.id);
      if (r.erro) void avisar(r.erro, "Não foi possível excluir");
    });
  }

  const blocos = o.tipo === "nacional" ? blocosNacional(o) : [];
  const dif = o.conc_diferenca;

  return (
    <article className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", o.tipo === "nacional" ? "bg-emerald-100 text-emerald-900" : "bg-sky-100 text-sky-900")}>
            {o.tipo === "nacional" ? "Nacional" : "Internacional"}
          </span>
          {o.canal ? <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">{o.canal}</span> : null}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="size-8" aria-label="Editar oferta" onClick={() => aoEditar(o)}>
            <Pencil className="size-4" />
          </Button>
          {podeExcluir ? (
            <Button variant="ghost" size="icon" className="size-8" aria-label="Excluir oferta" onClick={() => void excluir()} disabled={pendente}>
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {o.tipo === "nacional" ? (
        <div className="space-y-3">
          {blocos.map((b, i) => (
            <div key={i} className={cn("space-y-1", i > 0 && "border-t pt-3")}>
              {b.produto ? <h3 className="text-base font-semibold leading-snug">{b.produto}</h3> : null}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                {b.temporada ? <span>🗓 {b.temporada}</span> : null}
                {b.periodo ? <span>🧳 {b.periodo}</span> : null}
                {b.aereo ? <span>✈ {b.aereo}</span> : null}
              </div>
              {b.vantagem ? <TextoLongo texto={b.vantagem} /> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {o.produto ? <TextoLongo texto={o.produto} linhas={2} /> : null}
          {o.vantagem ? <TextoLongo texto={o.vantagem} /> : null}
          {o.periodo_viagem ? <p className="text-xs text-muted-foreground">🧳 {o.periodo_viagem}</p> : null}
        </div>
      )}

      {o.oferta_dia ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <Rotulo>Oferta do dia</Rotulo>
          <br />
          <span className="whitespace-pre-line">{o.oferta_dia}</span>
        </p>
      ) : null}

      {o.conc_lv !== null || o.conc_concorrente !== null ? (
        <dl className="grid grid-cols-3 gap-2 rounded-md bg-muted/50 px-3 py-2 text-center text-sm">
          <div>
            <dt className="text-[11px] text-muted-foreground">Litoral Verde</dt>
            <dd className="font-semibold tabular-nums">{moeda(o.conc_lv) ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Booking/Decolar</dt>
            <dd className="font-semibold tabular-nums">{moeda(o.conc_concorrente) ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Diferença</dt>
            <dd className={cn("font-semibold tabular-nums", dif === null ? "" : dif > 0 ? "text-emerald-700" : dif < 0 ? "text-red-700" : "")}>{moeda(dif) ?? "—"}</dd>
          </div>
        </dl>
      ) : null}

      {o.observacao ? <p className="whitespace-pre-line text-xs italic text-muted-foreground">{o.observacao}</p> : null}
    </article>
  );
}

const vazio = (data: string, tipo: TipoOferta = "nacional"): DadosOferta => ({
  data,
  tipo,
  canal: "",
  produto: "",
  temporada: "",
  vantagem: "",
  aereo: "",
  periodo_viagem: "",
  oferta_dia: "",
  conc_lv: "",
  conc_concorrente: "",
  conc_diferenca: "",
  observacao: "",
});

const paraTexto = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));

function OfertaForm({ oferta, dataPadrao, aoFechar }: { oferta?: Oferta; dataPadrao: string; aoFechar: () => void }) {
  const [d, setD] = useState<DadosOferta>(
    oferta
      ? {
          data: oferta.data,
          tipo: oferta.tipo,
          canal: oferta.canal ?? "",
          produto: oferta.produto ?? "",
          temporada: oferta.temporada ?? "",
          vantagem: oferta.vantagem ?? "",
          aereo: oferta.aereo ?? "",
          periodo_viagem: oferta.periodo_viagem ?? "",
          oferta_dia: oferta.oferta_dia ?? "",
          conc_lv: paraTexto(oferta.conc_lv),
          conc_concorrente: paraTexto(oferta.conc_concorrente),
          conc_diferenca: paraTexto(oferta.conc_diferenca),
          observacao: oferta.observacao ?? "",
        }
      : vazio(dataPadrao)
  );
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();
  const set = <K extends keyof DadosOferta>(k: K, v: DadosOferta[K]) => setD((p) => ({ ...p, [k]: v }));
  const nacional = d.tipo === "nacional";

  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", aoTecla);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTecla);
      document.body.style.overflow = anterior;
    };
  }, [aoFechar]);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    start(async () => {
      const r = await salvarOferta(oferta?.id ?? null, d);
      if (r.erro) setErro(r.erro);
      else aoFechar();
    });
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <form onSubmit={salvar} role="dialog" aria-modal="true" aria-label="Oferta" className="w-full max-w-2xl space-y-4 rounded-xl border bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{oferta ? "Editar oferta" : "Nova oferta"}</h2>
          <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={aoFechar}>
            <X className="size-5" />
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="of-data">Data da divulgação *</Label>
            <Input id="of-data" type="date" value={d.data} onChange={(e) => set("data", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="of-tipo">Tipo *</Label>
            <Select id="of-tipo" value={d.tipo} onChange={(e) => set("tipo", e.target.value as TipoOferta)}>
              <option value="nacional">Nacional</option>
              <option value="internacional">Internacional</option>
            </Select>
          </div>
          {!nacional ? (
            <div className="space-y-1.5">
              <Label htmlFor="of-canal">Tipo de divulgação</Label>
              <Input id="of-canal" value={d.canal} onChange={(e) => set("canal", e.target.value)} placeholder="Ex.: Lâmina, E-mail técnico" />
            </div>
          ) : null}

          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="of-prod">{nacional ? "Produtos (separe vários com ---)" : "Destinos"}</Label>
            <Textarea id="of-prod" value={d.produto} onChange={(e) => set("produto", e.target.value)} rows={2} />
          </div>
          {nacional ? (
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="of-temp">Temporada</Label>
              <Textarea id="of-temp" value={d.temporada} onChange={(e) => set("temporada", e.target.value)} rows={2} />
            </div>
          ) : null}
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="of-vant">{nacional ? "Vantagem" : "Descritivo"}</Label>
            <Textarea id="of-vant" value={d.vantagem} onChange={(e) => set("vantagem", e.target.value)} rows={5} />
          </div>
          {nacional ? (
            <>
              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="of-aereo">Aéreo</Label>
                <Input id="of-aereo" value={d.aereo} onChange={(e) => set("aereo", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="of-viagem">Data / período da viagem</Label>
                <Textarea id="of-viagem" value={d.periodo_viagem} onChange={(e) => set("periodo_viagem", e.target.value)} rows={2} />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="of-lv">Litoral Verde (R$)</Label>
                <Input id="of-lv" inputMode="decimal" value={d.conc_lv} onChange={(e) => set("conc_lv", e.target.value)} placeholder="2.478,83" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="of-conc">Booking/Decolar (R$)</Label>
                <Input id="of-conc" inputMode="decimal" value={d.conc_concorrente} onChange={(e) => set("conc_concorrente", e.target.value)} placeholder="2.643,00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="of-dif">Diferença (R$)</Label>
                <Input id="of-dif" inputMode="decimal" value={d.conc_diferenca} onChange={(e) => set("conc_diferenca", e.target.value)} placeholder="calcula sozinha" />
              </div>
            </>
          )}
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="of-oferta">Oferta do dia</Label>
            <Input id="of-oferta" value={d.oferta_dia} onChange={(e) => set("oferta_dia", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="of-obs">Observação</Label>
            <Textarea id="of-obs" value={d.observacao} onChange={(e) => set("observacao", e.target.value)} rows={2} />
          </div>
        </div>

        {erro ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2 className="size-4 animate-spin" /> : null} Salvar
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Botão "Nova oferta" (abre o formulário). */
export function NovaOferta({ dataPadrao }: { dataPadrao: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus className="size-4" /> Nova oferta
      </Button>
      {aberto ? <OfertaForm dataPadrao={dataPadrao} aoFechar={() => setAberto(false)} /> : null}
    </>
  );
}

/** Ofertas agrupadas por dia. */
export function OfertasLista({
  dias,
  podeExcluir,
  vazio,
  lado = false,
}: {
  dias: Dia[];
  podeExcluir: boolean;
  vazio?: string;
  /** Dias lado a lado (Segunda 19/10 | Terça 20/10 | …), como no quadro da semana. */
  lado?: boolean;
}) {
  const [editando, setEditando] = useState<Oferta | null>(null);

  if (dias.length === 0) {
    return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{vazio ?? "Nenhuma oferta encontrada."}</p>;
  }

  return (
    <div className={lado ? "flex items-start gap-4 overflow-x-auto pb-3" : "space-y-6"}>
      {dias.map((dia) => (
        <section key={dia.data} className={cn("space-y-3", lado && "w-[320px] shrink-0 rounded-xl bg-muted/30 p-3")}>
          <h2 className={cn("flex items-baseline gap-2 border-b pb-1.5 text-base font-semibold", dia.hoje && "border-primary text-primary")}>
            <span className="capitalize">{diaSemana(dia.data)}</span>
            <span className="text-sm font-normal text-muted-foreground">{dataCurta(dia.data)}</span>
            {dia.hoje ? <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">Hoje</span> : null}
            {lado && dia.itens.length > 0 ? <span className="ml-auto text-xs font-normal text-muted-foreground">{dia.itens.length}</span> : null}
          </h2>
          {dia.itens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem divulgação cadastrada.</p>
          ) : (
            <div className={lado ? "grid gap-3" : "grid gap-3 lg:grid-cols-2"}>
              {dia.itens.map((o) => (
                <OfertaCard key={o.id} o={o} podeExcluir={podeExcluir} aoEditar={setEditando} />
              ))}
            </div>
          )}
        </section>
      ))}
      {editando ? <OfertaForm oferta={editando} dataPadrao={editando.data} aoFechar={() => setEditando(null)} /> : null}
    </div>
  );
}
