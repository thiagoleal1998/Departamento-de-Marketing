"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { salvarItemCalendario, type DadosItemCalendario } from "./actions";
import type { ItemCalendario } from "./lista-calendario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SeletorLembretes } from "@/components/shared/seletor-lembretes";
import { normalizarLembretes } from "@/lib/lembretes";

export const TIPOS = ["E-mail Marketing", "Redes Sociais", "Oferta", "Podcast", "Visita"];
const STATUS = ["Não iniciada", "Em andamento", "Editando", "Em aprovação - Gustavo", "Em Aprovação - Marco", "Agendado", "Postado", "Concluído"];
const CANAIS = ["RD Station", "Instagram", "Tiktok", "Whatsapp", "Youtube", "Facebook", "Close Friends"];
const PUBLICOS = ["B2B", "B2C"];
const OBJETIVOS = ["Alcance", "Engajamento", "Informativo", "Qualificação"];
const TIPOS_POST = ["Stories", "Feed", "Reels", "Carrossel", "Vídeo"];

/** Marcação múltipla (canais, público, responsáveis). */
function Marcas({ rotulo, opcoes, valor, aoMudar }: { rotulo: string; opcoes: string[]; valor: string[]; aoMudar: (v: string[]) => void }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium leading-none">{rotulo}</legend>
      <div className="flex flex-wrap gap-2 pt-1">
        {opcoes.map((o) => {
          const marcado = valor.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={marcado}
              onClick={() => aoMudar(marcado ? valor.filter((x) => x !== o) : [...valor, o])}
              className={
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                (marcado ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground")
              }
            >
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Janela para criar ou editar um item do calendário (e-mails, posts, ofertas…). */
export function ItemCalendarioForm({
  item,
  responsaveisConhecidos,
  dataPadrao,
  aoFechar,
}: {
  item?: ItemCalendario;
  responsaveisConhecidos: string[];
  dataPadrao: string;
  aoFechar: () => void;
}) {
  const [d, setD] = useState<DadosItemCalendario>(
    item
      ? {
          nome: item.nome,
          data: item.data ?? "",
          status: item.status,
          tipo: item.tipo ?? "",
          canais: item.canais,
          responsaveis: item.responsaveis,
          tipo_post: item.tipo_post ?? "",
          objetivo: item.objetivo ?? "",
          publico: item.publico,
          tags: item.tags ?? "",
          lembretes: normalizarLembretes(item.lembretes),
        }
      : { nome: "", data: dataPadrao, status: "Não iniciada", tipo: "E-mail Marketing", canais: ["RD Station"], responsaveis: [], tipo_post: "", objetivo: "", publico: [], tags: "", lembretes: [] }
  );
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();
  const set = <K extends keyof DadosItemCalendario>(k: K, v: DadosItemCalendario[K]) => setD((p) => ({ ...p, [k]: v }));
  const email = d.tipo === "E-mail Marketing";

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
      const r = await salvarItemCalendario(item?.id ?? null, d);
      if (r.erro) setErro(r.erro);
      else aoFechar();
    });
  }

  // Ao trocar o tipo, sugere o canal certo (e-mail → RD Station) se ainda não houver canal.
  function trocarTipo(t: string) {
    setD((p) => ({ ...p, tipo: t, canais: p.canais.length === 0 && t === "E-mail Marketing" ? ["RD Station"] : p.canais }));
  }

  const responsaveis = Array.from(new Set([...responsaveisConhecidos, ...d.responsaveis])).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <form onSubmit={salvar} role="dialog" aria-modal="true" aria-label="Item do calendário" className="w-full max-w-xl space-y-4 rounded-xl border bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{item ? "Editar item" : email ? "Novo e-mail" : "Novo item"}</h2>
          <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={aoFechar}>
            <X className="size-5" />
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cal-nome">{email ? "Nome / assunto do e-mail *" : "Nome *"}</Label>
            <Input id="cal-nome" value={d.nome} onChange={(e) => set("nome", e.target.value)} maxLength={300} required autoFocus placeholder={email ? "Ex.: Sábado Promocional - Vila Galé" : ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cal-data">Data de envio / publicação</Label>
            <Input id="cal-data" type="date" value={d.data} onChange={(e) => set("data", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cal-tipo">Tipo</Label>
            <Select id="cal-tipo" value={d.tipo} onChange={(e) => trocarTipo(e.target.value)}>
              {TIPOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cal-status">Status</Label>
            <Select id="cal-status" value={d.status} onChange={(e) => set("status", e.target.value)}>
              {Array.from(new Set([...STATUS, d.status])).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cal-obj">Objetivo</Label>
            <Select id="cal-obj" value={d.objetivo} onChange={(e) => set("objetivo", e.target.value)}>
              <option value="">—</option>
              {OBJETIVOS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          </div>
          {d.tipo === "Redes Sociais" ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cal-post">Tipo de post</Label>
              <Select id="cal-post" value={d.tipo_post} onChange={(e) => set("tipo_post", e.target.value)}>
                <option value="">—</option>
                {TIPOS_POST.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <Marcas rotulo="Canal" opcoes={CANAIS} valor={d.canais} aoMudar={(v) => set("canais", v)} />
          </div>
          <div className="sm:col-span-2">
            <Marcas rotulo="Público" opcoes={PUBLICOS} valor={d.publico} aoMudar={(v) => set("publico", v)} />
          </div>
          {responsaveis.length > 0 ? (
            <div className="sm:col-span-2">
              <Marcas rotulo="Responsável" opcoes={responsaveis} valor={d.responsaveis} aoMudar={(v) => set("responsaveis", v)} />
            </div>
          ) : null}
          <SeletorLembretes valor={d.lembretes ?? []} onChange={(v) => set("lembretes", v)} rotuloData="dia do item" semData={!d.data} />
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cal-tags">Tags</Label>
            <Input id="cal-tags" value={d.tags} onChange={(e) => set("tags", e.target.value)} maxLength={300} />
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
