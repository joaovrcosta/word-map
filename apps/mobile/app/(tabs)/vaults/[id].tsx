import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { brand } from "@word-map/design-tokens";
import { useSession } from "../../../src/session";
import { useTheme } from "../../../src/theme";
import {
  classLabel,
  GRAMMATICAL_CLASSES,
  type Vault,
  type Word,
} from "../../../src/types";
import { ReadingWordMenu, type SavedReadingWord } from "../../../src/features/reading/word-menu";
import { ErrorText, Field, Heading, Loading, Muted, PrimaryButton, Screen } from "../../../src/ui";

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

  if (!vault && !missing && !error) return <Loading />;

  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.semibold, marginBottom: 8 }}>
          Voltar
        </Text>
      </Pressable>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Heading>{vault?.name ?? "Vault"}</Heading>
        {vault ? (
          <Pressable onPress={() => setDraft(blankDraft())}>
            <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.bold, fontSize: 16 }}>
              Nova
            </Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {missing ? <Muted>Este vault não está mais disponível.</Muted> : null}
      {vault && vault.words.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Muted>Nenhuma palavra ainda.</Muted>
          <PrimaryButton label="Nova palavra" onPress={() => setDraft(blankDraft())} />
        </View>
      ) : null}
      {vault && vault.words.length > 0 ? (
        <Field
          value={query}
          onChangeText={setQuery}
          placeholder="Pesquisar palavra"
          autoCapitalize="none"
          autoCorrect={false}
        />
      ) : null}
      {vault && vault.words.length > 0 && words.length === 0 ? (
        <Muted>Nenhuma palavra encontrada.</Muted>
      ) : null}
      {vault && words.length > 0 ? (
        <FlatList
          data={words}
          keyExtractor={(item) => String(item.id)}
          style={{ marginTop: 8, flex: 1 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const level = Math.min(4, Math.max(1, item.confidence || 1));
            const translation = item.translations.filter(Boolean).join(", ");
            return (
              <Pressable
                onPress={() => setOpened(item)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                  paddingVertical: 14,
                }}
              >
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
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 17 }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.regular, marginTop: 2 }}>
                    {translation || classLabel(item.grammaticalClass)}
                  </Text>
                </View>
              </Pressable>
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
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
              maxHeight: "90%",
            }}
          >
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Heading>{draft?.id == null ? "Nova palavra" : "Editar palavra"}</Heading>
            <Field
              value={draft?.name ?? ""}
              onChangeText={(name) => setDraft((current) => (current ? { ...current, name } : current))}
              placeholder="Palavra"
              autoCapitalize="none"
            />
            <Field
              value={draft?.translation ?? ""}
              onChangeText={(translation) =>
                setDraft((current) => (current ? { ...current, translation } : current))
              }
              placeholder="Tradução"
            />
            <Text
              style={{
                marginTop: 16,
                color: theme.colors.mutedForeground,
                fontFamily: theme.fonts.semibold,
              }}
            >
              Classe
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {GRAMMATICAL_CLASSES.map(([value, label]) => {
                const selected = draft?.grammaticalClass === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() =>
                      setDraft((current) => (current ? { ...current, grammaticalClass: value } : current))
                    }
                    style={{
                      borderWidth: 1,
                      borderColor: selected ? theme.colors.green : theme.colors.border,
                      backgroundColor: selected ? theme.colors.greenSoft : theme.colors.background,
                      borderRadius: theme.radii.md,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? theme.colors.greenText : theme.colors.foreground,
                        fontFamily: theme.fonts.semibold,
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
                marginTop: 16,
                color: theme.colors.mutedForeground,
                fontFamily: theme.fonts.semibold,
              }}
            >
              Confiança
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {LEVELS.map((color, index) => {
                const level = index + 1;
                const selected = draft?.confidence === level;
                return (
                  <Pressable
                    key={color}
                    onPress={() => setDraft((current) => (current ? { ...current, confidence: level } : current))}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: color,
                      borderWidth: selected ? 2 : 0,
                      borderColor: theme.colors.foreground,
                    }}
                  >
                    <Text style={{ color: level === 3 ? "#3c3c3c" : "#ffffff", fontFamily: theme.fonts.bold }}>
                      {level}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <PrimaryButton
              label={saving ? "Salvando..." : "Salvar"}
              disabled={saving || !draft?.name.trim()}
              onPress={() => void saveWord()}
            />
            {draft?.id != null ? (
              <Pressable
                onPress={() => {
                  const word = vault?.words.find((item) => item.id === draft.id);
                  if (word) void removeWord(word);
                }}
                style={{ alignItems: "center", marginTop: 14 }}
              >
                <Text style={{ color: theme.colors.destructive, fontFamily: theme.fonts.semibold }}>
                  Remover
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setDraft(null)} style={{ alignItems: "center", marginTop: 14, marginBottom: 8 }}>
              <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.semibold }}>
                Cancelar
              </Text>
            </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
