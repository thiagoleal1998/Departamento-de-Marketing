"use client";

import { useRef, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import {
  exportarDesign,
  iniciarCriacao,
  listarModelos,
  organizarEmPasta,
  preencherModelo,
  redimensionarDesign,
  statusJob,
  type Job,
  type ModeloMarca,
  type ResultadoJob,
} from "./canva-briefing-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const FORMATOS = [
  { id: "story", rotulo: "Story / Reels (1080×1920) — em branco" },
  { id: "feed", rotulo: "Post feed (1080×1350) — em branco" },
  { id: "quadrado", rotulo: "Post quadrado (1080×1080) — em branco" },
  { id: "banner", rotulo: "Banner site (1920×600) — em branco" },
  { id: "email", rotulo: "E-mail (600×1200) — em branco" },
  { id: "presentation", rotulo: "Apresentação — gerada pela IA do Canva" },
  { id: "doc", rotulo: "Documento — gerado pela IA do Canva" },
];

type Design = NonNullable<ResultadoJob["design"]>;

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Consulta o job até concluir (máx. ~2 min). */
async function aguardar(job: Job): Promise<ResultadoJob> {
  for (let i = 0; i < 40; i++) {
    await espera(3000);
    const r = await statusJob(job);
    if (r.status !== "in_progress") return r;
  }
  return { status: "failed", erro: "Demorou demais. Veja em Designs recentes." };
}

export function BriefingCanva() {
  const formRef = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [design, setDesign] = useState<Design | null>(null);
  const [downloads, setDownloads] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [formatoRedim, setFormatoRedim] = useState("story");

  // Modelos de marca (autofill)
  const [modelos, setModelos] = useState<ModeloMarca[] | null>(null);
  const [modeloId, setModeloId] = useState("");
  const [campos, setCampos] = useState<Record<string, string>>({});

  async function rodar(
    texto: string,
    fn: () => Promise<{ job?: Job; erro?: string; design?: Design }>,
    aoConcluir?: (r: ResultadoJob) => void
  ) {
    setErro(null);
    setDownloads([]);
    setOcupado(true);
    setMsg(texto);
    try {
      const inicio = await fn();
      if (inicio.erro) return setErro(inicio.erro);
      if (inicio.design) {
        setDesign(inicio.design);
        return aoConcluir?.({ status: "success", design: inicio.design });
      }
      if (!inicio.job) return;
      const r = await aguardar(inicio.job);
      if (r.status === "failed") return setErro(r.erro ?? "Falhou.");
      if (r.design) setDesign(r.design);
      if (r.urls) setDownloads(r.urls);
      aoConcluir?.(r);
    } finally {
      setOcupado(false);
      setMsg(null);
    }
  }

  async function criar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const campanha = String(form.get("campanha") ?? "");
    await rodar(
      "Criando no Canva… (pode levar até 1 minuto)",
      () => iniciarCriacao(form),
      async (r) => {
        if (r.design && campanha.trim()) {
          const o = await organizarEmPasta(r.design.id, campanha);
          if (o.erro) setErro(`Design criado, mas a pasta falhou: ${o.erro}`);
        }
      }
    );
  }

  async function carregarModelos() {
    setErro(null);
    setOcupado(true);
    const r = await listarModelos();
    setOcupado(false);
    if (r.erro) return setErro(r.erro);
    setModelos(r.modelos ?? []);
  }

  const modelo = modelos?.find((m) => m.id === modeloId);
  const camposTexto = modelo?.campos.filter((c) => c.tipo === "text") ?? [];

  return (
    <div className="space-y-6">
      <form ref={formRef} onSubmit={criar} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="b-campanha">Campanha (cria a pasta no Canva)</Label>
            <Input id="b-campanha" name="campanha" placeholder="Ex.: Black Friday 2026" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-titulo">Título da peça</Label>
            <Input id="b-titulo" name="titulo" placeholder="Ex.: Story — oferta Caribe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-formato">Formato</Label>
            <Select id="b-formato" name="formato" defaultValue="story">
              {FORMATOS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.rotulo}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-publico">Público</Label>
            <Input id="b-publico" name="publico" placeholder="Ex.: casais, 30–45 anos, classe A/B" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-tom">Tom de voz</Label>
            <Input id="b-tom" name="tom" placeholder="Ex.: acolhedor, aspiracional" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-visual">Direção visual</Label>
            <Input id="b-visual" name="visual" placeholder="Ex.: azul e branco, fotos de praia, minimalista" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-oferta">Oferta / mensagem principal</Label>
          <Textarea id="b-oferta" name="oferta" className="min-h-[70px]" placeholder="O que a peça precisa comunicar" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-texto">Textos obrigatórios</Label>
          <Textarea id="b-texto" name="texto" className="min-h-[70px]" placeholder="Títulos, preços, CTA, regras e avisos legais exatamente como devem aparecer" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={ocupado}>
            {ocupado ? <Loader2 className="size-4 animate-spin" /> : null}
            Criar no Canva
          </Button>
          {msg ? <span className="text-sm text-muted-foreground">{msg}</span> : null}
          {erro ? <span className="text-sm text-destructive">{erro}</span> : null}
        </div>
      </form>

      {design ? (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-medium">{design.titulo || "Design criado"}</p>
            {design.url ? (
              <a
                href={design.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-sm font-medium text-primary underline"
              >
                Abrir no Canva <ExternalLink className="size-4" />
              </a>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={ocupado}
              onClick={() =>
                rodar("Exportando PNG…", () => exportarDesign(design.id, "png"))
              }
            >
              Exportar PNG
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={ocupado}
              onClick={() =>
                rodar("Exportando PDF…", () => exportarDesign(design.id, "pdf"))
              }
            >
              Exportar PDF
            </Button>
            <Select
              aria-label="Formato do redimensionamento"
              value={formatoRedim}
              onChange={(e) => setFormatoRedim(e.target.value)}
              className="w-56"
            >
              {FORMATOS.filter((f) => !["doc", "presentation"].includes(f.id)).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.rotulo.replace(" — em branco", "")}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={ocupado}
              onClick={() =>
                rodar("Redimensionando…", () =>
                  redimensionarDesign(design.id, formatoRedim)
                )
              }
            >
              Redimensionar
            </Button>
          </div>
          {downloads.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {downloads.map((u, i) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noreferrer" className="text-primary underline">
                    Baixar arquivo {downloads.length > 1 ? i + 1 : ""} (link válido por 24h)
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <section className="space-y-3 border-t pt-6">
        <div>
          <h3 className="font-semibold">Modelos da marca (preenchimento automático)</h3>
          <p className="text-sm text-muted-foreground">
            Escolha um modelo da sua marca no Canva e preencha os textos; o
            design sai pronto com a identidade visual.
          </p>
        </div>
        {modelos === null ? (
          <Button type="button" variant="outline" size="sm" disabled={ocupado} onClick={carregarModelos}>
            Carregar meus modelos
          </Button>
        ) : modelos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum modelo de marca encontrado. No Canva, publique um design
            como modelo da marca (Brand Kit) para aparecer aqui.
          </p>
        ) : (
          <div className="space-y-3">
            <Select
              aria-label="Modelo"
              value={modeloId}
              onChange={(e) => {
                setModeloId(e.target.value);
                setCampos({});
              }}
            >
              <option value="">Selecione um modelo…</option>
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.titulo}
                </option>
              ))}
            </Select>
            {modelo && camposTexto.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {modelo.erro
                  ? `Não foi possível ler os campos do modelo: ${modelo.erro}`
                  : modelo.campos.length > 0
                    ? `O modelo só tem campos de outros tipos (${modelo.campos.map((c) => c.nome + ": " + c.tipo).join(", ")}).`
                    : "O Canva não encontrou campos de dados neste modelo. No Canva, marque os textos com Data autofill e publique de novo como modelo da marca."}
              </p>
            ) : null}
            {camposTexto.map((c) => (
              <div key={c.nome} className="space-y-1.5">
                <Label htmlFor={`m-${c.nome}`}>{c.nome}</Label>
                <Input
                  id={`m-${c.nome}`}
                  value={campos[c.nome] ?? ""}
                  onChange={(e) =>
                    setCampos((v) => ({ ...v, [c.nome]: e.target.value }))
                  }
                />
              </div>
            ))}
            {modelo && camposTexto.length > 0 ? (
              <Button
                type="button"
                disabled={ocupado}
                onClick={() =>
                  rodar("Preenchendo o modelo…", () =>
                    preencherModelo(modelo.id, modelo.titulo, campos)
                  )
                }
              >
                Preencher modelo
              </Button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
