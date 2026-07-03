import Link from "next/link";
import { Megaphone, AlertTriangle, ArrowLeft } from "lucide-react";
import { LoginForm } from "@/features/auth/login-form";
import { supabaseConfigurado } from "@/lib/supabase/env";
import { obterConfig } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const configurado = supabaseConfigurado();
  const { textos } = await obterConfig();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Megaphone className="size-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {textos.login_titulo}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {textos.login_subtitulo}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {configurado ? (
              <LoginForm />
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-amber-600">
                  <AlertTriangle className="size-4" />
                  Supabase ainda não configurado
                </div>
                <p className="text-muted-foreground">
                  Para ativar o login, crie um projeto no Supabase, copie
                  <code className="mx-1 rounded bg-muted px-1">
                    .env.local.example
                  </code>
                  para
                  <code className="mx-1 rounded bg-muted px-1">.env.local</code>
                  e preencha as credenciais. Depois aplique os arquivos de
                  <code className="mx-1 rounded bg-muted px-1">supabase/</code>
                  (migration e seed).
                </p>
                <p className="text-muted-foreground">
                  Usuários de exemplo do seed (senha
                  <code className="mx-1 rounded bg-muted px-1">senha123</code>):
                  gerente@exemplo.com, lider@exemplo.com, colaborador@exemplo.com.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> Voltar ao portal de solicitações
          </Link>
        </div>
      </div>
    </div>
  );
}
