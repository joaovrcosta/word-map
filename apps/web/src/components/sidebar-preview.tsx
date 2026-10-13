"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Home,
  Brain,
  BookOpen,
  Network,
  User,
  VaultIcon,
  Search,
  Bell,
  Plus,
  Sun,
  Moon,
} from "lucide-react";

export function SidebarPreview() {
  const [isOpen, setIsOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);

  const links = [
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <section
        className={`h-screen flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-500 ease-out ${
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
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto">
              <Sparkles size={20} className="text-white" />
            </div>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 ${
              isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <Search size={20} />
          </button>
        </div>

        {/* Search Bar */}
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
                <li key={link.path}>
                  <button
                    className={`relative group w-full h-12 px-4 mb-2 flex items-center justify-between rounded-xl transition-all duration-300 ease-out
                      ${
                        link.path === "/home"
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md"
                      }
                      ${
                        link.path === "/home"
                          ? "ring-2 ring-purple-300 ring-offset-2"
                          : ""
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg transition-all duration-300 ${
                          link.path === "/home"
                            ? "bg-white/20"
                            : "bg-gray-100 group-hover:bg-gray-200"
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
                          <span className="text-xs opacity-70">
                            {link.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {link.badge && (
                        <Badge
                          variant={
                            link.path === "/home" ? "secondary" : "default"
                          }
                          className="h-6 px-2 text-xs"
                        >
                          {link.badge}
                        </Badge>
                      )}
                    </div>
                  </button>
                </li>
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
                  onClick={() => setIsDark(!isDark)}
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
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs"
                  >
                    3
                  </Badge>
                </Button>
              </div>
            </>
          )}

          {!isOpen && (
            <div className="flex flex-col items-center space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDark(!isDark)}
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
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs"
                >
                  3
                </Badge>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-500" />
              Sidebar Modernizado
            </CardTitle>
            <CardDescription>
              Demonstração do novo design do sidebar com animações e
              funcionalidades modernas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">
                  ✨ Novas Funcionalidades
                </h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Design com gradientes e sombras</li>
                  <li>• Animações suaves e transições</li>
                  <li>• Badges de notificação</li>
                  <li>• Barra de pesquisa integrada</li>
                  <li>• Suporte a tema claro/escuro</li>
                  <li>• Tooltips informativos</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg">🎨 Melhorias Visuais</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Ícones com animações hover</li>
                  <li>• Estados ativos destacados</li>
                  <li>• Layout responsivo</li>
                  <li>• Cores harmoniosas</li>
                  <li>• Espaçamento otimizado</li>
                  <li>• Tipografia melhorada</li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button onClick={() => setIsOpen(!isOpen)} className="w-full">
                {isOpen ? "Colapsar" : "Expandir"} Sidebar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
