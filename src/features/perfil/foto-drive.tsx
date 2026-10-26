"use client";

import { useState, useTransition } from "react";
import { Link2, Loader2 } from "lucide-react";
import { puxarFotoDoDrive } from "./foto-drive-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Campo para puxar a foto de um link do Google Drive; entrega a imagem pronta em `onFoto`. */
export function FotoDrive({ onFoto, id }: { onFoto: (dataUrl: string) => void; id: string }) {
  const [url, setUrl] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pendente, start] = useTransition();

  function puxar() {
    if (!url.trim()) return;
    setErro(null);
    setOk(false);
    start(async () => {
      const r = await puxarFotoDoDrive(url);
      if (r.erro || !r.foto) return setErro(r.erro ?? "Não foi possível puxar a foto.");
      onFoto(r.foto);
      setOk(true);
      setUrl("");
    });
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Link2 className="size-3" /> Foto pelo link do Google Drive
      </label>
      <div className="flex gap-2">
        <Input
          id={id}
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              puxar();
            }
          }}
          placeholder="https://drive.google.com/file/d/…"
          className="h-9"
        />
        <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={puxar} disabled={pendente || !url.trim()}>
          {pendente ? <Loader2 className="size-4 animate-spin" /> : null} Puxar
        </Button>
      </div>
      {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
      {ok ? <p className="text-xs text-emerald-600">Foto puxada. Clique em Salvar para confirmar.</p> : null}
    </div>
  );
}
