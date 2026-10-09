"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Text, getUserTexts, deleteText } from "@/actions/actions";
import { getCurrentUser } from "@/actions/auth";
import { CreateTextForm } from "./create-text-form";
import { TextsOnboarding } from "@/components/texts-onboarding";
import { cn } from "@/lib/utils";

export default function TextsPage() {
  const router = useRouter();
  const [texts, setTexts] = useState<Text[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoadingTexts, setIsLoadingTexts] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [activeTab, setActiveTab] = useState<"texts" | "report">("texts");

  const fetchTexts = async () => {
    try {
      setIsLoadingTexts(true);
      const textsData = await getUserTexts();
      setTexts(textsData);
    } catch (error) {
      console.error("Erro ao buscar textos:", error);
      setTexts([]);
    } finally {
      setIsLoadingTexts(false);
    }
  };

  useEffect(() => {
    fetchTexts();
    getCurrentUser().then((user) => {
      if (user?.name) {
        setFirstName(user.name.split(" ")[0]);
      }
    });
  }, []);

  const handleDeleteText = async (textId: number) => {
    if (!confirm("Tem certeza que deseja excluir este texto?")) return;

    try {
      await deleteText(textId);
      setTexts((prev) => prev.filter((text) => text.id !== textId));
    } catch (error) {
      console.error("Erro ao excluir texto:", error);
      alert("Não foi possível excluir o texto. Tente novamente.");
    }
  };

  const handleTextCreated = async () => {
    setIsCreateDialogOpen(false);
    await fetchTexts();
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  const tabClass = (tab: typeof activeTab) =>
    cn(
      "py-3 text-[13px] font-extrabold uppercase tracking-wide border-b-4 transition-colors",
      activeTab === tab
        ? "border-[#1cb0f6] text-[#1cb0f6]"
        : "border-transparent text-[#afafaf] hover:text-[#777]"
    );

  const totalWords = texts.reduce(
    (sum, text) => sum + text.content.split(/\s+/).filter(Boolean).length,
    0
  );

  if (isLoadingTexts) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1cb0f6] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando textos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white dark:bg-gray-950 max-w-full overflow-x-hidden">
      <div className="px-8 pt-5">
        <div className="flex items-center gap-3">
          <span className="text-[26px] leading-none" aria-hidden="true">
            📄
          </span>
          <h1 className="text-[26px] font-extrabold text-[#3c3c3c] dark:text-white">
            Textos
          </h1>
        </div>
        <nav className="mt-4 flex gap-8 border-b border-[#e5e5e5] dark:border-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab("texts")}
            className={tabClass("texts")}
          >
            Textos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("report")}
            className={tabClass("report")}
          >
            Relatório
          </button>
        </nav>
      </div>

      <div className="px-6">
        {activeTab === "texts" &&
          (texts.length === 0 ? (
            <TextsOnboarding
              firstName={firstName}
              onCreateText={() => setIsCreateDialogOpen(true)}
            />
          ) : (
            <div className="py-6 space-y-6">
              <div className="flex justify-end">
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus size={20} className="mr-2" />
                  Novo texto
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {texts.map((text) => (
                  <div
                    key={text.id}
                    className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 hover:border-[#1cb0f6]/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-lg font-extrabold text-[#3c3c3c] dark:text-white">
                        {text.title}
                      </h2>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          className="size-8 rounded-full text-[#1cb0f6] hover:bg-[#ddf4ff]"
                          onClick={() =>
                            router.push(`/home/texts/${text.id}`)
                          }
                          aria-label="Ver texto"
                        >
                          <Eye size={16} className="mx-auto" />
                        </button>
                        <button
                          type="button"
                          className="size-8 rounded-full text-red-500 hover:bg-red-50"
                          onClick={() => handleDeleteText(text.id)}
                          aria-label="Excluir texto"
                        >
                          <Trash2 size={16} className="mx-auto" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-[#777] line-clamp-3">
                      {text.content}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-[#afafaf]">
                      <span>
                        {text.content.split(/\s+/).filter(Boolean).length}{" "}
                        palavras
                      </span>
                      <span>{formatDate(text.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

        {activeTab === "report" && (
          <div className="max-w-3xl mx-auto py-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border-2 border-[#e5e5e5] p-6">
              <p className="text-sm font-bold text-[#777]">Total de textos</p>
              <p className="mt-1 text-3xl font-extrabold text-[#3c3c3c]">
                {texts.length}
              </p>
            </div>
            <div className="rounded-2xl border-2 border-[#e5e5e5] p-6">
              <p className="text-sm font-bold text-[#777]">Palavras salvas</p>
              <p className="mt-1 text-3xl font-extrabold text-[#3c3c3c]">
                {totalWords}
              </p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
  );
}
