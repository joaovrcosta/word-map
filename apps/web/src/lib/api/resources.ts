import { apiRequest } from "./http";

type Request = typeof apiRequest;

export function createResources(request: Request) {
  return {
    registerUser: (data: unknown) => request("POST", "/auth/register", data),
    loginUser: (data: unknown) => request("POST", "/auth/login", data),
    logoutUser: () => request("POST", "/auth/logout"),
    getCurrentUser: async () => {
      const result = await request<{ user: unknown }>("GET", "/auth/me");
      return result?.user ?? null;
    },
    isAuthenticated: async () => {
      const result = await request<{ user: unknown }>("GET", "/auth/me");
      return Boolean(result?.user);
    },
    generateResetCode: (email: string) =>
      request("POST", "/auth/reset-code", { email }),
    verifyResetCode: (email: string, code: string) =>
      request("POST", "/auth/reset-code/verify", { email, code }),
    resetPassword: (email: string, code: string, newPassword: string) =>
      request("POST", "/auth/reset-password", { email, code, newPassword }),

    getVaults: () => request("GET", "/vaults"),
    createVault: (name: string) => request("POST", "/vaults", { name }),
    deleteVault: (vaultId: number) => request("DELETE", `/vaults/${vaultId}`),
    updateVaultName: (vaultId: number, newName: string) =>
      request("PATCH", `/vaults/${vaultId}`, { name: newName }),
    exportVaultWords: async (vaultId: number) => {
      const result = await request<{ data: string }>(
        "GET",
        `/vaults/${vaultId}/export`
      );
      return result.data;
    },
    importWordsToVault: (vaultId: number, importData: string) =>
      request("POST", `/vaults/${vaultId}/import`, { importData }),

    createWord: (data: unknown) => request("POST", "/words", data),
    searchWordInVaults: (searchTerm: string) =>
      request("GET", `/words/search?q=${encodeURIComponent(searchTerm)}`),
    wordExistsInVault: (wordName: string, vaultId: number) =>
      request(
        "GET",
        `/words/exists?name=${encodeURIComponent(wordName)}&vaultId=${vaultId}`
      ),
    moveWordToVault: (wordId: number, newVaultId: number) =>
      request("POST", `/words/${wordId}/move`, { vaultId: newVaultId }),
    unsaveWord: (wordId: number) => request("POST", `/words/${wordId}/unsave`),
    deleteWord: (wordId: number) => request("DELETE", `/words/${wordId}`),
    removeWordFromVault: (wordName: string, vaultId: number, wordId?: number) =>
      request("POST", "/words/remove-from-vault", { wordName, vaultId, wordId }),
    updateWord: (wordId: number, data: unknown) =>
      request("PATCH", `/words/${wordId}`, data),
    linkWords: (wordId1: number, wordId2: number) =>
      request("POST", "/words/link", { wordId1, wordId2 }),
    unlinkWords: (wordId1: number, wordId2: number) =>
      request("POST", "/words/unlink", { wordId1, wordId2 }),
    getRelatedWords: (wordId: number) =>
      request("GET", `/words/${wordId}/related`),
    getLinkableWords: (
      wordId: number,
      currentVaultId?: number,
      useAllVaultsForLinks = false
    ) => {
      const params = new URLSearchParams({
        wordId: String(wordId),
        useAllVaults: String(useAllVaultsForLinks),
      });
      if (currentVaultId) params.set("vaultId", String(currentVaultId));
      return request("GET", `/words/linkable?${params.toString()}`);
    },
    getAllWordRelations: () => request("GET", "/words/relations"),
    checkTextWords: (content: string) =>
      request("POST", "/words/check-text", { content }),
    resolveSelectionSave: (selectedText: string, saveType: string) =>
      request("POST", "/words/resolve-selection", { selectedText, saveType }),
    previewPhrasalCanonical: (selectedText: string) =>
      request("POST", "/words/preview-phrasal", { content: selectedText }),
    incrementWordFrequency: (wordId: number) =>
      request("POST", `/words/${wordId}/frequency`),

    createText: (title: string, content: string) =>
      request("POST", "/texts", { title, content }),
    getTextById: (textId: number) => request("GET", `/texts/${textId}`),
    getUserTexts: () => request("GET", "/texts"),
    updateText: (textId: number, title: string, content: string) =>
      request("PATCH", `/texts/${textId}`, { title, content }),
    deleteText: (textId: number) => request("DELETE", `/texts/${textId}`),

    createSemanticConnection: (data: unknown) =>
      request("POST", "/connections", data),
    getSemanticConnections: () => request("GET", "/connections"),
    updateSemanticConnection: (connectionId: number, data: unknown) =>
      request("PATCH", `/connections/${connectionId}`, data),
    deleteSemanticConnection: (connectionId: number) =>
      request("DELETE", `/connections/${connectionId}`),

    listWordOrigins: (wordId: number) =>
      request("GET", `/words/${wordId}/origins`),
    recordWordOrigin: (input: { wordId?: number; wordName: string }) =>
      request("POST", `/words/${input.wordId ?? 0}/origins`, input),

    getPassageExplanation: (span: string, sentence: string) => {
      const params = new URLSearchParams({ span, sentence });
      return request("GET", `/tutor/passages?${params.toString()}`);
    },

    getUserSettings: () => request("GET", "/users/settings"),
    upsertUserSettings: (updates: unknown) =>
      request("PUT", "/users/settings", updates),
    getUserStats: () => request("GET", "/users/stats"),

    createBook: (title: string, description?: string) =>
      request("POST", "/books", { title, description }),
    createOfficialBook: (title: string, description?: string) =>
      request("POST", "/books/official", { title, description }),
    updateBook: (bookId: number, title: string, description?: string) =>
      request("PATCH", `/books/${bookId}`, { title, description }),
    deleteBook: (bookId: number) => request("DELETE", `/books/${bookId}`),
    listOfficialBooks: () => request("GET", "/books/official"),
    listMyBooks: () => request("GET", "/books/mine"),
    listLibraryBooks: () => request("GET", "/books/library"),
    addBookToLibrary: (bookId: number) =>
      request("POST", `/books/${bookId}/library`),
    removeFromLibrary: (bookId: number) =>
      request("DELETE", `/books/${bookId}/library`),
    addChapter: (bookId: number, title: string, content: string) =>
      request("POST", `/books/${bookId}/chapters`, { title, content }),
    updateChapter: (chapterId: number, title: string, content: string) =>
      request("PATCH", `/chapters/${chapterId}`, { title, content }),
    deleteChapter: (chapterId: number) =>
      request("DELETE", `/chapters/${chapterId}`),
    reorderChapters: (bookId: number, chapterIds: number[]) =>
      request("POST", `/books/${bookId}/chapters/reorder`, { chapterIds }),
    getBookById: (bookId: number) => request("GET", `/books/${bookId}`),
    getChapterById: (chapterId: number) =>
      request("GET", `/chapters/${chapterId}`),
    getReadingProgress: (chapterId: number) =>
      request("GET", `/chapters/${chapterId}/progress`),
    saveReadingProgress: (
      chapterId: number,
      pageIndex: number,
      paragraphIndex: number
    ) =>
      request("PUT", `/chapters/${chapterId}/progress`, {
        pageIndex,
        paragraphIndex,
      }),

    createSentence: (data: unknown) => request("POST", "/sentences", data),
    getUserSentences: () => request("GET", "/sentences"),
    getSentenceById: (sentenceId: number) =>
      request("GET", `/sentences/${sentenceId}`),
    updateSentence: (sentenceId: number, data: unknown) =>
      request("PATCH", `/sentences/${sentenceId}`, data),
    deleteSentence: (sentenceId: number) =>
      request("DELETE", `/sentences/${sentenceId}`),
    getWordsForSentenceBuilder: () => request("GET", "/sentences/words"),

    getFlashcardWords: (vaultId: number) =>
      request("GET", `/flashcards/vaults/${vaultId}/words`),
    getVaultForFlashcards: (vaultId: number) =>
      request("GET", `/flashcards/vaults/${vaultId}`),
    updateWordProgress: (
      wordId: number,
      confidence: number,
      reviewCount: number
    ) =>
      request("POST", `/flashcards/words/${wordId}/progress`, {
        confidence,
        reviewCount,
      }),
    recordChallengeResult: (
      wordId: number,
      correct: boolean,
      challenge: string
    ) =>
      request("POST", `/flashcards/words/${wordId}/result`, {
        correct,
        challenge,
      }),
    createFlashcardSession: (vaultId: number) =>
      request("POST", "/flashcards/sessions", { vaultId }),
    calculateNextReview: (
      currentConfidence: number,
      reviewCount: number,
      easeFactor?: number
    ) =>
      request("POST", "/flashcards/schedule", {
        currentConfidence,
        reviewCount,
        easeFactor,
      }),
    filterWordsForReview: (words: unknown) =>
      request("POST", "/flashcards/filter", { words }),
  };
}

export const browserApi = createResources(apiRequest);
