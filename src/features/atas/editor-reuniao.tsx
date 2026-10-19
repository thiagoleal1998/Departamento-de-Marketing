"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import {
  adicionarItem,
  concluirReuniao,
  removerItem,
  salvarItem,
  salvarPresencas,
} from "./actions";
import { STATUS_ITEM_LABEL, type ItemAta, type StatusItem } from "./tipos";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface PessoaOpcao {
  id: string;
  nome: string;
}

const STATUS: StatusItem[] = ["nao_iniciado", "em_andamento", "concluido", "cancelado"];

/** ISO → valor do input datetime-local, no horário de Brasília. */
function paraInput(iso: string | null): string {
  if (!iso) return "";
  const s = new Date(iso).toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" });
  return s.replace(" ", "T").slice(0, 16);
}
const deInput = (v: string) => (v ? `${v}:00-03:00` : null);

function ItemEditor({
  it,
  reuniaoId,
  pessoas,
  editavel,
}: {
  it: ItemAta;
  reuniaoId: string;
  pessoas: PessoaOpcao[];
  editavel: boolean;
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(it.titulo);
  const [status, setStatus] = useState<StatusItem>(it.status ?? "nao_iniciado");
  const [resp, setResp] = useState(it.responsavel_id ?? "");
  const [prio, setPrio] = useState(it.prioridade ? String(it.prioridade) : "");
  const [prazo, setPrazo] = useState(paraInput(it.prazo));
  const [link, setLink] = useState(it.link ?? "");
  const [det, setDet] = useState(it.detalhamento ?? "");
  const [plano, setPlano] = useState(it.plano_acao ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, start] = useTransition();

  function salvar() {
    setMsg(null);
    start(async () => {
      const r = await salvarItem(it.id, reuniaoId, {
        titulo,
        detalhamento: det,
        plano_acao: plano,
        prioridade: prio ? parseInt(prio, 10) : null,
        responsavel_id: resp || null,
        prazo: deInput(prazo),
        status,
        link,
      });
      setMsg(r.erro ? { ok: false, texto: r.erro } : { ok: true, texto: "Salvo" });
    });
  }

  function remover() {
    if (!confirm("Remover este item da ata?")) return;
    start(async () => {
      const r = await removerItem(it.id, reuniaoId);
      if (r.erro) setMsg({ ok: false, texto: r.erro });
      else router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <Input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          disabled={!editavel}
          aria-label="Título do item"
          className="font-semibold"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} disabled={!editavel} onChange={(e) => setStatus(e.target.value as StatusItem)}>
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_ITEM_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Responsável</Label>
            <Select value={resp} disabled={!editavel} onChange={(e) => setResp(e.target.value)}>
              <option value="">
                {it.responsaveis_texto ? `Sem vínculo (${it.responsaveis_texto})` : "Sem responsável"}
              </option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Prazo</Label>
            <Input type="datetime-local" value={prazo} disabled={!editavel} onChange={(e) => setPrazo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Prioridade</Label>
            <Select value={prio} disabled={!editavel} onChange={(e) => setPrio(e.target.value)}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-1">
            <Label>Detalhamento</Label>
            <Textarea value={det} disabled={!editavel} onChange={(e) => setDet(e.target.value)} className="min-h-[90px]" />
          </div>
          <div className="space-y-1">
            <Label>Plano de ação</Label>
            <Textarea value={plano} disabled={!editavel} onChange={(e) => setPlano(e.target.value)} className="min-h-[90px]" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Link</Label>
          <Input value={link} disabled={!editavel} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
        </div>
        {editavel ? (
          <div className="flex items-center justify-end gap-2">
            {msg ? (
              <span className={msg.ok ? "text-xs text-emerald-600" : "text-xs text-destructive"}>{msg.texto}</span>
            ) : null}
            <Button type="button" variant="ghost" size="icon" aria-label="Remover item" onClick={remover} disabled={pendente}>
              <Trash2 className="size-4" />
            </Button>
            <Button type="button" size="sm" onClick={salvar} disabled={pendente}>
              {pendente ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar item
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function EditorReuniao({
  reuniaoId,
  editavel,
  itens,
  pessoas,
  presencas: presencasIniciais,
}: {
  reuniaoId: string;
  editavel: boolean;
  itens: ItemAta[];
  pessoas: PessoaOpcao[];
  presencas: { nome: string; presenca: string; obs: string }[];
}) {
  const router = useRouter();
  const [presencas, setPresencas] = useState(presencasIniciais);
  const [novo, setNovo] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, start] = useTransition();

  function salvarPresenca() {
    setMsg(null);
    start(async () => {
      const r = await salvarPresencas(reuniaoId, presencas);
      setMsg(r.erro ?? "Presença salva.");
    });
  }

  function adicionar() {
    setMsg(null);
    start(async () => {
      const r = await adicionarItem(reuniaoId, novo);
      if (r.erro) setMsg(r.erro);
      else {
        setNovo("");
        router.refresh();
      }
    });
  }

  function concluir() {
    if (
      !confirm(
        "Concluir a reunião? Os itens viram tarefas no kanban, os itens finalizados fecham as tarefas e os responsáveis serão avisados."
      )
    )
      return;
    setMsg(null);
    start(async () => {
      const r = await concluirReuniao(reuniaoId);
      if (r.erro) setMsg(r.erro);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="font-semibold">Lista de presença</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {presencas.map((p, i) => (
              <div key={p.nome} className="flex items-center gap-2">
                <span className="w-40 shrink-0 truncate text-sm">{p.nome}</span>
                <Select
                  value={p.presenca}
                  disabled={!editavel}
                  onChange={(e) =>
                    setPresencas((l) => l.map((x, j) => (j === i ? { ...x, presenca: e.target.value } : x)))
                  }
                  className="h-9 w-36"
                  aria-label={`Presença de ${p.nome}`}
                >
                  {["Presente", "Ausente", "Dispensado"].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
                <Input
                  value={p.obs}
                  disabled={!editavel}
                  onChange={(e) =>
                    setPresencas((l) => l.map((x, j) => (j === i ? { ...x, obs: e.target.value } : x)))
                  }
                  placeholder="Observação"
                  className="h-9"
                />
              </div>
            ))}
          </div>
          {editavel ? (
            <div className="flex justify-end">
              <Button type="button" size="sm" variant="outline" onClick={salvarPresenca} disabled={pendente}>
                Salvar presença
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Itens da ata ({itens.length})</h2>
        {itens.map((it) => (
          <ItemEditor key={it.id} it={it} reuniaoId={reuniaoId} pessoas={pessoas} editavel={editavel} />
        ))}
        {editavel ? (
          <div className="flex gap-2">
            <Input
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              placeholder="Título de um novo item"
              aria-label="Novo item"
              onKeyDown={(e) => {
                if (e.key === "Enter") adicionar();
              }}
            />
            <Button type="button" onClick={adicionar} disabled={pendente || !novo.trim()}>
              <Plus className="size-4" /> Adicionar
            </Button>
          </div>
        ) : null}
      </section>

      {editavel ? (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
          {msg ? <span className="text-sm text-muted-foreground">{msg}</span> : null}
          <Button type="button" onClick={concluir} disabled={pendente}>
            {pendente ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Concluir reunião
          </Button>
        </div>
      ) : null}
    </div>
  );
}
