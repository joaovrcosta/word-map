"use client";

import { useState, useEffect } from "react";
import { Plus, FileText, Edit2, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Text, getUserTexts, deleteText } from "@/actions/actions";
import { CreateTextForm } from "./create-text-form";
import { TextViewer } from "./text-viewer";

export default function TextsPage() {
  const [texts, setTexts] = useState<Text[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoadingTexts, setIsLoadingTexts] = useState(true);
  const [selectedText, setSelectedText] = useState<Text | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Buscar textos usando Server Action
  const fetchTexts = async () => {
    try {
      setIsLoadingTexts(true);
      // TODO: Pegar userId do contexto de autenticação
      const userId = 1; // Temporário
      const textsData = await getUserTexts();
      setTexts(textsData);
    } catch (error) {
      console.error("Erro ao buscar textos:", error);
      // Em caso de erro, manter dados mockados como fallback
      const mockTexts: Text[] = [
        {
          id: 1,
          title: "Artigo sobre Tecnologia",
          content:
            "This is a sample text about technology. It contains words like computer, software, and internet that might be in your vaults.",
          userId: 1,
          createdAt: new Date("2024-01-15"),
          updatedAt: new Date("2024-01-20"),
        },
        {
          id: 2,
          title: "História em Inglês",
          content:
            "Once upon a time, there was a beautiful princess who loved to read books and learn new words.",
          userId: 1,
          createdAt: new Date("2024-01-10"),
          updatedAt: new Date("2024-01-18"),
        },
      ];
      setTexts(mockTexts);
    } finally {
      setIsLoadingTexts(false);
    }
  };

  useEffect(() => {
    fetchTexts();
  }, []);

  // Deletar texto usando Server Action
  const handleDeleteText = async (textId: number) => {
    if (!confirm("Tem certeza que deseja excluir este texto?")) return;

    try {
      await deleteText(textId);

      // Remover o texto da lista local
      setTexts((prev) => prev.filter((text) => text.id !== textId));
    } catch (error) {
      console.error("Erro ao excluir texto:", error);
      alert(
        `Erro ao deletar texto: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    }
  };

  // Abrir visualizador de texto
  const handleViewText = (text: Text) => {
    setSelectedText(text);
    setIsViewerOpen(true);
  };

  // Recarregar textos após criação
  const handleTextCreated = async () => {
    setIsCreateDialogOpen(false);
    await fetchTexts();
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  if (isLoadingTexts) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando textos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Meus Textos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Salve e analise textos para identificar palavras dos seus vaults
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus size={20} />
              Novo Texto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Texto</DialogTitle>
            </DialogHeader>
            <CreateTextForm
              onSuccess={handleTextCreated}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Textos */}
      {texts.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={64} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhum texto criado ainda
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Crie seu primeiro texto para começar a analisar palavras
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus size={20} className="mr-2" />
            Criar Primeiro Texto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {texts.map((text) => (
            <Card key={text.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                      {text.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                      {text.content.length > 100
                        ? `${text.content.substring(0, 100)}...`
                        : text.content}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => handleViewText(text)}
                    >
                      <Eye size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteText(text.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Criado em:</span>
                    <span>{formatDate(text.createdAt)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Atualizado em:</span>
                    <span>{formatDate(text.updatedAt)}</span>
                  </div>

                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Palavras: {text.content.split(" ").length}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Clique em "Ver" para analisar palavras dos vaults
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Visualizador de Texto */}
      {selectedText && (
        <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{selectedText.title}</DialogTitle>
            </DialogHeader>
            <TextViewer text={selectedText} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
