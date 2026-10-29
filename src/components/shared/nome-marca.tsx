import { cn } from "@/lib/utils";

/** Nome ao lado do logo: o departamento em destaque (em maiúsculas) e a empresa logo abaixo. */
export function NomeMarca({ className }: { className?: string }) {
  return (
    <span className={cn("flex min-w-0 flex-col leading-tight", className)}>
      <span className="truncate text-[11px] font-bold uppercase tracking-wide">Departamento de Marketing</span>
      <span className="truncate text-xs text-muted-foreground">Litoral Verde Operadora</span>
    </span>
  );
}
