import { Loader2 } from "lucide-react";

/** Mostrado na hora (enquanto a página inicial, o login e a central carregam). */
export default function Carregando() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
      <Loader2 className="size-5 animate-spin text-primary" /> Carregando…
    </div>
  );
}
