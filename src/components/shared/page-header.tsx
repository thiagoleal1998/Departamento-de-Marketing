import { cn } from "@/lib/utils";

export function PageHeader({
  titulo,
  descricao,
  acoes,
  className,
}: {
  titulo: string;
  descricao?: string;
  acoes?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descricao ? (
          <p className="text-sm text-muted-foreground">{descricao}</p>
        ) : null}
      </div>
      {acoes ? <div className="flex items-center gap-2">{acoes}</div> : null}
    </div>
  );
}
