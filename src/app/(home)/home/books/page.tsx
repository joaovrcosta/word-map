"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Store, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCurrentUser } from "@/actions/auth";
import {
  addBookToLibrary,
  deleteBook,
  listLibraryBooks,
  listMyBooks,
  listOfficialBooks,
  removeFromLibrary,
  type BookListItem,
} from "@/actions/books";
import { BooksOnboarding } from "@/components/books-onboarding";
import { cn } from "@/lib/utils";
import { CreateBookForm } from "./create-book-form";

type Tab = "store" | "mine";

export default function BooksPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("mine");
  const [officialBooks, setOfficialBooks] = useState<BookListItem[]>([]);
  const [myBooks, setMyBooks] = useState<BookListItem[]>([]);
  const [libraryBooks, setLibraryBooks] = useState<BookListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createOfficial, setCreateOfficial] = useState(false);

  const fetchBooks = async () => {
    try {
      setIsLoading(true);
      const [official, mine, library] = await Promise.all([
        listOfficialBooks(),
        listMyBooks(),
        listLibraryBooks(),
      ]);
      setOfficialBooks(official);
      setMyBooks(mine);
      setLibraryBooks(library);
    } catch (error) {
      console.error("Erro ao buscar livros:", error);
      setOfficialBooks([]);
      setMyBooks([]);
      setLibraryBooks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
    getCurrentUser().then((user) => {
      if (user?.name) {
        setFirstName(user.name.split(" ")[0]);
      }
      setIsAdmin(user?.role === "ADMIN");
    });
  }, []);

  const handleAddToLibrary = async (bookId: number) => {
    try {
      await addBookToLibrary(bookId);
      await fetchBooks();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar o livro."
      );
    }
  };

  const handleRemoveFromLibrary = async (bookId: number) => {
    try {
      await removeFromLibrary(bookId);
      await fetchBooks();
    } catch {
      alert("Não foi possível remover o livro da biblioteca.");
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    if (!confirm("Tem certeza que deseja excluir este livro?")) return;
    try {
      await deleteBook(bookId);
      await fetchBooks();
    } catch {
      alert("Não foi possível excluir o livro. Tente novamente.");
    }
  };

  const tabClass = (tab: Tab) =>
    cn(
      "py-3 text-[13px] font-extrabold uppercase tracking-wide border-b-4 transition-colors",
      activeTab === tab
        ? "border-[#1cb0f6] text-[#1cb0f6]"
        : "border-transparent text-[#afafaf] hover:text-[#777]"
    );

  const mineEmpty = myBooks.length === 0 && libraryBooks.length === 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1cb0f6] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando livros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white dark:bg-gray-950 max-w-full overflow-x-hidden">
      <div className="px-8 pt-5">
        <div className="flex items-center gap-3">
          <span className="text-[26px] leading-none" aria-hidden="true">
            📚
          </span>
          <h1 className="text-[26px] font-extrabold text-[#3c3c3c] dark:text-white">
            Livros
          </h1>
        </div>
        <nav className="mt-4 flex gap-8 border-b border-[#e5e5e5] dark:border-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab("store")}
            className={tabClass("store")}
          >
            Loja
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mine")}
            className={tabClass("mine")}
          >
            Meus livros
          </button>
        </nav>
      </div>

      <div className="px-6">
        {activeTab === "store" && (
          <div className="py-6 space-y-6">
            <div className="flex justify-end">
              {isAdmin && (
                <Button
                  onClick={() => {
                    setCreateOfficial(true);
                    setCreateOpen(true);
                  }}
                >
                  <Plus size={20} className="mr-2" />
                  Novo livro oficial
                </Button>
              )}
            </div>

            {officialBooks.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Store className="size-12 text-[#1cb0f6]" />
                <p className="mt-4 text-[15px] font-bold text-[#3c3c3c]">
                  A loja ainda não tem livros
                </p>
                <p className="mt-1 text-sm text-[#777]">
                  {isAdmin
                    ? "Publique o primeiro livro oficial para os leitores."
                    : "Volte mais tarde para adicionar livros oficiais à sua biblioteca."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {officialBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onOpen={async () => {
                      if (!book.inLibrary && !isAdmin) {
                        await handleAddToLibrary(book.id);
                      }
                      router.push(`/home/books/${book.id}`);
                    }}
                    action={
                      book.inLibrary ? (
                        <span className="text-xs font-extrabold uppercase tracking-wide text-[#58cc02]">
                          Na biblioteca
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAddToLibrary(book.id)}
                        >
                          Adicionar à biblioteca
                        </Button>
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "mine" &&
          (mineEmpty ? (
            <BooksOnboarding
              firstName={firstName}
              onCreateBook={() => {
                setCreateOfficial(false);
                setCreateOpen(true);
              }}
              onOpenStore={() => setActiveTab("store")}
            />
          ) : (
            <div className="py-6 space-y-8">
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setCreateOfficial(false);
                    setCreateOpen(true);
                  }}
                >
                  <Plus size={20} className="mr-2" />
                  Novo livro
                </Button>
              </div>

              {myBooks.length > 0 && (
                <section>
                  <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-[#afafaf]">
                    Criados por mim
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myBooks.map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onOpen={() => router.push(`/home/books/${book.id}`)}
                        action={
                          <button
                            type="button"
                            className="size-8 rounded-full text-red-500 hover:bg-red-50"
                            onClick={() => handleDeleteBook(book.id)}
                            aria-label="Excluir livro"
                          >
                            <Trash2 size={16} className="mx-auto" />
                          </button>
                        }
                      />
                    ))}
                  </div>
                </section>
              )}

              {libraryBooks.length > 0 && (
                <section>
                  <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-[#afafaf]">
                    Biblioteca
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {libraryBooks.map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onOpen={() => router.push(`/home/books/${book.id}`)}
                        action={
                          <button
                            type="button"
                            className="text-xs font-extrabold uppercase tracking-wide text-red-500 hover:underline"
                            onClick={() => handleRemoveFromLibrary(book.id)}
                          >
                            Remover
                          </button>
                        }
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {createOfficial ? "Novo livro oficial" : "Criar novo livro"}
            </DialogTitle>
          </DialogHeader>
          <CreateBookForm
            official={createOfficial}
            onSuccess={(bookId) => {
              setCreateOpen(false);
              router.push(`/home/books/${bookId}`);
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BookCard({
  book,
  onOpen,
  action,
}: {
  book: BookListItem;
  onOpen: () => void;
  action: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 hover:border-[#1cb0f6]/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpen} className="text-left min-w-0">
          <h2 className="text-lg font-extrabold text-[#3c3c3c] dark:text-white">
            {book.title}
          </h2>
        </button>
        <div className="shrink-0">{action}</div>
      </div>
      {book.description && (
        <p className="mt-2 text-sm text-[#777] line-clamp-3">{book.description}</p>
      )}
      <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#afafaf]">
        <BookOpen size={14} />
        <span>
          {book.chapterCount} capítulo{book.chapterCount === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
