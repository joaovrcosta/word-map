"use client";

import { usePathname, useRouter } from "next/navigation";

import {
  Menu,
  ChevronDown,
  ChevronRight,
  Check,
  Key,
  Vote,
  CircleX,
  Brain,
  FilePen,
  BookOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  AlignBottomIcon,
  Cloud,
  CurrencyEth,
  Desktop,
  Mountains,
  VaultIcon,
} from "@phosphor-icons/react/dist/ssr";
import useSidebarStore from "@/store/sidebarStore";

type SidebarLink = {
  name: string;
  path: string;
  icon?: React.ElementType;
  children?: SidebarLink[];
};

const links: SidebarLink[] = [
  { name: "Homepage", path: "/home", icon: AlignBottomIcon },
  { name: "Vault", path: "/home/vault", icon: VaultIcon },
  { name: "Texts", path: "/home/texts", icon: BookOpen },
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

  return (
    <li key={link.path}>
      <div
        onClick={() => {
          if (hasChildren) {
            toggleSubmenu(link.name);
          } else {
            router.push(link.path);
          }
        }}
        className={`relative flex items-center h-[44px] transition-colors cursor-pointer
          ${isOpen ? "px-6" : "px-0"}
          ${
            isActive
              ? level === 0
                ? "bg-gradient-to-r from-purple-600 to-[#F0553D] text-white rounded-r-full"
                : "text-purple-600 font-medium"
              : "text-[#0A2540] hover:bg-[#f1f1f1] rounded-r-full"
          }`}
        style={{ paddingLeft: `${isOpen ? level * 16 + 24 : 0}px` }}
      >
        <div
          className={`flex w-full items-center ${
            isOpen ? "justify-between" : "justify-center"
          }`}
        >
          <div className="flex items-center gap-3">
            {link.icon && (
              <link.icon
                size={22}
                className="text-current"
                weight={isActive ? "fill" : "regular"}
              />
            )}
            {isOpen && <span>{link.name}</span>}
          </div>
          {isOpen && hasChildren && (
            <>
              {isSubmenuOpen ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </>
          )}
        </div>
      </div>

      {hasChildren && isSubmenuOpen && (
        <ul className="mt-2 space-y-2">
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
  const { isOpen, toggleSidebar } = useSidebarStore();
  const [openSubmenus, setOpenSubmenus] = useState<string[]>([]);

  const toggleSubmenu = (name: string) => {
    setOpenSubmenus((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
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
      className={`lg:flex hidden h-screen flex-col gap-2 bg-[#fff] text-[#0A2540] py-4 transition-all duration-300 ease-in-out border-r ${
        isOpen ? "w-72" : "w-16"
      }`}
    >
      <div className="flex-1">
        {/* Logo e botão */}
        <div
          className={`flex ${
            isOpen
              ? "items-start justify-start pl-[24px]"
              : "items-center justify-center"
          } mb-6 flex-col gap-4`}
        >
          {/* <Image
            src={magmaLogo}
            alt="Magma Logo"
            className={`transition-all duration-300 w-[132px] h-[32px] ${
              isOpen ? "block" : "hidden"
            }`}
          />

          <Image
            src={tinyLogo}
            alt="Tiny Logo"
            className={`transition-all duration-300 h-[32px] ${
              isOpen ? "hidden" : "block"
            }`}
          /> */}

          <button onClick={toggleSidebar} className="cursor-pointer mt-6">
            <Menu />
          </button>
        </div>

        {/* Menu */}
        <nav className="w-full bg-transparent py-4 px-0 rounded-lg border-none">
          <ul className={`space-y-2 ${isOpen ? "px-0 pr-4" : "px-[10px]"}`}>
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
    </section>
  );
};

export default AppSidebar;
