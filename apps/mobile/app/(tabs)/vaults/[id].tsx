import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { normalizeGrammaticalClass, type DictionaryEntry } from "@word-map/shared";
import type { LearningStatusId } from "@word-map/shared/fsrs-schedule";
import { useSession } from "../../../src/session";
import { speakWord } from "../../../src/speech";
import { useTheme } from "../../../src/theme";
import {
  classLabel,
  GRAMMATICAL_CLASSES,
  type Vault,
  type Word,
} from "../../../src/types";
import {
  LearningStatusChooser,
  LearningStatusTag,
  statusIdFromWord,
} from "../../../src/features/learning/learning-status-tag";
import { ReadingWordMenu, type SavedReadingWord } from "../../../src/features/reading/word-menu";
import { AddWordSearchSheet } from "../../../src/features/vaults/add-word-search-sheet";
import { LearningProgressLink } from "../../../src/features/vaults/learning-progress";
import { ErrorText, Field, Heading, Loading, Muted, PrimaryButton, Screen } from "../../../src/ui";

function confidenceFromStatus(status: LearningStatusId): number {
  if (status === "new" || status === "learning") return 1;
  if (status === "relearning") return 2;
  if (status === "reviewing") return 3;
  return 4;
}

const VAULT_ACCENTS = ["#4B7BFF", "#9B5CFF", "#FF4B6A", "#24c875", "#FF9600", "#00C2A8"] as const;

function vaultAccent(id: number) {
  return VAULT_ACCENTS[Math.abs(id) % VAULT_ACCENTS.length] ?? VAULT_ACCENTS[0];
}

function mixHex(hex: string, toward: number, amount: number) {
  const raw = hex.replace("#", "");
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const mix = (channel: number) =>
    Math.round(channel + (toward - channel) * Math.min(1, Math.max(0, amount)));
  const to = (channel: number) => mix(channel).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function accentSoft(hex: string, alpha: number) {
  const raw = hex.replace("#", "");
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

type Draft = {
  id: number | null;
  name: string;
  translation: string;
  grammaticalClass: string;
  status: LearningStatusId;
};

function blankDraft(): Draft {
  return { id: null, name: "", translation: "", grammaticalClass: "substantivo", status: "new" };
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [addSearchOpen, setAddSearchOpen] = useState(false);
  const [vaultEditor, setVaultEditor] = useState<{ name: string; isPublic: boolean } | null>(null);
  const [savingVault, setSavingVault] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const words = useMemo(() => {
    if (!vault) return [];
    const term = query.trim().toLowerCase();
    let list = vault.words;
    if (term) {
      list = list.filter(
        (word) =>
          word.name.toLowerCase().includes(term) ||
          word.translations.some((item) => item.toLowerCase().includes(term))
      );
    }
    return [...list].sort((left, right) => {
      const cmp = left.name.localeCompare(right.name, "pt");
      return sortAsc ? cmp : -cmp;
    });
  }, [vault, query, sortAsc]);

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
      const confidence = confidenceFromStatus(draft.status);
      if (draft.id == null) {
        const created = await request<{ id: number }>("/words", {
          method: "POST",
          body: JSON.stringify({
            name: draft.name.trim(),
            grammaticalClass: draft.grammaticalClass,
            translations,
            confidence,
            vaultId: vault.id,
            isSaved: true,
          }),
        });
        if (created?.id) {
          await request(`/flashcards/words/${created.id}/status`, {
            method: "POST",
            body: JSON.stringify({ status: draft.status }),
          }).catch(() => undefined);
        }
      } else {
        await request(`/words/${draft.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: draft.name.trim(),
            grammaticalClass: draft.grammaticalClass,
            translations,
            confidence,
          }),
        });
        await request(`/flashcards/words/${draft.id}/status`, {
          method: "POST",
          body: JSON.stringify({ status: draft.status }),
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

  const suggestForWord = async (wordInput: string) => {
    const word = wordInput.trim();
    if (!word || suggesting) return;
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

  const suggestWithAi = async () => {
    if (!draft) return;
    await suggestForWord(draft.name);
  };

  const openVaultEditor = () => {
    if (!vault) return;
    setVaultEditor({ name: vault.name, isPublic: Boolean(vault.isPublic) });
  };

  const saveVaultMeta = async () => {
    if (!vault || !vaultEditor || !vaultEditor.name.trim() || savingVault) return;
    setSavingVault(true);
    setError(null);
    try {
      const nextName = vaultEditor.name.trim();
      const nextPublic = vaultEditor.isPublic;
      const updated = await request<Vault>(`/vaults/${vault.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: nextName,
          isPublic: nextPublic,
        }),
      });
      setVault({
        ...vault,
        name: updated?.name ?? nextName,
        isPublic: typeof updated?.isPublic === "boolean" ? updated.isPublic : nextPublic,
      });
      setVaultEditor(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o vault");
    } finally {
      setSavingVault(false);
    }
  };

  if (!vault && !missing && !error) return <Loading />;

  const wordCount = vault?.words.length ?? 0;

  const accent = vault ? vaultAccent(vault.id) : "#9B5CFF";
  const coverLight = mixHex(accent, 255, 0.22);
  const coverMid = mixHex(accent, 255, 0.06);
  const actionBg = accentSoft(accent, 0.32);
  // Cores OPACAS: capa escurecendo até o cinza da plataforma (#121212).
  const screenBase = theme.shell.background;
  const baseChannel = 0x12;
  const heroColors = [0.25, 0.33, 0.45, 0.6, 0.76, 0.9, 1].map((amount) =>
    mixHex(accent, baseChannel, amount)
  ) as [string, string, ...string[]];
  const heroLocations = [0, 0.15, 0.3, 0.5, 0.7, 0.88, 1] as const;

  if (!vault) {
    return (
      <Screen backgroundColor={screenBase}>
        {error ? <ErrorText>{error}</ErrorText> : null}
        {missing ? <Muted>Este vault não está mais disponível.</Muted> : null}
      </Screen>
    );
  }

  const topBarHeight = 44;
  const gradientExtra = insets.top + topBarHeight;

  const playlistHeader = (
    <View style={{ paddingBottom: 8 }}>
      <View style={{ height: gradientExtra }} />
      <View style={{ paddingHorizontal: 20 }}>
        <View style={{ alignItems: "center", marginTop: 4, marginBottom: 16 }}>
          <LinearGradient
            colors={[coverLight, coverMid, accent]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={{
              width: 168,
              height: 168,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOpacity: 0.35,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 8,
            }}
          >
            <Ionicons name="bookmark-outline" size={58} color="rgba(255,255,255,0.92)" />
          </LinearGradient>
        </View>

        <Text
          numberOfLines={2}
          style={{ color: "#FFFFFF", fontFamily: theme.fonts.bold, fontSize: 24, lineHeight: 30 }}
        >
          {vault.name}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="albums" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={{ color: "rgba(255,255,255,0.85)", fontFamily: theme.fonts.semibold, fontSize: 12 }}>
              Word Map
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Editar privacidade do vault"
            onPress={openVaultEditor}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <Ionicons
              name={vault.isPublic ? "globe-outline" : "lock-closed"}
              size={12}
              color={vault.isPublic ? theme.colors.green : "rgba(255,255,255,0.85)"}
            />
            <Text
              style={{
                color: vault.isPublic ? theme.colors.green : "rgba(255,255,255,0.85)",
                fontFamily: theme.fonts.semibold,
                fontSize: 12,
              }}
            >
              {vault.isPublic ? "Público" : "Privado"}
            </Text>
          </Pressable>
        </View>

        <Text
          style={{
            marginTop: 10,
            marginBottom: 12,
            color: "rgba(255,255,255,0.65)",
            fontFamily: theme.fonts.regular,
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          {wordCount === 0
            ? "Ainda não tem palavras. Adicione a primeira para começar."
            : `Todas as palavras que você salvou neste vault.`}
        </Text>

        <LearningProgressLink words={vault.words} accent={accent} />

        <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
          <Pressable
            disabled={wordCount === 0}
            onPress={() => router.push(`/flashcards/${vault.id}` as Href)}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 14,
              backgroundColor: actionBg,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: wordCount === 0 ? 0.45 : 1,
            }}
          >
            <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontFamily: theme.fonts.bold, fontSize: 14 }}>Revisar</Text>
          </Pressable>
          <Pressable
            onPress={() => setAddSearchOpen(true)}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 14,
              backgroundColor: actionBg,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontFamily: theme.fonts.bold, fontSize: 14 }}>Nova palavra</Text>
          </Pressable>
        </View>

        {searchOpen ? (
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Pesquisar palavra"
            placeholderTextColor="rgba(255,255,255,0.35)"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              marginTop: 16,
              height: 44,
              borderRadius: 12,
              paddingHorizontal: 14,
              color: "#FFFFFF",
              backgroundColor: "rgba(0,0,0,0.28)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
              fontFamily: theme.fonts.regular,
              fontSize: 15,
            }}
          />
        ) : null}

        {wordCount > 0 ? (
          <Text
            style={{
              marginTop: 22,
              marginBottom: 4,
              color: "#FFFFFF",
              fontFamily: theme.fonts.bold,
              fontSize: 18,
            }}
          >
            Minhas {wordCount} {wordCount === 1 ? "palavra" : "palavras"}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: screenBase }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 560 + insets.top,
          transform: [{ translateY: Animated.multiply(scrollY, -1) }],
        }}
      >
        <LinearGradient
          colors={heroColors}
          locations={heroLocations as unknown as [number, number, ...number[]]}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <Animated.FlatList
        data={words}
        keyExtractor={(item) => String(item.id)}
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 24) + 16,
          backgroundColor: "transparent",
        }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            {error ? (
              <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
                <ErrorText>{error}</ErrorText>
              </View>
            ) : null}
            {playlistHeader}
          </>
        }
        ListEmptyComponent={
          wordCount === 0 ? null : (
            <Text
              style={{
                paddingHorizontal: 20,
                color: "rgba(255,255,255,0.5)",
                fontFamily: theme.fonts.medium,
              }}
            >
              Nenhuma palavra encontrada.
            </Text>
          )
        }
        renderItem={({ item }: { item: Word }) => {
          const translation = item.translations.filter(Boolean).join(", ");
          return (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: "rgba(255,255,255,0.1)",
                paddingVertical: 14,
                paddingHorizontal: 20,
                backgroundColor: "transparent",
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
                  backgroundColor: "rgba(255,255,255,0.08)",
                }}
              >
                <Ionicons name="volume-medium" size={22} color="#24c875" />
              </Pressable>
              <Pressable onPress={() => setOpened(item)} style={{ flex: 1 }}>
                <Text style={{ color: "#FFFFFF", fontFamily: theme.fonts.bold, fontSize: 17 }}>
                  {item.name}
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontFamily: theme.fonts.regular,
                    marginTop: 3,
                    fontSize: 14,
                  }}
                >
                  {translation || classLabel(item.grammaticalClass)}
                </Text>
              </Pressable>
              <LearningStatusTag word={item} size="icon" />
            </View>
          );
        }}
      />

      <SafeAreaView
        pointerEvents="box-none"
        edges={["top"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 }}
      >
        <View
          pointerEvents="box-none"
          style={{
            height: topBarHeight,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 12,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={{ width: 40, height: 40, justifyContent: "center", alignItems: "center" }}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>
          <View style={{ flexDirection: "row", gap: 2 }}>
            <Pressable
              accessibilityLabel="Editar vault"
              onPress={openVaultEditor}
              hitSlop={8}
              style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="create-outline" size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => setSearchOpen((open) => !open)}
              hitSlop={8}
              style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="search" size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => setSortAsc((value) => !value)}
              hitSlop={8}
              style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="swap-vertical" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

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

      <AddWordSearchSheet
        visible={addSearchOpen}
        onClose={() => setAddSearchOpen(false)}
        preferredVaultId={vault?.id}
        onChanged={load}
      />

      <Modal
        animationType="fade"
        transparent
        visible={vaultEditor != null}
        onRequestClose={() => setVaultEditor(null)}
      >
        <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.55)" }}>
          <View
            style={{
              backgroundColor: "#1C1C1E",
              borderRadius: 18,
              padding: 20,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >
            <Heading>Editar vault</Heading>
            <Field
              autoFocus
              value={vaultEditor?.name ?? ""}
              onChangeText={(name) =>
                setVaultEditor((current) => (current ? { ...current, name } : current))
              }
              placeholder="Nome do vault"
            />
            <Pressable
              onPress={() =>
                setVaultEditor((current) =>
                  current ? { ...current, isPublic: !current.isPublic } : current
                )
              }
              style={{
                marginTop: 14,
                marginBottom: 6,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: "#FFFFFF", fontFamily: theme.fonts.semibold, fontSize: 15 }}>
                  Vault público
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontFamily: theme.fonts.regular,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  Aparece na busca de outras pessoas
                </Text>
              </View>
              <Switch
                value={Boolean(vaultEditor?.isPublic)}
                onValueChange={(isPublic) =>
                  setVaultEditor((current) => (current ? { ...current, isPublic } : current))
                }
                trackColor={{ false: "rgba(255,255,255,0.18)", true: "rgba(36,200,117,0.45)" }}
                thumbColor={vaultEditor?.isPublic ? "#24c875" : "#f4f3f4"}
              />
            </Pressable>
            <PrimaryButton
              label={savingVault ? "Salvando..." : "Salvar"}
              disabled={savingVault || !vaultEditor?.name.trim()}
              onPress={() => void saveVaultMeta()}
            />
            <Pressable
              onPress={() => setVaultEditor(null)}
              style={{ alignItems: "center", marginTop: 14 }}
            >
              <Text style={{ color: "rgba(255,255,255,0.55)", fontFamily: theme.fonts.semibold }}>
                Cancelar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
                backgroundColor: "#0B0B0B",
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
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
                  Status
                </Text>
                <View style={{ marginTop: 10 }}>
                  <LearningStatusChooser
                    value={draft?.status ?? "new"}
                    onChange={(status) =>
                      setDraft((current) => (current ? { ...current, status } : current))
                    }
                  />
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
    </View>
  );
}
