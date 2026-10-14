"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Loader2, Camera, X } from "lucide-react";
import { criarItemEstoque, type EstadoEstoque } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const inicial: EstadoEstoque = {};

/** Reduz a imagem para no máx. 480px (JPEG compacto, data URL). */
function processarImagem(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 480;
        let { width, height } = img;
        if (width > height && width > max) {
          height = Math.round((height * max) / width);
          width = max;
        } else if (height >= width && height > max) {
          width = Math.round((width * max) / height);
          height = max;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function NovoItemForm() {
  const [aberto, setAberto] = useState(false);
  const [estado, formAction, pendente] = useActionState(
    criarItemEstoque,
    inicial
  );
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState("");

  useEffect(() => {
    if (estado.ok) {
      formRef.current?.reset();
      setFoto("");
      setAberto(false);
    }
  }, [estado]);

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setFoto(await processarImagem(file));
    } catch {
      // ignora falha de leitura
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  if (!aberto) {
    return (
      <Button onClick={() => setAberto(true)}>
        <Plus className="size-4" /> Novo item
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="foto_url" value={foto} />
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Novo item de estoque</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Fechar"
              onClick={() => setAberto(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="est-nome">Nome *</Label>
              <Input id="est-nome" name="nome" required placeholder="Ex.: Caneta personalizada" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="est-cat">Categoria</Label>
              <Select id="est-cat" name="categoria" defaultValue="brinde">
                <option value="brinde">Brinde</option>
                <option value="flyer">Flyer</option>
                <option value="banner">Banner</option>
                <option value="outro">Outro</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="est-local">Local</Label>
              <Input id="est-local" name="local" placeholder="Ex.: Armário 2, prateleira B" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="est-qtd">Quantidade inicial</Label>
                <Input id="est-qtd" name="quantidade" type="number" min={0} defaultValue={0} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="est-min">Estoque mínimo</Label>
                <Input id="est-min" name="estoque_minimo" type="number" min={0} defaultValue={0} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={aoEscolher}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="size-4" /> {foto ? "Trocar foto" : "Adicionar foto"}
            </Button>
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="Prévia" className="size-12 rounded-md object-cover" />
            ) : null}
          </div>

          {estado.erro ? (
            <p className="text-sm text-destructive">{estado.erro}</p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={pendente}>
              {pendente ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Cadastrar item
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
