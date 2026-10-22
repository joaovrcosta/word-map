import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { brand } from "@word-map/design-tokens";
import { normalizeGrammaticalClass, type DictionaryEntry } from "@word-map/shared";
import { useSession } from "../../../src/session";
import { speakWord } from "../../../src/speech";
import { useTheme } from "../../../src/theme";
import {
  classLabel,
  GRAMMATICAL_CLASSES,
  type Vault,
  type Word,
} from "../../../src/types";
import { ReadingWordMenu, type SavedReadingWord } from "../../../src/features/reading/word-menu";
import { ErrorText, Field, Heading, Loading, Muted, PrimaryButton, Screen } from "../../../src/ui";

const novaWordIcon = require("../../../assets/icons/nova-word.png");
const LEVELS = [brand.level1, brand.level2, brand.level3, brand.level4];

type Draft = {
  id: number | null;
  name: string;
  translation: string;
  grammaticalClass: string;
  confidence: number;
};

function blankDraft(): Draft {
  return { id: null, name: "", translation: "", grammaticalClass: "substantivo", confidence: 1 };
}

function savedFromWord(word: Word, vaultName: string): SavedReadingWord {
  return {
    id: word.id,
    name: word.name,
    vaultId: word.vaultId,
    vaultName,
    translations: word.translations,
    grammaticalClass: word.grammaticalClass,
    confidence: word.confidence,
    notes: word.notes ?? null,
  };
}

function askConfirm(title: string, message: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
      { text: "Remover", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

export default function VaultDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { request } = useSession();
  const params = useLocalSearchParams<{ id: string }>();
  const vaultId = Number(params.id);
  const [vault, setVault] = useState<Vault | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [opened, setOpened] = useState<Word | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const words = useMemo(() => {
    if (!vault) return [];
    const term = query.trim().toLowerCase();
    if (!term) return vault.words;
    return vault.words.filter(
      (word) =>
        word.name.toLowerCase().includes(term) ||
        word.translations.some((item) => item.toLowerCase().includes(term))
    );
  }, [vault, query]);

  const load = useCallback(async () => {
    try {
      const vaults = await request<Vault[]>("/vaults");
      const found = vaults.find((item) => item.id === vaultId) ?? null;
      setVault(found);
      setMissing(!found);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o vault");
    }
  }, [request, vaultId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const saveWord = async () => {
    if (!draft || !draft.name.trim() || !vault) return;
    const translations = draft.translation
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    setSaving(true);
    setError(null);
    try {
      if (draft.id == null) {
        await request("/words", {
          method: "POST",
          body: JSON.stringify({
            name: draft.name.trim(),
            grammaticalClass: draft.grammaticalClass,
            translations,
            confidence: draft.confidence,
            vaultId: vault.id,
            isSaved: true,
          }),
        });
      } else {
        await request(`/words/${draft.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: draft.name.trim(),
            grammaticalClass: draft.grammaticalClass,
            translations,
            confidence: draft.confidence,
          }),
        });
      }
      setDraft(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a palavra");
    } finally {
      setSaving(false);
    }
  };

  const removeWord = async (word: Word) => {
    const confirmed = await askConfirm("Remover palavra", `Remover “${word.name}” deste vault?`);
    if (!confirmed) return;
    try {
      await request("/words/remove-from-vault", {
        method: "POST",
        body: JSON.stringify({ wordName: word.name, vaultId, wordId: word.id }),
      });
      setDraft(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível remover a palavra");
    }
  };

  const openDraft = (next: Draft) => {
    setSuggestError(null);
    setSuggesting(false);
    setDraft(next);
  };

  const suggestWithAi = async () => {
    const word = draft?.name.trim();
    if (!draft || !word || suggesting) return;
    setSuggesting(true);
    setSuggestError(null);
    try {
      const [suggestResult, dictionaryResult] = await Promise.all([
        request<{ translation?: string }>("/tutor/suggest-translation", {
          method: "POST",
          body: JSON.stringify({ word }),
        }).catch(() => null),
        request<{ entry?: DictionaryEntry | null; entries?: DictionaryEntry[] }>(
          `/dictionary?word=${encodeURIComponent(word)}`
        ).catch(() => null),
      ]);

      const translation = suggestResult?.translation?.trim() ?? "";
      const entry = dictionaryResult?.entry ?? dictionaryResult?.entries?.[0] ?? null;
      const grammaticalClass = normalizeGrammaticalClass(entry?.meanings?.[0]?.partOfSpeech);

      if (!translation && !entry) {
        throw new Error("Não foi possível sugerir tradução e classe.");
      }

      setDraft((current) =>
        current
          ? {
              ...current,
              translation: translation || current.translation,
              grammaticalClass: entry ? grammaticalClass : current.grammaticalClass,
            }
          : current
      );

      if (!translation) {
        setSuggestError("Classe sugerida. A tradução da IA não ficou disponível.");
      }
    } catch (cause) {
      setSuggestError(
        cause instanceof Error ? cause.message : "Não foi possível sugerir com IA."
      );
    } finally {
      setSuggesting(false);
    }
  };

  if (!vault && !missing && !error) return <Loading />;

  const wordCount = vault?.words.length ?? 0;
  const wordLabel = wordCount === 1 ? "palavra" : "palavras";

  return (
    <Screen>
      <Pressable onPress={() => router.back()} hitSlop={8}>
        <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.semibold, marginBottom: 8 }}>
          Voltar
        </Text>
      </Pressable>

      {error ? <ErrorText>{error}</ErrorText> : null}
      {missing ? <Muted>Este vault não está mais disponível.</Muted> : null}

      {vault && wordCount === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Heading>Praticar palavras</Heading>
              <Muted>
                {vault.name} ainda não tem palavras. Adicione a primeira para começar a praticar.
              </Muted>
            </View>
            <Image source={novaWordIcon} style={{ width: 88, height: 88 }} resizeMode="contain" />
          </View>
          <PrimaryButton label="Nova palavra" onPress={() => openDraft(blankDraft())} />
        </View>
      ) : null}

      {vault && wordCount > 0 ? (
        <FlatList
          data={words}
          keyExtractor={(item) => String(item.id)}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ paddingBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
                <View style={{ flex: 1, paddingTop: 4 }}>
                  <Text
                    style={{
                      color: theme.shell.foreground,
                      fontFamily: theme.fonts.bold,
                      fontSize: 28,
                      lineHeight: 34,
                    }}
                  >
                    Praticar palavras
                  </Text>
                  <Text
                    style={{
                      marginTop: 10,
                      color: theme.shell.muted,
                      fontFamily: theme.fonts.regular,
                      fontSize: 16,
                      lineHeight: 24,
                    }}
                  >
                    Você tem{" "}
                    <Text style={{ color: theme.shell.mascot.accent, fontFamily: theme.fonts.bold }}>
                      {wordCount} {wordLabel}
                    </Text>{" "}
                    em “{vault.name}”. Vamos começar?
                  </Text>
                </View>
                <Image source={novaWordIcon} style={{ width: 92, height: 92 }} resizeMode="contain" />
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/flashcards/${vault.id}` as Href)}
                style={{
                  marginTop: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 16,
                  borderRadius: 20,
                  backgroundColor: theme.shell.tones.green,
                }}
              >
                <Text
                  style={{
                    color: theme.shell.onPastel,
                    fontFamily: theme.fonts.bold,
                    fontSize: 17,
                  }}
                >
                  {`Praticar ${wordCount} ${wordLabel}`}
                </Text>
              </Pressable>

              <Field
                value={query}
                onChangeText={setQuery}
                placeholder="Pesquisar palavra"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View
                style={{
                  marginTop: 22,
                  marginBottom: 4,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    color: theme.shell.foreground,
                    fontFamily: theme.fonts.bold,
                    fontSize: 20,
                  }}
                >
                  Minhas {wordCount} {wordCount === 1 ? "Palavra" : "Palavras"}
                </Text>
                <Pressable
                  accessibilityLabel="Nova palavra"
                  onPress={() => openDraft(blankDraft())}
                  hitSlop={8}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.shell.chip,
                  }}
                >
                  <Ionicons name="add" size={24} color={theme.shell.foreground} />
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            <Muted>Nenhuma palavra encontrada.</Muted>
          }
          renderItem={({ item }) => {
            const level = Math.min(4, Math.max(1, item.confidence || 1));
            const translation = item.translations.filter(Boolean).join(", ");
            return (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.shell.line,
                  paddingVertical: 16,
                }}
              >
                <Pressable
                  accessibilityLabel={`Ouvir ${item.name}`}
                  onPress={() => speakWord(item.name)}
                  hitSlop={8}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.shell.chip,
                  }}
                >
                  <Ionicons name="volume-medium" size={22} color={theme.colors.green} />
                </Pressable>
                <Pressable onPress={() => setOpened(item)} style={{ flex: 1 }}>
                  <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 18 }}>
                    {item.name}
                  </Text>
                  <Text
                    style={{
                      color: theme.shell.muted,
                      fontFamily: theme.fonts.regular,
                      marginTop: 3,
                      fontSize: 14,
                    }}
                  >
                    {translation || classLabel(item.grammaticalClass)}
                  </Text>
                </Pressable>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: LEVELS[level - 1],
                  }}
                >
                  <Text
                    style={{
                      color: level === 3 ? "#3c3c3c" : "#ffffff",
                      fontFamily: theme.fonts.bold,
                      fontSize: 13,
                    }}
                  >
                    {level}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      ) : null}

      {vault && opened ? (
        <ReadingWordMenu
          clean={opened.name}
          anchor={{ x: 0, y: 0, width: 0, height: 0 }}
          sourceText=""
          chapterContent=""
          pages={[]}
          pageIndex={0}
          bookTitle=""
          saved={savedFromWord(opened, vault.name)}
          vaults={[vault]}
          full
          onClose={() => setOpened(null)}
          onChanged={load}
        />
      ) : null}
      <Modal animationType="slide" transparent visible={draft != null} onRequestClose={() => setDraft(null)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" }}
            onPress={() => {
              if (!saving) setDraft(null);
            }}
          >
            <Pressable
              onPress={(event) => event.stopPropagation()}
              style={{
                backgroundColor: theme.shell.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: "92%",
                paddingBottom: Math.max(insets.bottom, 16),
              }}
            >
              <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}>
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.shell.line,
                  }}
                />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 20,
                  paddingTop: 8,
                  paddingBottom: 4,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    color: theme.shell.foreground,
                    fontFamily: theme.fonts.bold,
                    fontSize: 22,
                  }}
                >
                  {draft?.id == null ? "Nova palavra" : "Editar palavra"}
                </Text>
                <Pressable
                  accessibilityLabel="Fechar"
                  disabled={saving}
                  onPress={() => setDraft(null)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.shell.chip,
                  }}
                >
                  <Ionicons name="close" size={18} color={theme.shell.foreground} />
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Field
                      value={draft?.name ?? ""}
                      onChangeText={(name) => {
                        setSuggestError(null);
                        setDraft((current) => (current ? { ...current, name } : current));
                      }}
                      placeholder="Palavra"
                      autoCapitalize="none"
                      autoFocus={draft?.id == null}
                    />
                  </View>
                  <Pressable
                    accessibilityLabel="Sugerir tradução e classe com IA"
                    disabled={!draft?.name.trim() || suggesting || saving}
                    onPress={() => void suggestWithAi()}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      marginBottom: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.shell.chip,
                      opacity: !draft?.name.trim() || suggesting || saving ? 0.4 : 1,
                    }}
                  >
                    {suggesting ? (
                      <ActivityIndicator size="small" color={theme.shell.tones.lilac} />
                    ) : (
                      <Ionicons name="sparkles" size={22} color={theme.shell.tones.lilac} />
                    )}
                  </Pressable>
                </View>
                <Field
                  value={draft?.translation ?? ""}
                  onChangeText={(translation) =>
                    setDraft((current) => (current ? { ...current, translation } : current))
                  }
                  placeholder="Tradução"
                  editable={!suggesting}
                />
                {suggestError ? (
                  <Text
                    style={{
                      marginTop: 8,
                      color: theme.colors.destructive,
                      fontFamily: theme.fonts.regular,
                      fontSize: 13,
                    }}
                  >
                    {suggestError}
                  </Text>
                ) : null}
                {suggesting ? (
                  <Text
                    style={{
                      marginTop: 8,
                      color: theme.shell.muted,
                      fontFamily: theme.fonts.regular,
                      fontSize: 13,
                    }}
                  >
                    Sugerindo tradução e classe…
                  </Text>
                ) : null}

                <Text
                  style={{
                    marginTop: 20,
                    color: theme.shell.muted,
                    fontFamily: theme.fonts.semibold,
                    fontSize: 13,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                  }}
                >
                  Classe
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  {GRAMMATICAL_CLASSES.map(([value, label]) => {
                    const selected = draft?.grammaticalClass === value;
                    return (
                      <Pressable
                        key={value}
                        onPress={() =>
                          setDraft((current) => (current ? { ...current, grammaticalClass: value } : current))
                        }
                        style={{
                          backgroundColor: selected ? theme.shell.chipActive : theme.shell.chip,
                          borderRadius: 999,
                          paddingHorizontal: 14,
                          paddingVertical: 9,
                        }}
                      >
                        <Text
                          style={{
                            color: selected ? theme.shell.chipActiveText : theme.shell.chipText,
                            fontFamily: theme.fonts.semibold,
                            fontSize: 13,
                          }}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text
                  style={{
                    marginTop: 20,
                    color: theme.shell.muted,
                    fontFamily: theme.fonts.semibold,
                    fontSize: 13,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                  }}
                >
                  Confiança
                </Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                  {LEVELS.map((color, index) => {
                    const level = index + 1;
                    const selected = draft?.confidence === level;
                    return (
                      <Pressable
                        key={color}
                        onPress={() =>
                          setDraft((current) => (current ? { ...current, confidence: level } : current))
                        }
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: color,
                          borderWidth: selected ? 2 : 0,
                          borderColor: theme.shell.foreground,
                          transform: [{ scale: selected ? 1.05 : 1 }],
                        }}
                      >
                        <Text
                          style={{
                            color: level === 3 ? "#3c3c3c" : "#ffffff",
                            fontFamily: theme.fonts.bold,
                            fontSize: 15,
                          }}
                        >
                          {level}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={saving || !draft?.name.trim()}
                  onPress={() => void saveWord()}
                  style={{
                    marginTop: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 16,
                    borderRadius: 20,
                    backgroundColor: theme.shell.tones.green,
                    opacity: saving || !draft?.name.trim() ? 0.55 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: theme.shell.onPastel,
                      fontFamily: theme.fonts.bold,
                      fontSize: 17,
                    }}
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </Text>
                </Pressable>

                {draft?.id != null ? (
                  <Pressable
                    onPress={() => {
                      const word = vault?.words.find((item) => item.id === draft.id);
                      if (word) void removeWord(word);
                    }}
                    style={{ alignItems: "center", marginTop: 16 }}
                  >
                    <Text style={{ color: theme.colors.destructive, fontFamily: theme.fonts.semibold }}>
                      Remover
                    </Text>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={() => setDraft(null)}
                  disabled={saving}
                  style={{ alignItems: "center", marginTop: 14, marginBottom: 4 }}
                >
                  <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.semibold }}>
                    Cancelar
                  </Text>
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
