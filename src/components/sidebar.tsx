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
import { ArticleIcon } from "@phosphor-icons/react";

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
    name: "HOME",
    path: "/home",
    icon: Home,
  },
  {
    name: "COFRES",
    path: "/home/vault",
    icon: VaultIcon,
  },
  {
    name: "TEXTOS",
    path: "/home/texts",
    icon: ArticleIcon,
  },
  {
    name: "FLASHCARDS",
    path: "/home/flashcards",
    icon: Brain,
    badge: 12,
  },
  {
    name: "CONEXÕES",
    path: "/home/connections",
    icon: Network,
  },
  {
    name: "PERFIL",
    path: "/home/profile",
    icon: User,
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
                className={`relative group w-12 h-12 mx-auto mb-1 flex items-center justify-center rounded-lg transition-all duration-200 ease-out
                  ${
                    isActive
                      ? "bg-blue-100 text-[#1cb0f6] border border-blue-200"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }
                `}
              >
                <link.icon
                  size={20}
                  className={`transition-transform group-hover:scale-105 ${
                    isActive ? "text-[#1cb0f6" : "text-gray-600"
                  }`}
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
        className={`relative group w-full h-12 px-4 mb-1 flex items-center justify-between rounded-2xl transition-all duration-200 ease-out
          ${
            isActive
              ? "bg-blue-100 text-[#1cb0f6] border border-blue-200"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }
        `}
        style={{ paddingLeft: `${level * 16 + 16}px` }}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-1 rounded-md transition-all duration-200 ${
              isActive
                ? "bg-blue-200"
                : "bg-transparent group-hover:bg-gray-100"
            }`}
          >
            <link.icon
              size={20}
              className={`transition-transform group-hover:scale-105 ${
                isActive ? "text-[#1cb0f6]" : "text-gray-600"
              }`}
            />
          </div>
          <div className="flex flex-col items-start">
            <span
              className={`font-bold text-sm ${
                isActive ? "text-[#1cb0f6]" : "text-gray-700"
              }`}
            >
              {link.name}
            </span>
            {link.description && (
              <span
                className={`text-xs ${
                  isActive ? "text-blue-500" : "text-gray-500"
                }`}
              >
                {link.description}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {link.badge && (
            <Badge
              variant={isActive ? "secondary" : "default"}
              className="h-5 px-2 text-xs bg-blue-100 text-blue-600"
            >
              {link.badge}
            </Badge>
          )}
          {hasChildren && (
            <div
              className={`transition-transform duration-200 ${
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
      className={`lg:flex hidden h-screen flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-500 ease-out flex-shrink-0 ${
        isOpen ? "w-64" : "w-16"
      }`}
      style={{
        width: isOpen ? "256px" : "64px",
        minWidth: isOpen ? "256px" : "64px",
        maxWidth: isOpen ? "256px" : "64px",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        {isOpen ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h1
                className="font-bold text-lg text-green-600"
                style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
              >
                wordmap
              </h1>
              <p className="text-xs text-gray-500">Aprenda idiomas</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
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

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2">
        <nav className="px-3">
          <ul className="space-y-0.5">
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
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        {isOpen && (
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon-sm" onClick={toggleTheme}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </Button>

            <Button variant="ghost" size="icon-sm" className="relative">
              <Bell size={18} />
              <NotificationBadge count={3} className="h-4 w-4" />
            </Button>
          </div>
        )}

        {!isOpen && (
          <div className="flex flex-col items-center space-y-2">
            <Button variant="ghost" size="icon-sm" onClick={toggleTheme}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </Button>

            <Button variant="ghost" size="icon-sm" className="relative">
              <Bell size={18} />
              <NotificationBadge count={3} className="h-4 w-4" />
            </Button>

            {isPermanentlyClosed && (
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handleResetSidebar}
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
