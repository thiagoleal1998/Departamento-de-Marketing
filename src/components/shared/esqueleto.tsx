import { cn } from "@/lib/utils";

/** Barra cinza pulsando: a base de todo esqueleto de carregamento. */
export function Bloco({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

function Moldura({ rotulo, className, children }: { rotulo: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label={rotulo} className={className}>
      {children}
      <span className="sr-only">{rotulo}</span>
    </div>
  );
}

/** Imita o quadro de alertas dos destinos (título, botões Hoje/Semana, texto e manchetes). */
export function EsqueletoAlertas() {
  return (
    <Moldura rotulo="Carregando alertas dos destinos…" className="flex h-full min-h-[240px] flex-col rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <Bloco className="size-5 rounded-full" />
          <Bloco className="h-5 w-56" />
        </div>
        <div className="flex gap-1">
          <Bloco className="h-7 w-16 rounded-full" />
          <Bloco className="h-7 w-20 rounded-full" />
        </div>
      </div>
      <div className="space-y-4 px-5 pb-5">
        <Bloco className="h-4 w-4/5" />
        <div className="space-y-2">
          <Bloco className="h-4 w-40" />
          <div className="space-y-2 rounded-lg border p-3">
            <Bloco className="h-3 w-32" />
            <Bloco className="h-4 w-full" />
          </div>
        </div>
        <Bloco className="h-3 w-2/3" />
      </div>
    </Moldura>
  );
}

/** Imita a caixa verde "Divulgação de hoje". */
export function EsqueletoDivulgacao() {
  return (
    <Moldura rotulo="Carregando a divulgação de hoje…" className="h-full min-h-[240px] w-full rounded-xl bg-gradient-to-br from-emerald-600/25 to-teal-700/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <Bloco className="h-4 w-40 bg-emerald-900/15" />
          <Bloco className="h-3 w-24 bg-emerald-900/15" />
        </div>
        <Bloco className="h-3 w-20 bg-emerald-900/15" />
      </div>
      <div className="mt-5 space-y-5">
        <div className="space-y-2">
          <Bloco className="h-3 w-24 bg-emerald-900/15" />
          <Bloco className="h-4 w-3/4 bg-emerald-900/15" />
          <Bloco className="h-3 w-1/2 bg-emerald-900/15" />
        </div>
        <div className="space-y-2 border-t border-emerald-900/10 pt-3">
          <Bloco className="h-3 w-24 bg-emerald-900/15" />
          <Bloco className="h-4 w-2/3 bg-emerald-900/15" />
        </div>
      </div>
    </Moldura>
  );
}

/** Imita os dois letreiros da agenda (hoje e amanhã). */
export function EsqueletoAgenda() {
  return (
    <Moldura rotulo="Carregando a agenda…" className="w-full space-y-2">
      {[0, 1].map((i) => (
        <div key={i} className="flex h-10 w-full items-center gap-3 rounded-full border bg-card pl-3 shadow-sm">
          <Bloco className="h-5 w-36 rounded" />
          <Bloco className="h-3 flex-1 mr-4" />
        </div>
      ))}
    </Moldura>
  );
}

/** Imita o painel da liderança (quadro de atenção e indicadores). */
export function EsqueletoPainel() {
  return (
    <Moldura rotulo="Carregando o painel…" className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <Bloco className="mb-2 h-5 w-52" />
        <Bloco className="mb-5 h-4 w-72 max-w-full" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
              <Bloco className="size-10 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Bloco className="h-4 w-32" />
                <Bloco className="h-3 w-24" />
              </div>
              <Bloco className="h-6 w-6" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
            <Bloco className="h-4 w-24" />
            <Bloco className="h-8 w-16" />
            <Bloco className="h-3 w-32" />
          </div>
        ))}
      </div>
    </Moldura>
  );
}
