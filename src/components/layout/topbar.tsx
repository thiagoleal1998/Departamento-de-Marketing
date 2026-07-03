import Link from "next/link";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sair } from "@/features/auth/actions";
import { PAPEL_LABEL } from "@/types";
import type { Profile } from "@/types/database";

export function Topbar({
  usuario,
  nomePainel,
}: {
  usuario: Profile;
  nomePainel: string;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
      <div className="lg:hidden">
        <span className="text-sm font-semibold">{nomePainel}</span>
      </div>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {PAPEL_LABEL[usuario.role]}
        </Badge>
        <Link
          href="/perfil"
          className="flex items-center gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-accent/50"
          title="Meu perfil"
        >
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{usuario.nome}</p>
            <p className="text-xs text-muted-foreground">
              {usuario.cargo ?? "—"}
            </p>
          </div>
          <Avatar nome={usuario.nome} src={usuario.avatar_url} />
        </Link>
        <form action={sair}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            title="Sair"
            aria-label="Sair"
          >
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
