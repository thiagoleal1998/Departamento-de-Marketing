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
  /** Se definido, só aparece para quem tem a permissão. */
  requer?: Permissao;
  descricao?: string;
}

export const NAVEGACAO: ItemNav[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icone: LayoutDashboard,
    descricao: "Visão geral do seu dia",
  },
  {
    href: "/chamados",
    label: "Chamados",
    icone: Ticket,
    descricao: "Solicitações e acompanhamento",
  },
  {
    href: "/desenvolvimento",
    label: "Feedbacks e Desenvolvimento",
    icone: HeartHandshake,
    descricao: "Feedbacks, 1:1 e planos",
  },
  {
    href: "/criacao",
    label: "Criação",
    icone: Palette,
    descricao: "Materiais e peças",
  },
  {
    href: "/gestao",
    label: "Gestão",
    icone: BarChart3,
    requer: "ver_relatorios_gerais",
    descricao: "Indicadores e campanhas",
  },
  {
    href: "/operacional",
    label: "Operacional",
    icone: KanbanSquare,
    descricao: "Tarefas e kanban",
  },
  {
    href: "/projetos",
    label: "Projetos",
    icone: FolderKanban,
    descricao: "Projetos maiores e eventos",
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icone: Settings,
    requer: "gerir_usuarios",
    descricao: "Usuários e permissões",
  },
];
