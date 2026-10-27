"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { lerComoDataUrl } from "@/lib/imagem-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Reduz a imagem no navegador (antes de enviar). A logo mantém o fundo transparente (PNG). */
async function reduzir(src: string, maxLado: number, transparente: boolean): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const k = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k));
  const h = Math.max(1, Math.round(img.naturalHeight * k));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas");
  if (!transparente) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);
  return transparente ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.85);
}

/**
 * Escolha de imagem do projeto (capa ou logo do parceiro). Envia dois campos no formulário:
 * `name` (a nova imagem, reduzida) e `remover_<name>` (marcado quando a atual deve ser retirada).
 */
export function CampoImagem({
  name,
  rotulo,
  dica,
  atual,
  formato,
}: {
  name: string;
  rotulo: string;
  dica?: string;
  atual?: string | null;
  formato: "capa" | "logo";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [nova, setNova] = useState("");
  const [removida, setRemovida] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const preview = nova || (removida ? "" : atual ?? "");

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro(null);
    setLendo(true);
    try {
      setNova(await reduzir(await lerComoDataUrl(arquivo), formato === "capa" ? 1600 : 480, formato === "logo"));
      setRemovida(false);
    } catch {
      setErro("Não foi possível abrir essa imagem. Tente outra (JPG ou PNG).");
    } finally {
      setLendo(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium leading-none">{rotulo}</p>
      <input type="hidden" name={name} value={nova} />
      <input type="hidden" name={"remover_" + name} value={removida && !nova ? "1" : ""} />
      <input ref={input} type="file" accept="image/*" onChange={escolher} className="hidden" />
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "grid shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted/40",
            formato === "capa" ? "h-20 w-36" : "size-20 bg-white p-1.5"
          )}
        >
          {preview ? (
            <img src={preview} alt={rotulo} className={cn("size-full", formato === "capa" ? "object-cover" : "object-contain")} />
          ) : (
            <ImagePlus className="size-6 text-muted-foreground/60" />
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={lendo}>
            {lendo ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {preview ? "Trocar" : "Escolher imagem"}
          </Button>
          {preview ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-muted-foreground"
              onClick={() => {
                setNova("");
                setRemovida(true);
              }}
            >
              <Trash2 className="size-3.5" /> Remover
            </Button>
          ) : null}
        </div>
      </div>
      {dica ? <p className="text-xs text-muted-foreground">{dica}</p> : null}
      {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
    </div>
  );
}
