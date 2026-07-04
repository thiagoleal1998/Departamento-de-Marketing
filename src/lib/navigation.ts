import {
  LayoutDashboard,
  Ticket,
  HeartHandshake,
  Palette,
  BarChart3,
  KanbanSquare,
  FolderKanban,
  Settings,
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
  descricao?: string;
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
    href: "/operacional",
    label: "Operacional",
    icone: KanbanSquare,
    gradiente: "from-amber-500 to-orange-600",
    descricao: "Tarefas e kanban",
  },
  {
    href: "/projetos",
    label: "Projetos",
    icone: FolderKanban,
    gradiente: "from-indigo-500 to-violet-600",
    descricao: "Projetos maiores e eventos",
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icone: Settings,
    gradiente: "from-slate-500 to-gray-600",
    requer: "gerir_usuarios",
    descricao: "Usuários e permissões",
  },
];
