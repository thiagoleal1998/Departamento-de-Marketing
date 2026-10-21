import { cn } from "@/lib/utils";

/** Nome ao lado do logo: empresa em destaque e o departamento logo abaixo. */
export function NomeMarca({ className }: { className?: string }) {
  return (
    <span className={cn("flex min-w-0 flex-col leading-tight", className)}>
      <span className="truncate text-sm font-semibold">Litoral Verde Operadora</span>
      <span className="truncate text-xs text-muted-foreground">Departamento de marketing</span>
    </span>
  );
}
