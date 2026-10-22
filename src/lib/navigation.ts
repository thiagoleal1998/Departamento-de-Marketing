import {
  LayoutDashboard,
  Ticket,
  HeartHandshake,
  Palette,
  BarChart3,
  KanbanSquare,
  FolderKanban,
  Boxes,
  Megaphone,
  CalendarClock,
  Lightbulb,
  ListChecks,
  LayoutTemplate,
  FileText,
  ClipboardList,
  CalendarDays,
  NotebookPen,
  Handshake,
  FolderOpen,
  Smartphone,
  CalendarRange,
  Store,
  Plane,
  Target,
  Clapperboard,
  KeyRound,
  Settings,
  Palmtree,
  Newspaper,
  type LucideIcon,
} from "lucide-react";
import type { Permissao } from "@/lib/permissions";

export interface ItemNav {
  href: string;
  label: string;
  icone: LucideIcon;
  /** Gradiente da área (Tailwind), usado no item ativo do menu. */
  gradiente: string;
  /** Se definido, só aparece para quem tem a permissão. */
  requer?: Permissao;
  /** Só aparece para colaboradores (a liderança acessa pela área de Gestão). */
  soColaborador?: boolean;
  descricao?: string;
  /** Aparece separado dos demais (rodapé do menu). */
  separado?: boolean;
  /** Submenu expansível. */
  filhos?: SubItemNav[];
}

export interface SubItemNav {
  href: string;
  label: string;
  icone: LucideIcon;
  /** Ativo apenas quando o caminho é exatamente o href. */
  exato?: boolean;
}

export const NAVEGACAO: ItemNav[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icone: LayoutDashboard,
    gradiente: "from-sky-500 to-blue-600",
    descricao: "Visão geral do seu dia",
  },
  {
    href: "/executivo",
    label: "Visão geral",
    icone: Smartphone,
    gradiente: "from-emerald-500 to-teal-600",
    descricao: "Resumo para o celular e aprovações",
    requer: "ver_relatorios_gerais",
  },
  {
    href: "/chamados",
    label: "Chamados",
    icone: Ticket,
    gradiente: "from-blue-500 to-cyan-500",
    descricao: "Solicitações e acompanhamento",
  },
  {
    href: "/desenvolvimento",
    label: "Feedbacks e Desenvolvimento",
    icone: HeartHandshake,
    gradiente: "from-orange-500 to-rose-500",
    descricao: "Feedbacks, 1:1 e planos",
  },
  {
    href: "/criacao",
    label: "Criação",
    icone: Palette,
    gradiente: "from-fuchsia-500 to-purple-600",
    descricao: "Materiais e peças",
  },
  {
    href: "/gestao",
    label: "Gestão",
    icone: BarChart3,
    gradiente: "from-emerald-500 to-teal-600",
    requer: "ver_relatorios_gerais",
    descricao: "Indicadores e campanhas",
  },
  {
    href: "/gestao/ferias",
    label: "Minhas férias",
    icone: Palmtree,
    gradiente: "from-emerald-500 to-teal-600",
    soColaborador: true,
    descricao: "Seus períodos de férias",
  },
  {
    href: "/operacional",
    label: "Operacional",
    icone: KanbanSquare,
    gradiente: "from-amber-500 to-orange-600",
    descricao: "Tarefas, LPs, conteúdos, divulgação diária, calendário e senhas",
    filhos: [
      { href: "/operacional", label: "Tarefas", icone: ListChecks, exato: true },
      {
        href: "/operacional/landing-pages",
        label: "Landing Pages",
        icone: LayoutTemplate,
      },
      {
        href: "/operacional/conteudos-site",
        label: "Conteúdos do site",
        icone: FileText,
      },
      {
        href: "/operacional/controle-lps",
        label: "Controle de conteúdo das LPs",
        icone: ClipboardList,
      },
      {
        href: "/operacional/calendario",
        label: "Calendário de conteúdo",
        icone: CalendarRange,
      },
      { href: "/operacional/divulgacao", label: "Divulgação diária", icone: Newspaper },
      { href: "/operacional/senhas", label: "Senhas", icone: KeyRound },
    ],
  },
  {
    href: "/projetos",
    label: "Projetos",
    icone: FolderKanban,
    gradiente: "from-indigo-500 to-violet-600",
    descricao: "Eventos, famtours, projetos e VT's",
    filhos: [
      {
        href: "/projetos/categoria/eventos",
        label: "Eventos",
        icone: CalendarDays,
      },
      {
        href: "/projetos/categoria/feiras",
        label: "Feira",
        icone: Store,
      },
      {
        href: "/projetos/categoria/famtour",
        label: "Famtour",
        icone: Plane,
      },
      {
        href: "/projetos/categoria/projetos-de-marketing",
        label: "Projetos de Marketing",
        icone: Target,
      },
      {
        href: "/projetos/categoria/vts",
        label: "VT's",
        icone: Clapperboard,
      },
    ],
  },
  {
    href: "/atas",
    label: "Atas",
    icone: NotebookPen,
    gradiente: "from-cyan-500 to-sky-600",
    descricao: "Reuniões, responsáveis e prazos",
  },
  {
    href: "/comercial",
    label: "Comercial",
    icone: Handshake,
    gradiente: "from-emerald-500 to-green-600",
    descricao: "Condições e disponibilidades",
  },
  {
    href: "/documentos",
    label: "Documentos",
    icone: FolderOpen,
    gradiente: "from-amber-500 to-orange-600",
    descricao: "Planilhas, modelos e links",
  },
  {
    href: "/estoque",
    label: "Estoque",
    icone: Boxes,
    gradiente: "from-lime-500 to-green-600",
    descricao: "Brindes, flyers e banners",
  },
  {
    href: "/comunicados",
    label: "Comunicados",
    icone: Megaphone,
    gradiente: "from-rose-500 to-pink-600",
    descricao: "Avisos para todo o time",
  },
  {
    href: "/solicitacoes",
    label: "Solicitações",
    icone: CalendarClock,
    gradiente: "from-violet-500 to-purple-600",
    descricao: "Folga, férias e ajustes de horário",
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icone: Settings,
    gradiente: "from-slate-500 to-gray-600",
    requer: "gerir_usuarios",
    descricao: "Usuários e permissões",
  },
  {
    href: "/sugestoes",
    label: "Feedback",
    icone: Lightbulb,
    gradiente: "from-yellow-400 to-amber-500",
    descricao: "Relatos, ideias e elogios",
    separado: true,
  },
];
