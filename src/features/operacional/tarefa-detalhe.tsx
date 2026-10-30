"use client";

import { useDialogo } from "@/components/shared/dialogo-provider";

import { useEffect, useState, useTransition } from "react";
import Link from "@/components/shared/link";
import { X, Loader2, Save, ExternalLink, Check, Trash2, Copy } from "lucide-react";
import { duplicarTarefa, excluirTarefa, salvarTarefa } from "./actions";
import { ConteudoCard } from "./conteudo-card";
import { CampoPasta } from "./campo-pasta";
import { criadaEm } from "@/lib/codigo-tarefa";
import { SeletorLembretes } from "@/components/shared/seletor-lembretes";
import { ehRaiz, type RaizPasta, type Unidades } from "@/lib/pastas";
import { AnexosTarefa } from "./anexos-tarefa";
import { ItensEstoqueTarefa } from "./itens-estoque-tarefa";
import { ConversaDoCard } from "./conversa-card";
import type { TarefaView, PessoaOpcao } from "./kanban-tarefas";
import { TAREFA_STATUS_META, type TarefaStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { diaBrasilia } from "@/lib/utils";
import { InputData } from "@/components/ui/input-data";
import { SelectSolicitante } from "./select-solicitante";
import { LinhaDoTempoTarefa } from "./linha-do-tempo-tarefa";
import { MOTIVOS_PRAZO } from "./historico-tipos";

const ORDEM_STATUS: TarefaStatus[] = [
  "a_fazer",
  "em_andamento",
  "alteracoes",
  "aprovacao_gustavo",
  "aprovacao_thiago",
  "aprovacao_marco",
  "revisao",
  "concluida",
];

/** Painel do card: propriedades no topo e conteúdo abaixo (estilo Notion). */
export function TarefaDetalhe({
  tarefa,
  pessoas,
  onFechar,
  onSalvo,
  onDuplicada,
  onExcluida,
  podeExcluir = false,
  usuarioId,
  unidades,
}: {
  unidades: Unidades;
  usuarioId: string;
  tarefa: TarefaView;
  pessoas: PessoaOpcao[];
  onFechar: () => void;
  onSalvo: (t: TarefaView) => void;
  onDuplicada: (id: string) => void;
  /** Chamado depois que a tarefa é excluída (o quadro a retira da tela). */
  onExcluida?: (id: string) => void;
  /** Liderança ou responsável pela tarefa. */
  podeExcluir?: boolean;
}) {
  const [titulo, setTitulo] = useState(tarefa.titulo);
  const [descricao, setDescricao] = useState(tarefa.descricao ?? "");
  const [status, setStatus] = useState<TarefaStatus>(tarefa.status);
  const [responsavelId, setResponsavelId] = useState(
    tarefa.responsavel_id ?? ""
  );
  const [colaboradorId, setColaboradorId] = useState(tarefa.colaborador_id ?? "");
  const [prazo, setPrazo] = useState(diaBrasilia(tarefa.prazo));
  const [prioridade, setPrioridade] = useState(
    tarefa.prioridade ? String(tarefa.prioridade) : ""
  );
  const [tag, setTag] = useState(tarefa.tag ?? "");
  const [link, setLink] = useState(tarefa.link ?? "");
  const [linkSite, setLinkSite] = useState(tarefa.link_site ?? "");
  const [solicitante, setSolicitante] = useState(tarefa.solicitante ?? "");
  // Mudança de prazo: motivo (lista) e observação; versaoHist recarrega a linha do tempo depois de salvar.
  const [motivoPrazo, setMotivoPrazo] = useState("");
  const [detalhePrazo, setDetalhePrazo] = useState("");
  const [versaoHist, setVersaoHist] = useState(0);
  const prazoOriginal = diaBrasilia(tarefa.prazo);
  const mudouPrazo = !!prazoOriginal && prazo !== prazoOriginal;
  const adiando = !!prazoOriginal && !!prazo && prazo > prazoOriginal;
  const [lembretes, setLembretes] = useState<number[]>(tarefa.lembretes);
  const [conteudo, setConteudo] = useState(tarefa.conteudo ?? "");
  const [pasta, setPasta] = useState<{ raiz: RaizPasta; caminho: string }>({
    raiz: ehRaiz(tarefa.pasta_raiz) ? tarefa.pasta_raiz : "corporativo",
    caminho: tarefa.pasta_caminho ?? "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pendente, startTransition] = useTransition();
  const { confirmar } = useDialogo();
  const alterado = JSON.stringify([
    titulo, descricao, status, responsavelId, colaboradorId, prazo, prioridade, tag, link, linkSite,
    solicitante, lembretes, conteudo, pasta.raiz, pasta.caminho,
  ]) !== JSON.stringify([
    tarefa.titulo, tarefa.descricao ?? "", tarefa.status, tarefa.responsavel_id ?? "", tarefa.colaborador_id ?? "",
    diaBrasilia(tarefa.prazo), tarefa.prioridade ? String(tarefa.prioridade) : "", tarefa.tag ?? "", tarefa.link ?? "",
    tarefa.link_site ?? "", tarefa.solicitante ?? "", tarefa.lembretes, tarefa.conteudo ?? "",
    ehRaiz(tarefa.pasta_raiz) ? tarefa.pasta_raiz : "corporativo", tarefa.pasta_caminho ?? "",
  ]);

  function duplicar() {
    setErro(null);
    startTransition(async () => {
      const res = await duplicarTarefa(tarefa.id);
      if (res.erro || !res.id) setErro(res.erro ?? "Não foi possível duplicar a tarefa.");
      else onDuplicada(res.id);
    });
  }

  useEffect(() => {
    function aoTecla(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTecla);
    return () => document.removeEventListener("keydown", aoTecla);
  }, [onFechar]);

  async function excluir() {
    const ok = await confirmar({
      titulo: "Excluir esta tarefa?",
      descricao:
        tarefa.titulo + "\n\nUse para tarefas que não são mais necessárias. A exclusão é definitiva e não pode ser desfeita.",
      confirmar: "Excluir tarefa",
      perigo: true,
    });
    if (!ok) return;
    setErro(null);
    startTransition(async () => {
      const res = await excluirTarefa(tarefa.id);
      if (res.erro) setErro(res.erro);
      else {
        onExcluida?.(tarefa.id);
        onFechar();
      }
    });
  }

  function salvar() {
    setErro(null);
    setSalvo(false);
    if (adiando && !motivoPrazo) {
      setErro("Informe o motivo do adiamento do prazo.");
      return;
    }
    startTransition(async () => {
      const res = await salvarTarefa(tarefa.id, {
        titulo,
        descricao,
        status,
        responsavel_id: responsavelId || null,
        prazo: prazo || null,
        prioridade: prioridade ? parseInt(prioridade, 10) : null,
        tag,
        link,
        conteudo,
        pasta_raiz: pasta.raiz,
        pasta_caminho: pasta.caminho,
        colaborador_id: colaboradorId || null,
        link_site: linkSite,
        lembretes,
        solicitante,
        prazo_motivo: mudouPrazo ? motivoPrazo : "",
        prazo_motivo_detalhe: mudouPrazo ? detalhePrazo : "",
      });
      if (res.erro) {
        setErro(res.erro);
        return;
      }
      setSalvo(true);
      setMotivoPrazo("");
      setDetalhePrazo("");
      setVersaoHist((v) => v + 1);
      const nomePessoa =
        pessoas.find((p) => p.id === responsavelId)?.nome ?? null;
      onSalvo({
        ...tarefa,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        status,
        responsavel_id: responsavelId || null,
        responsavel_nome: nomePessoa ?? tarefa.responsaveis_notion ?? null,
        prazo: prazo || null,
        prioridade: prioridade ? parseInt(prioridade, 10) : null,
        tag: tag.trim() || null,
        link: link.trim() || null,
        link_site: linkSite.trim() || null,
        solicitante: solicitante.trim() || null,
        lembretes,
        conteudo: conteudo || null,
        colaborador_id: colaboradorId || null,
        colaborador_nome: pessoas.find((p) => p.id === colaboradorId)?.nome ?? null,
        pasta_raiz: pasta.caminho.trim() ? pasta.raiz : null,
        pasta_caminho: pasta.caminho.trim().replace(/^\\+/, "") || null,
      });
    });
  }

  const linkExterno = link.trim().toLowerCase().startsWith("http")
    ? link.trim()
    : null;
  const linkSiteExterno = linkSite.trim().toLowerCase().startsWith("http") ? linkSite.trim() : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes do card"
        className="w-full max-w-3xl rounded-xl border bg-card shadow-xl"
      >
        {/* Cabeçalho */}
        <div className="flex items-start gap-3 border-b p-5">
          <div className="min-w-0 flex-1">
            {tarefa.codigo || tarefa.criada_em ? (
              <p className="mb-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                {tarefa.codigo ? <span className="font-semibold tracking-wide text-foreground/80">{tarefa.codigo}</span> : null}
                {criadaEm(tarefa.criada_em) ? <span>Criado em {criadaEm(tarefa.criada_em)}</span> : null}
              </p>
            ) : null}
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              aria-label="Título"
              className="h-auto border-0 px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onFechar}
            aria-label="Fechar"
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="space-y-6 p-5">
          <ItensEstoqueTarefa tarefaId={tarefa.id} />

          {/* Propriedades */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="td-status">Status</Label>
              <Select
                id="td-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TarefaStatus)}
              >
                {ORDEM_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {TAREFA_STATUS_META[s].label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td-resp">Responsável</Label>
              <Select
                id="td-resp"
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
              >
                <option value="">
                  {tarefa.responsaveis_notion
                    ? `Sem vínculo (${tarefa.responsaveis_notion})`
                    : "Sem responsável"}
                </option>
                {pessoas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td-colab">Colaborador</Label>
              <Select id="td-colab" value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)}>
                <option value="">Sem colaborador</option>
                {pessoas
                  .filter((p) => p.id !== responsavelId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td-solic">Solicitante</Label>
              <SelectSolicitante id="td-solic" value={solicitante} onChange={setSolicitante} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td-prazo">Prazo</Label>
              <InputData
                id="td-prazo"
                
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td-prio">Prioridade</Label>
              <Select
                id="td-prio"
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value)}
              >
                <option value="">—</option>
                <option value="1">1 (mais alta)</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5 (mais baixa)</option>
              </Select>
            </div>
            {mudouPrazo ? (
              <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50/70 p-3 sm:col-span-2 dark:bg-amber-950/30">
                <Label htmlFor="td-motivo-prazo">
                  {adiando ? "Motivo do adiamento do prazo" : prazo ? "Motivo da mudança do prazo (opcional)" : "Motivo de retirar o prazo (opcional)"}
                  {adiando ? <span className="text-destructive"> *</span> : null}
                </Label>
                <p className="text-xs text-muted-foreground">
                  De {prazoOriginal.slice(8)}/{prazoOriginal.slice(5, 7)}/{prazoOriginal.slice(0, 4)}
                  {prazo ? ` para ${prazo.slice(8)}/${prazo.slice(5, 7)}/${prazo.slice(0, 4)}` : " para sem prazo"}. O motivo fica na linha do tempo do card e entra nos relatórios.
                </p>
                <Select id="td-motivo-prazo" value={motivoPrazo} onChange={(e) => setMotivoPrazo(e.target.value)} aria-label="Motivo da mudança do prazo">
                  <option value="">Escolha o motivo…</option>
                  {MOTIVOS_PRAZO.map(([chave, rotulo]) => (
                    <option key={chave} value={chave}>
                      {rotulo}
                    </option>
                  ))}
                </Select>
                <Input value={detalhePrazo} onChange={(e) => setDetalhePrazo(e.target.value)} maxLength={300} placeholder="Algo a acrescentar? (opcional)" aria-label="Observação sobre o motivo" className="h-9 text-sm" />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="td-tag">Tags</Label>
              <Input
                id="td-tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Ex.: RH"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td-url">URL de referência</Label>
              <div className="flex gap-2">
                <Input
                  id="td-url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://"
                />
                {linkExterno ? (
                  <Button asChild variant="outline" size="icon">
                    <a
                      href={linkExterno}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Abrir URL"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td-url-site">URL do nosso site</Label>
              <div className="flex gap-2">
                <Input id="td-url-site" value={linkSite} onChange={(e) => setLinkSite(e.target.value)} placeholder="https://" />
                {linkSiteExterno ? (
                  <Button asChild variant="outline" size="icon">
                    <a href={linkSiteExterno} target="_blank" rel="noopener noreferrer" aria-label="Abrir URL do nosso site">
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
            <SeletorLembretes valor={lembretes} onChange={setLembretes} rotuloData="prazo" semData={!prazo} />
            <CampoPasta id="td-pasta" raiz={pasta.raiz} caminho={pasta.caminho} unidades={unidades} onChange={setPasta} />
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="td-desc">Descrição</Label>
              <Textarea
                id="td-desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="min-h-[70px]"
              />
            </div>
          </div>

          {/* Corpo do card */}
          <ConteudoCard valor={conteudo} onChange={setConteudo} />

          <AnexosTarefa tarefaId={tarefa.id} />

          <LinhaDoTempoTarefa tarefaId={tarefa.id} criadaEm={tarefa.criada_em} versao={versaoHist} />

          <ConversaDoCard tarefaId={tarefa.id} pessoas={pessoas} usuarioId={usuarioId} responsavelId={tarefa.responsavel_id} />

          {tarefa.origemHref ? (
            <Link
              href={tarefa.origemHref}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-4" /> {tarefa.origemLabel}
            </Link>
          ) : null}
        </div>

        {/* Rodapé */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t p-4">
          <div className="mr-auto space-y-1">
            <Button type="button" variant="outline" onClick={duplicar} disabled={pendente || alterado} title="Copia os dados salvos para uma nova tarefa em Não iniciado">
              <Copy className="size-4" /> Duplicar tarefa
            </Button>
            {alterado ? <p className="text-xs text-muted-foreground">Salve as alterações antes de duplicar.</p> : null}
          </div>
          {podeExcluir ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={excluir}
              disabled={pendente}
            >
              <Trash2 className="size-4" /> Excluir tarefa
            </Button>
          ) : null}
          {erro ? <span className="text-sm text-destructive">{erro}</span> : null}
          {salvo ? (
            <span className="flex items-center gap-1 text-sm text-emerald-600">
              <Check className="size-4" /> Salvo
            </span>
          ) : null}
          <Button type="button" variant="outline" onClick={onFechar}>
            Fechar
          </Button>
          <Button type="button" onClick={salvar} disabled={pendente}>
            {pendente ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
