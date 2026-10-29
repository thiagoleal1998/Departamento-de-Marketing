"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RefreshCw, Rocket, Save, Trash2 } from "lucide-react";
import { excluirProcesso, marcarRevisado, publicarProcesso, salvarCadastro, type DadosCadastro } from "./actions";
import type { Macroprocesso, Pendencia, Processo } from "./tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDialogo } from "@/components/shared/dialogo-provider";
import { cn } from "@/lib/utils";

const lista = (s: string) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);

function Linha({ rotulo, obrigatorio, ausente, ajuda, children }: { rotulo: string; obrigatorio?: boolean; ausente?: boolean; ajuda?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className={cn(ausente && "text-destructive")}>
        {rotulo}
        {obrigatorio ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {ausente ? <p className="text-xs text-destructive">Obrigatório para publicar.</p> : ajuda ? <p className="text-xs text-muted-foreground">{ajuda}</p> : null}
    </div>
  );
}

/** Cadastro do processo (formulário A). Campos obrigatórios para publicar ficam marcados enquanto faltarem; rascunhos incompletos podem ser salvos. */
export function CadastroProcesso({
  processo,
  macros,
  pessoas,
  editavel,
}: {
  processo: Processo;
  macros: Macroprocesso[];
  pessoas: { id: string; nome: string }[];
  editavel: boolean;
}) {
  const router = useRouter();
  const [d, setD] = useState<DadosCadastro>({
    nome: processo.nome,
    macroprocesso_id: processo.macroprocesso_id,
    descricao: processo.descricao ?? "",
    objetivo: processo.objetivo ?? "",
    gatilho: processo.gatilho ?? "",
    entradas: processo.entradas ?? "",
    saidas: processo.saidas ?? "",
    responsavel_id: processo.responsavel_id,
    areas: processo.areas,
    ferramentas: processo.ferramentas,
    prazo_referencia: processo.prazo_referencia ?? "",
    indicadores: processo.indicadores ?? "",
    documentos: processo.documentos ?? "",
  });
  const [areasTxt, setAreasTxt] = useState(processo.areas.join(", "));
  const [ferrTxt, setFerrTxt] = useState(processo.ferramentas.join(", "));
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, startTransition] = useTransition();
  const set = <K extends keyof DadosCadastro>(k: K, v: DadosCadastro[K]) => setD((x) => ({ ...x, [k]: v }));
  const ro = !editavel;

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const r = await salvarCadastro(processo.id, { ...d, areas: lista(areasTxt), ferramentas: lista(ferrTxt) });
      setMsg(r.erro ? { ok: false, texto: r.erro } : { ok: true, texto: "Cadastro salvo." });
      if (!r.erro) router.refresh();
    });
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Linha rotulo="Nome do processo" obrigatorio>
          <Input value={d.nome} onChange={(e) => set("nome", e.target.value)} disabled={ro} required />
        </Linha>
        <Linha rotulo="Macroprocesso">
          <Select value={d.macroprocesso_id ?? ""} onChange={(e) => set("macroprocesso_id", e.target.value || null)} disabled={ro} aria-label="Macroprocesso">
            <option value="">Sem macroprocesso</option>
            {macros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </Select>
        </Linha>
      </div>
      <Linha rotulo="Descrição">
        <Textarea rows={2} value={d.descricao} onChange={(e) => set("descricao", e.target.value)} disabled={ro} />
      </Linha>
      <Linha rotulo="Objetivo" obrigatorio ausente={!ro && !d.objetivo.trim()}>
        <Textarea rows={2} value={d.objetivo} onChange={(e) => set("objetivo", e.target.value)} disabled={ro} />
      </Linha>
      <div className="grid gap-4 sm:grid-cols-2">
        <Linha rotulo="O que inicia o processo? (gatilho)">
          <Textarea rows={2} value={d.gatilho} onChange={(e) => set("gatilho", e.target.value)} disabled={ro} />
        </Linha>
        <Linha rotulo="Entradas necessárias">
          <Textarea rows={2} value={d.entradas} onChange={(e) => set("entradas", e.target.value)} disabled={ro} />
        </Linha>
      </div>
      <Linha rotulo="Qual é a entrega final? (saídas esperadas)" obrigatorio ausente={!ro && !d.saidas.trim()}>
        <Textarea rows={2} value={d.saidas} onChange={(e) => set("saidas", e.target.value)} disabled={ro} />
      </Linha>
      <div className="grid gap-4 sm:grid-cols-2">
        <Linha rotulo="Responsável pelo processo (dono)" obrigatorio ausente={!ro && !d.responsavel_id} ajuda="Quem mantém a documentação atualizada; não executa necessariamente todas as etapas.">
          <Select value={d.responsavel_id ?? ""} onChange={(e) => set("responsavel_id", e.target.value || null)} disabled={ro} aria-label="Responsável pelo processo">
            <option value="">Sem responsável</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
        </Linha>
        <Linha rotulo="Prazo de referência">
          <Input value={d.prazo_referencia} onChange={(e) => set("prazo_referencia", e.target.value)} disabled={ro} placeholder="Ex.: 3 dias úteis" />
        </Linha>
        <Linha rotulo="Áreas envolvidas" ajuda="Separe por vírgula.">
          <Input value={areasTxt} onChange={(e) => setAreasTxt(e.target.value)} disabled={ro} placeholder="Marketing, Comercial" />
        </Linha>
        <Linha rotulo="Ferramentas utilizadas" ajuda="Separe por vírgula.">
          <Input value={ferrTxt} onChange={(e) => setFerrTxt(e.target.value)} disabled={ro} placeholder="RD Station, Canva" />
        </Linha>
      </div>
      <Linha rotulo="Indicadores">
        <Textarea rows={2} value={d.indicadores} onChange={(e) => set("indicadores", e.target.value)} disabled={ro} />
      </Linha>
      <Linha rotulo="Documentos relacionados" ajuda="Links e nomes de documentos, um por linha.">
        <Textarea rows={2} value={d.documentos} onChange={(e) => set("documentos", e.target.value)} disabled={ro} />
      </Linha>

      {editavel ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar cadastro
          </Button>
          {msg ? <span className={cn("text-sm", msg.ok ? "text-emerald-600" : "text-destructive")}>{msg.texto}</span> : null}
        </div>
      ) : null}
    </form>
  );
}

/** Publicar, registrar revisão e excluir. A publicação só acontece com as regras de qualidade cumpridas. */
export function AcoesProcesso({ processo, pendencias, editavel }: { processo: Processo; pendencias: Pendencia[]; editavel: boolean }) {
  const router = useRouter();
  const { confirmar, avisar } = useDialogo();
  const [pendente, startTransition] = useTransition();
  const [bloqueios, setBloqueios] = useState<Pendencia[] | null>(null);
  if (!editavel) return null;
  const erros = pendencias.filter((p) => p.nivel === "erro");

  function publicar() {
    setBloqueios(null);
    startTransition(async () => {
      const r = await publicarProcesso(processo.id);
      if (r.pendencias?.length) setBloqueios(r.pendencias);
      else if (r.erro) void avisar(r.erro, "Não foi possível publicar");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={publicar} disabled={pendente || processo.status === "publicado"}>
          {pendente ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
          {processo.publicado_em ? "Publicar nova versão" : "Publicar"}
        </Button>
        {processo.status === "publicado" ? (
          <Button
            type="button"
            variant="outline"
            disabled={pendente}
            onClick={() =>
              startTransition(async () => {
                const r = await marcarRevisado(processo.id);
                if (r.erro) void avisar(r.erro);
                else router.refresh();
              })
            }
          >
            <RefreshCw className="size-4" /> Marcar como revisado hoje
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="ml-auto text-destructive"
          disabled={pendente}
          onClick={async () => {
            if (!(await confirmar({ titulo: "Excluir este processo?", descricao: `${processo.codigo} — ${processo.nome}\n\nO fluxo e o histórico serão apagados.`, confirmar: "Excluir", perigo: true }))) return;
            startTransition(async () => {
              const r = await excluirProcesso(processo.id);
              if (r.erro) void avisar(r.erro);
              else router.push("/gestao/processos");
            });
          }}
        >
          <Trash2 className="size-4" /> Excluir
        </Button>
      </div>
      {processo.status !== "publicado" && erros.length > 0 && !bloqueios ? (
        <p className="text-xs text-muted-foreground">Para publicar ainda falta resolver {erros.length} ponto(s) obrigatório(s) (veja &ldquo;Pendências&rdquo;).</p>
      ) : null}
      {processo.status !== "publicado" && erros.length === 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" /> Regras de qualidade cumpridas: pronto para publicar.
        </p>
      ) : null}
      {bloqueios ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p className="mb-1 font-medium text-destructive">Não foi possível publicar:</p>
          <ul className="list-disc space-y-0.5 pl-5 text-xs">
            {bloqueios.map((b, i) => (
              <li key={i}>{b.texto}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
