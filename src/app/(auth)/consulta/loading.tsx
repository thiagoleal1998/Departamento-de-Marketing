import { Loader2 } from "lucide-react";

export default function Carregando() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
      <Loader2 className="size-5 animate-spin" /> Carregando…
    </div>
  );
}
