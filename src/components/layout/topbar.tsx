import Link from "next/link";
import { NomeMarca } from "@/components/shared/nome-marca";
import { LogOut, MessagesSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sair } from "@/features/auth/actions";
import { NotificacoesBell } from "@/features/notificacoes/bell";
import { AtivarPush } from "@/features/notificacoes/ativar-push";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { obterNotificacoes } from "@/features/notificacoes/data";
import { PAPEL_LABEL } from "@/types";
import type { Profile } from "@/types/database";

export async function Topbar({
  usuario,
  nomePainel,
  chatNaoLidas = 0,
}: {
  usuario: Profile;
  nomePainel: string;
  chatNaoLidas?: number;
}) {
  const { itens, naoLidas } = await obterNotificacoes();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
      <div className="lg:hidden">
        <NomeMarca />
      </div>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2 sm:gap-3">
        <AtivarPush />
        <ThemeToggle />
        <Link
          href="/chat"
          title="Chat do time"
          aria-label={chatNaoLidas > 0 ? "Chat do time, " + chatNaoLidas + " mensagens não lidas" : "Chat do time"}
          className="relative inline-flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent"
        >
          <MessagesSquare className="size-4" />
          {chatNaoLidas > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
              {chatNaoLidas > 99 ? "99+" : chatNaoLidas}
            </span>
          ) : null}
        </Link>
        <NotificacoesBell itens={itens} naoLidas={naoLidas} />
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
