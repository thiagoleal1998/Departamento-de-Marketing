import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export function EmptyState({
  icone: Icone,
  titulo,
  descricao,
  acao,
  className,
}: {
  icone?: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center",
        className
      )}
    >
      {Icone ? (
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <Icone className="size-6 text-muted-foreground" />
        </div>
      ) : null}
      <h3 className="text-base font-semibold">{titulo}</h3>
      {descricao ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{descricao}</p>
      ) : null}
      {acao ? <div className="mt-5">{acao}</div> : null}
    </div>
  );
}
