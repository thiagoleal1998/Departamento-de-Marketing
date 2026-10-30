"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { useActionState } from "react";
import { Camera, Trash2, Save, Check, Loader2 } from "lucide-react";
import { atualizarMeuPerfil, type EstadoPerfil } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { iniciais } from "@/lib/utils";
import { RAIZES, type Unidades } from "@/lib/pastas";
import { lerComoDataUrl } from "@/lib/imagem-avatar";
import { FotoDrive } from "./foto-drive";
import { EditorFoto } from "./editor-foto";
import { PAPEL_LABEL, type Papel } from "@/types";

const estadoInicial: EstadoPerfil = {};

export function PerfilForm({
  nome,
  nomeExibicao,
  cargo,
  email,
  whatsapp,
  papel,
  avatarUrl,
  unidades,
}: {
  unidades: Unidades;
  nome: string;
  nomeExibicao: string | null;
  cargo: string | null;
  email: string;
  whatsapp: string | null;
  papel: Papel;
  avatarUrl: string | null;
}) {
  const [estado, formAction, pendente] = useActionState(
    atualizarMeuPerfil,
    estadoInicial
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // "" = manter atual | data URL = nova foto | "__remover__" = remover
  const [avatarValor, setAvatarValor] = useState("");
  const [editorSrc, setEditorSrc] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  const removido = avatarValor === "__remover__";
  const preview = removido
    ? null
    : avatarValor && avatarValor !== "__remover__"
      ? avatarValor
      : avatarUrl;

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessando(true);
    try {
      setEditorSrc(await lerComoDataUrl(file));
    } catch {
      // ignora falha de leitura
    } finally {
      setProcessando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="avatar_url" value={avatarValor} />

      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6 sm:flex-row sm:items-center">
          {preview ? (
            <img
              src={preview}
              alt="Foto de perfil"
              className="size-24 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="flex size-24 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary ring-2 ring-border">
              {iniciais(nome)}
            </div>
          )}

          <div className="flex flex-col items-center gap-2 sm:items-start">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={aoEscolher}
              className="hidden"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={processando}
              >
                {processando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
                Escolher foto
              </Button>
              {preview?.startsWith("data:") ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditorSrc(preview)}>
                  Ajustar
                </Button>
              ) : null}
              {preview ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAvatarValor("__remover__")}
                >
                  <Trash2 className="size-4" /> Remover
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              JPG ou PNG. Depois de escolher, você enquadra a foto com zoom.
            </p>
            <div className="w-full sm:w-80">
              <FotoDrive id="foto-drive" onFoto={setEditorSrc} />
              {editorSrc ? (
                <EditorFoto
                  src={editorSrc}
                  onCancelar={() => setEditorSrc(null)}
                  onAplicar={(url) => {
                    setAvatarValor(url);
                    setEditorSrc(null);
                  }}
                />
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={nome} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nome_exibicao">Como você quer ser chamado(a)</Label>
            <Input id="nome_exibicao" name="nome_exibicao" defaultValue={nomeExibicao ?? ""} maxLength={60} placeholder="Ex.: Gustavo Moken" />
            <p className="text-xs text-muted-foreground">É o nome que os colegas veem no chat. Deixe em branco para usar o nome completo.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                name="cargo"
                defaultValue={cargo ?? ""}
                placeholder="Ex.: Analista de Marketing"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" value={email} disabled />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" name="whatsapp" type="tel" autoComplete="tel" maxLength={30}
              defaultValue={whatsapp ?? ""} placeholder="Ex.: +55 (11) 99999-9999" />
            <p className="text-xs text-muted-foreground">Opcional. Informe o número com DDD e, se necessário, DDI.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Perfil de acesso:</span>
            <Badge variant="secondary">{PAPEL_LABEL[papel]}</Badge>
            <span className="text-xs text-muted-foreground">
              (definido pelo gerente)
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div>
            <h2 className="text-base font-semibold">Minhas pastas de rede</h2>
            <p className="text-sm text-muted-foreground">
              Informe a letra que o seu computador usa para cada local. Assim, o caminho das pastas nos cards aparece certo para você.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {RAIZES.map((r) => (
              <div key={r.chave} className="space-y-1.5">
                <Label htmlFor={"unidade_" + r.chave}>{r.label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={"unidade_" + r.chave}
                    name={"unidade_" + r.chave}
                    defaultValue={unidades[r.chave]}
                    maxLength={1}
                    required
                    className="w-16 text-center text-lg font-semibold uppercase"
                  />
                  <span className="text-lg text-muted-foreground">:\</span>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Abrir a pasta direto no Explorador de Arquivos</p>
            <p className="mt-1 text-muted-foreground">
              Para o botão de pasta do card abrir o Explorador na pasta certa, ative uma vez neste computador: baixe o arquivo, abra-o e confirme. Não precisa ser administrador. Depois, o navegador pergunta uma vez se pode abrir; marque para sempre permitir.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <a href="/ativar-abrir-pasta.reg" download>
                Baixar ativação (Windows)
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {estado.ok ? (
          <span className="flex items-center gap-1 text-sm text-emerald-600">
            <Check className="size-4" /> Perfil atualizado
          </span>
        ) : null}
        {estado.erro ? (
          <span className="text-sm text-destructive">{estado.erro}</span>
        ) : null}
        <Button type="submit" disabled={pendente || processando}>
          {pendente ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar perfil
        </Button>
      </div>
    </form>
  );
}
