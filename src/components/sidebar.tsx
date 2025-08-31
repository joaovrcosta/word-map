"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  X,
  ChevronDown,
  ChevronRight,
  Brain,
  BookOpen,
  Network,
  User,
  Home,
  FolderOpen,
  Sparkles,
  Settings,
  Bell,
  Search,
  Sun,
  Moon,
  Plus,
} from "lucide-react";
import { VaultIcon } from "@phosphor-icons/react/dist/ssr";
import useSidebarStore from "@/store/sidebarStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NotificationBadge } from "@/components/ui/notification-badge";

type SidebarLink = {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: number;
  description?: string;
  children?: SidebarLink[];
};

const links: SidebarLink[] = [
  {
    name: "Dashboard",
    path: "/home",
    icon: Home,
    description: "Visão geral do seu progresso",
  },
  {
    name: "Vaults",
    path: "/home/vault",
    icon: VaultIcon,
    badge: 3,
    description: "Gerencie seus cofres de palavras",
  },
  {
    name: "Flashcards",
    path: "/home/flashcards",
    icon: Brain,
    badge: 12,
    description: "Pratique com flashcards",
  },
  {
    name: "Textos",
    path: "/home/texts",
    icon: BookOpen,
    description: "Analise e estude textos",
  },
  {
    name: "Conexões",
    path: "/home/connections",
    icon: Network,
    description: "Visualize conexões entre palavras",
  },
  {
    name: "Perfil",
    path: "/home/profile",
    icon: User,
    description: "Configurações da sua conta",
  },
];

interface SidebarItemProps {
  link: SidebarLink;
  isOpen: boolean;
  pathName: string;
  openSubmenus: string[];
  toggleSubmenu: (name: string) => void;
  level?: number;
}

const SidebarItem = ({
  link,
  isOpen,
  pathName,
  openSubmenus,
  toggleSubmenu,
  level = 0,
}: SidebarItemProps) => {
  const router = useRouter();
  const hasChildren = !!link.children?.length;
  const isActive =
    link.path === "/home"
      ? pathName === "/home"
      : pathName.startsWith(link.path);

  const isSubmenuOpen = openSubmenus.includes(link.name);

  const handleClick = () => {
    if (hasChildren) {
      toggleSubmenu(link.name);
    } else {
      router.push(link.path);
    }
  };

  if (!isOpen) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <li>
              <button
                onClick={handleClick}
                className={`relative group w-12 h-12 mx-auto mb-2 flex items-center justify-center rounded-xl transition-all duration-300 ease-out
                  ${
                    isActive
                      ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:scale-110"
                  }
                  ${isActive ? "ring-2 ring-purple-300 ring-offset-2" : ""}
                `}
              >
                <link.icon
                  size={20}
                  className="transition-transform group-hover:scale-110"
                />
                {link.badge && <NotificationBadge count={link.badge} />}
              </button>
            </li>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white">
            <div className="text-center">
              <p className="font-medium">{link.name}</p>
              {link.description && (
                <p className="text-xs text-gray-300 mt-1">{link.description}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <li key={link.path}>
      <button
        onClick={handleClick}
        className={`relative group w-full h-12 px-4 mb-2 flex items-center justify-between rounded-xl transition-all duration-300 ease-out
          ${
            isActive
              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md"
          }
          ${isActive ? "ring-2 ring-purple-300 ring-offset-2" : ""}
        `}
        style={{ paddingLeft: `${level * 16 + 16}px` }}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg transition-all duration-300 ${
              isActive ? "bg-white/20" : "bg-gray-100 group-hover:bg-gray-200"
            }`}
          >
            <link.icon
              size={18}
              className="transition-transform group-hover:scale-110"
            />
          </div>
          <div className="flex flex-col items-start">
            <span className="font-medium text-sm">{link.name}</span>
            {link.description && (
              <span className="text-xs opacity-70">{link.description}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {link.badge && (
            <Badge
              variant={isActive ? "secondary" : "default"}
              className="h-6 px-2 text-xs"
            >
              {link.badge}
            </Badge>
          )}
          {hasChildren && (
            <div
              className={`transition-transform duration-300 ${
                isSubmenuOpen ? "rotate-180" : ""
              }`}
            >
              <ChevronDown size={16} />
            </div>
          )}
        </div>
      </button>

      {hasChildren && isSubmenuOpen && (
        <ul className="mt-2 space-y-1 ml-4 border-l-2 border-gray-200 pl-4">
          {link.children?.map((child) => (
            <SidebarItem
              key={child.path}
              link={child}
              isOpen={isOpen}
              pathName={pathName}
              openSubmenus={openSubmenus}
              toggleSubmenu={toggleSubmenu}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

const AppSidebar = () => {
  const pathName = usePathname();
  const { isOpen, closeSidebar, isPermanentlyClosed } = useSidebarStore();

  const handleResetSidebar = () => {
    // Reset do sidebar - apenas para casos especiais
    if (
      confirm(
        "Tem certeza que deseja reabrir o sidebar? Esta ação não pode ser desfeita."
      )
    ) {
      window.location.reload();
    }
  };
  const [openSubmenus, setOpenSubmenus] = useState<string[]>([]);
  const [isDark, setIsDark] = useState(false);

  const toggleSubmenu = (name: string) => {
    setOpenSubmenus((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    // Aqui você pode implementar a lógica de tema
  };

  useEffect(() => {
    if (!isOpen) setOpenSubmenus([]);
  }, [isOpen]);

  useEffect(() => {
    links.forEach((link) => {
      if (
        link.path !== "/dashboard" &&
        link.children?.some((child) => pathName.startsWith(child.path))
      ) {
        setOpenSubmenus((prev) =>
          prev.includes(link.name) ? prev : [...prev, link.name]
        );
      }
    });
  }, [pathName]);

  return (
    <section
      className={`lg:flex hidden h-screen flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-500 ease-out ${
        isOpen ? "w-80" : "w-16"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        {isOpen ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Word Map
              </h1>
              <p className="text-xs text-gray-500">Aprenda idiomas</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 font-medium">Fechado</p>
              <p className="text-xs text-gray-400">Permanentemente</p>
            </div>
          </div>
        )}

        {/* <button
          onClick={closeSidebar}
          className={`p-2 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent transition-all duration-300 ${
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          title="Fechar sidebar permanentemente"
        >
          <X size={20} />
        </button> */}
      </div>

      {/* Search Bar (only when open) */}
      {isOpen && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-4">
          <ul className="space-y-1">
            {links.map((link) => (
              <SidebarItem
                key={link.path}
                link={link}
                isOpen={isOpen}
                pathName={pathName}
                openSubmenus={openSubmenus}
                toggleSubmenu={toggleSubmenu}
              />
            ))}
          </ul>
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
        {isOpen && (
          <>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200"
            >
              <Plus size={18} />
              Criar Novo
            </Button>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 relative"
              >
                <Bell size={18} />
                <NotificationBadge count={3} className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {!isOpen && (
          <div className="flex flex-col items-center space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 relative"
            >
              <Bell size={18} />
              <NotificationBadge count={3} className="h-4 w-4" />
            </Button>

            {isPermanentlyClosed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetSidebar}
                className="p-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border-blue-200 text-blue-600"
                title="Reabrir sidebar (requer confirmação)"
              >
                <Sparkles size={16} />
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default AppSidebar;
