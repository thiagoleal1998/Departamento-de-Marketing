"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { criarTarefaCard } from "./actions";
import { TAREFA_STATUS_META, type TarefaStatus } from "@/types";
import { CampoPasta } from "./campo-pasta";
import { SeletorLembretes } from "@/components/shared/seletor-lembretes";
import type { RaizPasta, Unidades } from "@/lib/pastas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InputData } from "@/components/ui/input-data";

/** Janela para criar um card no quadro de tarefas. */
export function NovoCardDialogo({
  pessoas,
  colunas,
  statusInicial,
  usuarioId,
  lideranca,
  unidades,
  aoFechar,
  aoCriar,
}: {
  unidades: Unidades;
  pessoas: { id: string; nome: string }[];
  colunas: TarefaStatus[];
  statusInicial: TarefaStatus;
  usuarioId: string;
  lideranca: boolean;
  aoFechar: () => void;
  aoCriar: (id: string) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<TarefaStatus>(statusInicial);
  const [responsavel, setResponsavel] = useState(usuarioId);
  const [colaborador, setColaborador] = useState("");
  const [prazo, setPrazo] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [tag, setTag] = useState("");
  const [link, setLink] = useState("");
  const [linkSite, setLinkSite] = useState("");
  const [lembretes, setLembretes] = useState<number[]>([]);
  const [pasta, setPasta] = useState<{ raiz: RaizPasta; caminho: string }>({ raiz: "corporativo", caminho: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();

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

  function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    start(async () => {
      const r = await criarTarefaCard({
        titulo,
        descricao,
        status,
        responsavel_id: responsavel || null,
        prazo: prazo || null,
        prioridade: prioridade ? Number(prioridade) : null,
        tag,
        link,
        colaborador_id: colaborador || null,
        link_site: linkSite,
        lembretes,
        pasta_raiz: pasta.raiz,
        pasta_caminho: pasta.caminho,
      });
      if (r.erro || !r.id) return setErro(r.erro ?? "Não foi possível criar o card.");
      aoCriar(r.id);
    });
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <form onSubmit={criar} role="dialog" aria-modal="true" aria-label="Novo card" className="w-full max-w-xl space-y-4 rounded-xl border bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Novo card</h2>
            <p className="text-sm text-muted-foreground">Crie uma tarefa no quadro. Depois, abra o card para editar o conteúdo.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={aoFechar}>
            <X className="size-5" />
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nc-titulo">Título *</Label>
          <Input id="nc-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} required autoFocus />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nc-status">Coluna</Label>
            <Select id="nc-status" value={status} onChange={(e) => setStatus(e.target.value as TarefaStatus)}>
              {colunas.map((c) => (
                <option key={c} value={c}>
                  {TAREFA_STATUS_META[c].label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-resp">Responsável</Label>
            <Select id="nc-resp" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} disabled={!lideranca}>
              <option value="">Sem responsável</option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-colab">Colaborador</Label>
            <Select id="nc-colab" value={colaborador} onChange={(e) => setColaborador(e.target.value)}>
              <option value="">Sem colaborador</option>
              {pessoas
                .filter((p) => p.id !== (lideranca ? responsavel : usuarioId))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-prazo">Prazo</Label>
            <InputData id="nc-prazo"  value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-prio">Prioridade (1 a 5)</Label>
            <Select id="nc-prio" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-tag">Tag</Label>
            <Input id="nc-tag" value={tag} onChange={(e) => setTag(e.target.value)} maxLength={60} placeholder="Ex.: Landing page" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-link">URL de referência</Label>
            <Input id="nc-link" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-link-site">URL do nosso site</Label>
            <Input id="nc-link-site" type="url" inputMode="url" value={linkSite} onChange={(e) => setLinkSite(e.target.value)} placeholder="https://" />
          </div>
          <SeletorLembretes valor={lembretes} onChange={setLembretes} rotuloData="prazo" semData={!prazo} />
          <CampoPasta id="nc-pasta" raiz={pasta.raiz} caminho={pasta.caminho} unidades={unidades} onChange={setPasta} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nc-desc">Descrição</Label>
          <Textarea id="nc-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} maxLength={3000} />
        </div>

        {erro ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2 className="size-4 animate-spin" /> : null} Criar card
          </Button>
        </div>
      </form>
    </div>
  );
}
