import { Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ListaConversas } from "@/features/chat/lista-conversas";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { ehResponsavel } from "@/lib/responsaveis";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterDiretorio } from "@/features/equipe/diretorio";
import { nomesDeExibicao } from "@/features/equipe/exibicao";
import { CONVERSA_GERAL } from "@/features/chat/constantes";
import { ChatJanela, type MensagemView, type ProjetoOpcao } from "@/features/chat/chat-janela";
import type { ItemEstoqueChat } from "@/features/chat/vinculo-tipos";
import type { SobreEscolhido } from "@/features/chat/sobre-tipos";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

interface PessoaLite {
  id: string;
  nome: string;
  foto: string | null;
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; com?: string; tarefa?: string; ata?: string; titulo?: string; resp?: string }>;
}) {
  const { c, com: comParam, tarefa, ata, titulo, resp } = await searchParams;
  const usuario = await exigirUsuario();
  const supabase = await criarClienteServidor();

  const [diretorio, { data: membrosData }, { data: naoLidasData }] =
    await Promise.all([
      obterDiretorio(),
      supabase
        .from("chat_membros")
        .select("conversa_id, usuario_id, chat_conversas!inner(tipo)")
        .eq("chat_conversas.tipo", "direta"),
      supabase.rpc("chat_nao_lidas"),
    ]);

  // Fotos de perfil: o colaborador não lê o perfil dos colegas pela RLS, então vêm pelo servidor.
  const fotos = new Map<string, string | null>();
  if (servicoDisponivel()) {
    const { data: fs } = await criarClienteAdmin().from("profiles").select("id, avatar_url").eq("ativo", true);
    for (const p of (fs as { id: string; avatar_url: string | null }[] | null) ?? []) fotos.set(p.id, p.avatar_url);
  }
  // Cada pessoa aparece pelo nome que escolheu no perfil (se não escolheu, o nome completo).
  const exibicao = await nomesDeExibicao();
  const pessoas: PessoaLite[] = Array.from(diretorio.values()).map((p) => ({
    id: p.id,
    nome: exibicao.get(p.id) ?? p.nome,
    foto: fotos.get(p.id) ?? null,
  }));
  const nomes: Record<string, string> = Object.fromEntries(
    pessoas.map((p) => [p.id, p.nome])
  );
  const naoLidas = new Map<string, number>(
    ((naoLidasData as { conversa_id: string; qtd: number }[] | null) ?? []).map(
      (r) => [r.conversa_id, Number(r.qtd)]
    )
  );

  // Conversa direta -> a outra pessoa.
  const diretas = new Map<string, string>(); // conversa_id -> outro usuario
  for (const m of (membrosData as
    | { conversa_id: string; usuario_id: string }[]
    | null) ?? []) {
    if (m.usuario_id !== usuario.id) diretas.set(m.conversa_id, m.usuario_id);
  }
  const outraPessoaConversa = new Map<string, string>(
    Array.from(diretas.entries()).map(([conv, outro]) => [outro, conv])
  );

  // Vindo da Ata: abre a conversa direta com a pessoa responsável (cria se ainda não existir).
  // O calendário traz nomes curtos ("Shay", "Gustavo"): vale o primeiro responsável que for outra pessoa do painel.
  const com =
    comParam ??
    (resp
      ? pessoas.find((p) => p.id !== usuario.id && resp.split(",").some((r) => ehResponsavel(diretorio.get(p.id)?.nome ?? p.nome, [r])))?.id
      : undefined);
  const pessoaDaAta = com && com !== usuario.id && nomes[com] ? com : null;
  // Sem redirecionar: a conversa direta é aberta (ou criada) na própria carga da página.
  let conversaDaAta: string | null = null;
  if (pessoaDaAta && !c) {
    let conv = outraPessoaConversa.get(pessoaDaAta);
    if (!conv) {
      const { data } = await supabase.rpc("chat_abrir_direta", { p_outro: pessoaDaAta });
      conv = (data as string | null) ?? undefined;
    }
    if (conv) {
      diretas.set(conv, pessoaDaAta);
      outraPessoaConversa.set(pessoaDaAta, conv);
      conversaDaAta = conv;
    }
  }

  const conversaId = conversaDaAta ?? (c && (c === CONVERSA_GERAL || diretas.has(c)) ? c : CONVERSA_GERAL);

  // Assunto trazido pela Ata ou por um link: a tarefa (se a pessoa a enxerga) e/ou o tópico da ata.
  const tituloSobre = (titulo ?? "").trim().slice(0, 200);
  let sobreInicial: SobreEscolhido | null = null;
  if (tarefa && /^[0-9a-f-]{36}$/i.test(tarefa)) {
    const { data: t } = await supabase.from("tarefas").select("id, titulo").eq("id", tarefa).maybeSingle();
    const tt = t as { id: string; titulo: string } | null;
    sobreInicial = { tipo: ata === "cal" ? "calendario" : ata ? "ata" : "tarefa", titulo: tituloSobre || tt?.titulo || "Tarefa", tarefaId: tt?.id ?? null };
  } else if (ata && tituloSobre) {
    sobreInicial = { tipo: ata === "cal" ? "calendario" : "ata", titulo: tituloSobre, tarefaId: null };
  }
  const ehGeral = conversaId === CONVERSA_GERAL;
  const tituloConversa = ehGeral
    ? "Sala geral do time"
    : nomes[diretas.get(conversaId) ?? ""] ?? "Conversa";

  const { data: msgData } = await supabase
    .from("chat_mensagens")
    .select("*")
    .eq("conversa_id", conversaId)
    .order("created_at", { ascending: false })
    .limit(100);
  const mensagens = ((msgData as MensagemView[] | null) ?? []).reverse();

  const outras = pessoas.filter((p) => p.id !== usuario.id);

  // Itens do estoque que podem ser vinculados à mensagem.
  const { data: itensData } = await supabase
    .from("estoque_itens")
    .select("id, nome, quantidade, estoque_minimo")
    .eq("ativo", true)
    .order("nome");
  const itens = (itensData as ItemEstoqueChat[] | null) ?? [];

  // Projetos que podem ser citados (os já encerrados ficam de fora da lista).
  const { data: projetosData } = await supabase
    .from("projetos")
    .select("id, nome, status")
    .not("status", "in", "(concluido,cancelado)")
    .order("nome")
    .limit(300);
  const projetos = (projetosData as ProjetoOpcao[] | null) ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Chat"
        descricao="Converse ao vivo com a equipe: sala geral ou conversas diretas."
      />

      <Card className="grid h-[calc(100vh-15rem)] min-h-[420px] grid-cols-1 overflow-hidden md:grid-cols-[260px_1fr]">
        {/* Lista de conversas */}
        <ListaConversas
          pessoas={outras.map((p) => ({ id: p.id, nome: p.nome, foto: p.foto, conversa: outraPessoaConversa.get(p.id) ?? null }))}
          conversaAtiva={conversaId}
          naoLidasIniciais={Object.fromEntries(naoLidas)}
        />

        {/* Conversa */}
        <section className="flex min-h-0 flex-col">
          <header className="flex items-center gap-2.5 border-b px-4 py-2.5 text-sm font-semibold">
            {ehGeral ? (
              <Users className="size-5 text-muted-foreground" />
            ) : (
              <Avatar nome={tituloConversa} src={pessoas.find((p) => p.id === diretas.get(conversaId))?.foto} className="size-8 text-[11px]" />
            )}
            {tituloConversa}
          </header>
          <div className="min-h-0 flex-1">
            <ChatJanela
              key={conversaId}
              conversaId={conversaId}
              meuId={usuario.id}
              mensagensIniciais={mensagens}
              nomes={nomes}
              itens={itens}
              projetos={projetos}
              pessoas={pessoas}
              podeCriarTarefa={ehLideranca(usuario.role)}
              outroId={ehGeral ? null : diretas.get(conversaId) ?? null}
              sobreInicial={sobreInicial}
            />
          </div>
        </section>
      </Card>
    </div>
  );
}
