import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import {
  buildReadingContext,
  extractRelatedSentences,
  formatOriginDate,
  grammarClassBySlug,
  grammarClassLabel,
  normalizeGrammaticalClass,
  normalizeToken,
  resolveGrammarSlug,
  splitParagraphs,
  splitTokenEdges,
  type DictionaryEntry,
  type ReadingPage,
} from "@word-map/shared";
import { useSession } from "./session";
import { useTheme } from "./theme";
import { type Vault, type Word } from "./types";

const LEVEL_COLORS = ["#ff4b4b", "#ff9600", "#ffc800", "#24c875"];
const LEVEL_TEXT = ["#ffffff", "#ffffff", "#3c3c3c", "#ffffff"];
const CARD = "#2d333b";

export type WordAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FoundTextWord = {
  word: string;
  vaultInfo: Array<{
    id: number;
    name: string;
    words: Array<{
      id: number;
      name: string;
      translations: string[];
      grammaticalClass: string;
      confidence: number;
      notes?: string | null;
      vaultId: number;
    }>;
  }>;
};

export type SavedReadingWord = {
  id: number;
  name: string;
  vaultId: number;
  vaultName: string;
  translations: string[];
  grammaticalClass: string;
  confidence: number;
  notes: string | null;
};

type OriginEntry = {
  id: number;
  meaning: string;
  sentence: string | null;
  sourceTitle: string | null;
  sourceKind: string;
  createdAt: string;
};

type Passage = {
  explanation: string;
  translation: string | null;
};

export function speakWord(word: string) {
  Speech.stop();
  Speech.speak(word, { language: "en-US", rate: 0.8 });
}

export function findSavedReadingWord(
  foundWords: FoundTextWord[],
  vaults: Vault[],
  clean: string
): SavedReadingWord | null {
  const match = foundWords.find((item) => item.word.toLowerCase() === clean.toLowerCase());
  if (!match) return null;
  const vault = match.vaultInfo[0];
  const word =
    vault?.words.find((item) => item.name.toLowerCase() === clean.toLowerCase()) ??
    vault?.words[0];
  if (!vault || !word) return null;
  const stored = vaults
    .find((item) => item.id === vault.id)
    ?.words.find((item) => item.id === word.id);
  return {
    id: word.id,
    name: word.name,
    vaultId: vault.id,
    vaultName: vault.name,
    translations: stored?.translations ?? word.translations,
    grammaticalClass: stored?.grammaticalClass ?? word.grammaticalClass,
    confidence: stored?.confidence ?? word.confidence,
    notes: stored?.notes ?? word.notes ?? null,
  };
}

export function ReadingPageText({
  text,
  width,
  fontSize,
  vaultWords,
  selectedClean,
  selectedOccurrence,
  onSelectWord,
}: {
  text: string;
  width: number;
  fontSize: number;
  vaultWords: Set<string>;
  selectedClean: string | null;
  selectedOccurrence: number | null;
  onSelectWord: (clean: string, occurrence: number, anchor: WordAnchor) => void;
}) {
  const theme = useTheme();
  const lineHeight = Math.round(fontSize * 1.45);
  const baseStyle = {
    width,
    color: theme.colors.foreground,
    fontFamily: theme.fonts.regular,
    fontSize,
    lineHeight,
  };

  if (!text.trim()) {
    return <Text style={baseStyle}>Este capítulo está vazio.</Text>;
  }

  const nodes: ReactNode[] = [];
  const seen = new Map<string, number>();
  const pattern = /\S+/g;
  let last = 0;
  let tokenKey = 0;
  let match: RegExpExecArray | null = pattern.exec(text);
  while (match) {
    const start = match.index;
    if (start > last) nodes.push(text.slice(last, start));
    const surface = match[0];
    const clean = normalizeToken(surface);
    const inVault = vaultWords.has(clean);
    const clickable = Boolean(clean) && (inVault || (surface.trim().length > 2 && clean.length >= 3));
    if (clickable && clean) {
      const occurrence = seen.get(clean) ?? 0;
      seen.set(clean, occurrence + 1);
      nodes.push(
        <WordToken
          key={`word-${tokenKey}`}
          surface={surface}
          inVault={inVault}
          selected={selectedClean === clean && selectedOccurrence === occurrence}
          similar={
            selectedClean === clean &&
            selectedOccurrence != null &&
            selectedOccurrence !== occurrence
          }
          onPress={(anchor) => onSelectWord(clean, occurrence, anchor)}
        />
      );
    } else {
      nodes.push(surface);
    }
    tokenKey += 1;
    last = start + surface.length;
    match = pattern.exec(text);
  }
  if (last < text.length) nodes.push(text.slice(last));

  return (
    <Text selectable={false} style={baseStyle}>
      {nodes}
    </Text>
  );
}

function WordToken({
  surface,
  selected,
  similar,
  inVault,
  onPress,
}: {
  surface: string;
  selected: boolean;
  similar: boolean;
  inVault: boolean;
  onPress: (anchor: WordAnchor) => void;
}) {
  const theme = useTheme();
  const coreRef = useRef<ComponentRef<typeof Text>>(null);
  const { leading, core, trailing } = splitTokenEdges(surface);
  const marked = inVault || similar || selected;
  const dark = theme.name === "dark";

  return (
    <Text
      suppressHighlighting
      onPress={(event: GestureResponderEvent) => {
        const { pageX, pageY } = event.nativeEvent;
        const fallback = { x: pageX - 4, y: pageY - 10, width: 8, height: 20 };
        const node = coreRef.current;
        if (!node) {
          onPress(fallback);
          return;
        }
        node.measureInWindow((x, y, width, height) => {
          const measuredWord = width > 0 && height > 0 && height < 56 && width < 280;
          onPress(measuredWord ? { x, y, width, height } : fallback);
        });
      }}
    >
      {leading}
      <Text
        ref={coreRef}
        style={{
          color: selected ? "#ffffff" : inVault ? (dark ? "#7ddea8" : "#14804a") : theme.colors.foreground,
          backgroundColor: selected
            ? "#24c875"
            : similar
              ? dark
                ? "rgba(36,200,117,0.15)"
                : "#edf9df"
              : inVault
                ? dark
                  ? "rgba(36,200,117,0.25)"
                  : "#e7f8ee"
                : "transparent",
          borderRadius: 3,
          paddingHorizontal: marked ? 3 : 0,
        }}
      >
        {core}
      </Text>
      {trailing}
    </Text>
  );
}

export function ReadingWordMenu({
  clean,
  anchor,
  sourceText,
  chapterContent,
  pages,
  pageIndex,
  bookTitle,
  saved,
  vaults,
  onClose,
  onChanged,
}: {
  clean: string;
  anchor: WordAnchor;
  sourceText: string;
  chapterContent: string;
  pages: ReadingPage[];
  pageIndex: number;
  bookTitle: string;
  saved: SavedReadingWord | null;
  vaults: Vault[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const theme = useTheme();
  const { request } = useSession();
  const window = useWindowDimensions();
  const [boxHeight, setBoxHeight] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [localSaved, setLocalSaved] = useState<SavedReadingWord | null>(saved);
  const [selectedMeanings, setSelectedMeanings] = useState<string[]>(saved?.translations ?? []);
  const [customMeaning, setCustomMeaning] = useState("");
  const [notes, setNotes] = useState(saved?.notes ?? "");
  const [vaultId, setVaultId] = useState(saved ? String(saved.vaultId) : vaults[0] ? String(vaults[0].id) : "");
  const [wordInfo, setWordInfo] = useState<DictionaryEntry | null>(null);
  const [candidateMeanings, setCandidateMeanings] = useState<string[]>([]);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [origins, setOrigins] = useState<OriginEntry[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [suggestedTranslation, setSuggestedTranslation] = useState<string | null>(null);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionLocked, setSuggestionLocked] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [grammarSlug, setGrammarSlug] = useState<string | null>(null);
  const suggestingRef = useRef(false);

  const savedKey = saved
    ? `${saved.id}|${saved.translations.join("\n")}|${saved.confidence}|${saved.notes ?? ""}|${saved.vaultId}|${saved.grammaticalClass}`
    : "";

  useEffect(() => {
    setLocalSaved(saved);
  }, [clean, savedKey]);

  useEffect(() => {
    setSelectedMeanings(localSaved?.translations ?? []);
  }, [clean, localSaved?.id, localSaved?.translations]);

  useEffect(() => {
    setNotes(localSaved?.notes ?? "");
  }, [clean, localSaved?.id]);

  useEffect(() => {
    setCustomMeaning("");
    setSuggestError(null);
    setSuggestionLocked(false);
    suggestingRef.current = false;
    setExpanded(false);
    setGrammarSlug(null);
    setExplanation(null);
    setSuggestedTranslation(null);
    setExplanationError(null);
    setActionError(null);
  }, [clean]);

  useEffect(() => {
    if (vaultId || localSaved || vaults.length === 0) return;
    setVaultId(String(vaults[0].id));
  }, [vaultId, localSaved, vaults]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const resolvedVaultId =
    vaultId || (localSaved ? String(localSaved.vaultId) : vaults[0] ? String(vaults[0].id) : "");

  const context = useMemo(() => {
    const built = buildReadingContext({
      paragraphs: splitParagraphs(chapterContent),
      pages,
      pageIndex,
      span: clean,
    });
    return built.ok ? built : null;
  }, [chapterContent, pages, pageIndex, clean]);

  const relatedPhrases = useMemo(
    () => extractRelatedSentences(sourceText, clean).slice(0, 4),
    [sourceText, clean]
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingInfo(true);
    setTranslating(false);
    setWordInfo(null);
    setCandidateMeanings([]);
    (async () => {
      let autoTranslate = false;
      try {
        const settings = await request<{ autoTranslateWordPreview?: boolean } | null>("/users/settings");
        autoTranslate = Boolean(settings?.autoTranslateWordPreview);
      } catch {
        autoTranslate = false;
      }
      let entry: DictionaryEntry | null = null;
      try {
        const data = await request<{ entry?: DictionaryEntry | null }>(
          `/dictionary?word=${encodeURIComponent(clean)}`
        );
        entry = data.entry ?? null;
      } catch {
        entry = null;
      }
      if (cancelled) return;
      setWordInfo(entry);
      const raw = collectCandidateMeanings(entry);
      if (!raw.length) {
        setLoadingInfo(false);
        return;
      }
      setLoadingInfo(false);
      setTranslating(true);
      try {
        const translated = autoTranslate
          ? collectCandidateMeanings(await translateEntryPreview(request, entry))
          : await translateMany(request, raw);
        if (cancelled) return;
        setCandidateMeanings(uniqueMeanings(translated));
      } catch {
        if (!cancelled) setCandidateMeanings(raw);
      } finally {
        if (!cancelled) setTranslating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clean, request]);

  useEffect(() => {
    const wordId = localSaved?.id;
    if (!wordId) {
      setOrigins([]);
      return;
    }
    let cancelled = false;
    request<OriginEntry[]>(`/words/${wordId}/origins`)
      .then((rows) => {
        if (!cancelled) setOrigins(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setOrigins([]);
      });
    return () => {
      cancelled = true;
    };
  }, [localSaved?.id, localSaved?.translations, request]);

  useEffect(() => {
    if (!context) {
      setExplanation(null);
      setSuggestedTranslation(null);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({
      span: context.span,
      sentence: context.sentence,
    });
    request<Passage | null>(`/tutor/passages?${params.toString()}`)
      .then((row) => {
        if (cancelled || !row?.explanation) return;
        setExplanation(row.explanation);
        setSuggestedTranslation(row.translation?.trim() || null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [context, request]);

  const suggestedClass = normalizeGrammaticalClass(
    localSaved?.grammaticalClass || wordInfo?.meanings?.[0]?.partOfSpeech
  );

  const partOfSpeechBadges = useMemo(() => {
    if (localSaved?.grammaticalClass) return [localSaved.grammaticalClass];
    const parts =
      wordInfo?.meanings
        ?.map((item) => item.partOfSpeech)
        .filter((part): part is string => Boolean(part)) ?? [];
    return [...new Set(parts)].slice(0, 3);
  }, [localSaved?.grammaticalClass, wordInfo]);

  const availableMeanings = candidateMeanings.filter((item) => !hasMeaning(selectedMeanings, item));
  const dropdownMeaning = selectedMeanings[0] ?? bestShortTranslation(availableMeanings);
  const dropdownSaved = Boolean(dropdownMeaning && hasMeaning(selectedMeanings, dropdownMeaning));
  const confidence = localSaved?.confidence ?? 0;
  const grammar = grammarSlug ? grammarClassBySlug(grammarSlug) : null;

  const origin = () => ({
    sentence: context?.sentence ?? null,
    sourceTitle: bookTitle || null,
    sourceKind: "book" as const,
  });

  const refreshOrigins = async (wordId: number) => {
    try {
      const rows = await request<OriginEntry[]>(`/words/${wordId}/origins`);
      setOrigins(Array.isArray(rows) ? rows : []);
    } catch {
      setOrigins([]);
    }
  };

  const persistMeanings = async (translations: string[], nextConfidence?: number) => {
    setSaving(true);
    setActionError(null);
    try {
      if (!localSaved && !resolvedVaultId) {
        throw new Error("Crie um vault para salvar palavras.");
      }
      if (localSaved) {
        const updated = await request<Word>(`/words/${localSaved.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            translations,
            ...(nextConfidence != null ? { confidence: nextConfidence } : {}),
            origin: origin(),
          }),
        });
        const next = toSaved(updated, localSaved.vaultName);
        setLocalSaved(next);
        setSelectedMeanings(next.translations);
        await refreshOrigins(next.id);
      } else {
        const created = await request<Word>("/words", {
          method: "POST",
          body: JSON.stringify({
            name: clean,
            grammaticalClass: suggestedClass,
            translations: translations.length ? translations : [clean],
            notes: notes.trim() || null,
            confidence: nextConfidence ?? 1,
            vaultId: Number(resolvedVaultId),
            origin: origin(),
          }),
        });
        const vaultName = vaults.find((item) => item.id === created.vaultId)?.name ?? "";
        const next = toSaved(created, vaultName);
        setLocalSaved(next);
        setSelectedMeanings(next.translations);
        await refreshOrigins(next.id);
      }
      try {
        await onChanged();
      } catch {
        setActionError(null);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível salvar");
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleAddMeaning = async (value: string) => {
    const meaning = value.trim();
    if (!meaning || hasMeaning(selectedMeanings, meaning) || saving) return;
    const previous = selectedMeanings;
    const next = [...selectedMeanings, meaning];
    setSelectedMeanings(next);
    setCustomMeaning("");
    try {
      await persistMeanings(next);
    } catch {
      setSelectedMeanings(previous);
      setCustomMeaning(meaning);
    }
  };

  const handleRemoveMeaning = async (value: string) => {
    const previous = selectedMeanings;
    const next = selectedMeanings.filter((item) => item.toLowerCase() !== value.toLowerCase());
    setSelectedMeanings(next);
    if (!localSaved) return;
    try {
      await persistMeanings(next);
    } catch {
      setSelectedMeanings(previous);
    }
  };

  const handleConfidence = async (level: number) => {
    if (saving) return;
    if (localSaved) {
      setSaving(true);
      setActionError(null);
      try {
        const updated = await request<Word>(`/words/${localSaved.id}`, {
          method: "PATCH",
          body: JSON.stringify({ confidence: level }),
        });
        setLocalSaved(toSaved(updated, localSaved.vaultName));
        try {
          await onChanged();
        } catch {
          setActionError(null);
        }
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Não foi possível salvar");
      } finally {
        setSaving(false);
      }
      return;
    }
    try {
      await persistMeanings(selectedMeanings, level);
    } catch {
      return;
    }
  };

  const handleNotesBlur = async () => {
    if (!localSaved) return;
    const value = notes.trim() || null;
    if ((localSaved.notes ?? null) === value) return;
    setSaving(true);
    setActionError(null);
    try {
      const updated = await request<Word>(`/words/${localSaved.id}`, {
        method: "PATCH",
        body: JSON.stringify({ notes: value }),
      });
      setLocalSaved(toSaved(updated, localSaved.vaultName));
      try {
        await onChanged();
      } catch {
        setActionError(null);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível salvar a nota");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!localSaved || saving) return;
    setSaving(true);
    setActionError(null);
    try {
      await request("/words/remove-from-vault", {
        method: "POST",
        body: JSON.stringify({
          wordName: localSaved.name,
          vaultId: localSaved.vaultId,
          wordId: localSaved.id,
        }),
      });
      setLocalSaved(null);
      setSelectedMeanings([]);
      setOrigins([]);
      try {
        await onChanged();
      } catch {
        setActionError(null);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível remover");
    } finally {
      setSaving(false);
    }
  };

  const handleSuggest = async () => {
    if (suggestingRef.current || suggestionLocked || suggesting) return;
    suggestingRef.current = true;
    setSuggesting(true);
    setSuggestError(null);
    let locked = false;
    try {
      const data = await request<{ translation?: string }>("/tutor/suggest-translation", {
        method: "POST",
        body: JSON.stringify({
          word: clean,
          sentence: context?.sentence ?? null,
          wordId: localSaved?.id,
        }),
      });
      const translation = data.translation?.trim();
      if (!translation) throw new Error("Não foi possível sugerir uma tradução.");
      setCustomMeaning(translation);
      setSuggestionLocked(true);
      locked = true;
    } catch (error) {
      setSuggestError(error instanceof Error ? error.message : "Não foi possível sugerir uma tradução.");
    } finally {
      setSuggesting(false);
      if (!locked) suggestingRef.current = false;
    }
  };

  const handleContextualize = async () => {
    if (!context || explaining) return;
    setExplaining(true);
    setExplanationError(null);
    try {
      const result = await request<Passage>("/tutor/contextualize", {
        method: "POST",
        body: JSON.stringify({
          span: context.span,
          sentence: context.sentence,
          paragraph: context.paragraph,
          previousParagraph: context.previousParagraph,
          ...(localSaved ? { wordId: localSaved.id } : {}),
        }),
      });
      setExplanation(result.explanation);
      setSuggestedTranslation(result.translation?.trim() || null);
    } catch (error) {
      setExplanationError(error instanceof Error ? error.message : "Não foi possível explicar este trecho.");
    } finally {
      setExplaining(false);
    }
  };

  const margin = 12;
  const gap = 8;
  const cardWidth = Math.min(340, window.width - margin * 2);
  const safeAnchor =
    anchor.width > 0
      ? anchor
      : { x: window.width / 2, y: window.height * 0.35, width: 1, height: 1 };
  let left = safeAnchor.x + safeAnchor.width / 2 - cardWidth / 2;
  left = Math.max(margin, Math.min(left, window.width - cardWidth - margin));
  const belowTop = safeAnchor.y + safeAnchor.height + gap;
  const placeAbove = boxHeight > 0 && belowTop + boxHeight > window.height - 16 && safeAnchor.y - gap - boxHeight >= 8;
  const top = placeAbove ? safeAnchor.y - gap - boxHeight : belowTop;
  const arrowLeft = Math.max(16, Math.min(safeAnchor.x + safeAnchor.width / 2 - left, cardWidth - 16));
  const maxCard = expanded ? Math.min(window.height * 0.72, 560) : Math.min(window.height * 0.46, 380);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          onLayout={(event) => {
            const next = event.nativeEvent.layout.height;
            setBoxHeight((current) => (Math.abs(current - next) < 1 ? current : next));
          }}
          style={{ position: "absolute", top, left, width: cardWidth }}
        >
          {!placeAbove ? <Arrow pointing="up" left={arrowLeft} /> : null}
          <View style={styles.card}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              bounces={false}
              style={{ maxHeight: maxCard - 36 }}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              <View style={styles.header}>
                <View style={styles.headerTitle}>
                  <IconButton
                    label={`Ouvir ${clean}`}
                    name="volume-high-outline"
                    color="#a1a1aa"
                    onPress={() => speakWord(clean)}
                  />
                  <Text numberOfLines={1} style={[styles.word, { fontFamily: theme.fonts.medium }]}>
                    {clean}
                  </Text>
                </View>
                <View style={styles.headerActions}>
                  {localSaved ? <Ionicons name="checkmark" size={18} color="#24c875" /> : null}
                  <IconButton
                    label="Remover palavra"
                    name="trash-outline"
                    color="#b0b0b0"
                    disabled={saving || !localSaved}
                    onPress={() => void handleRemove()}
                  />
                  <IconButton label="Fechar painel" name="close" color="#b0b0b0" onPress={onClose} />
                </View>
              </View>

              <View style={styles.body}>
                <View style={styles.badges}>
                  {confidence > 0 ? (
                    <View style={[styles.level, { backgroundColor: LEVEL_COLORS[Math.min(confidence, 4) - 1] }]}>
                      <Text style={{ color: LEVEL_TEXT[Math.min(confidence, 4) - 1], fontFamily: theme.fonts.bold, fontSize: 11 }}>
                        {confidence}
                      </Text>
                    </View>
                  ) : null}
                  {partOfSpeechBadges.map((badge) => {
                    const slug = resolveGrammarSlug(badge);
                    return (
                      <Pressable
                        key={badge}
                        disabled={!slug}
                        onPress={() => setGrammarSlug((current) => (current === slug ? null : slug))}
                        style={styles.badge}
                      >
                        <Text style={{ color: "#d4d4d8", fontSize: 12, fontFamily: theme.fonts.medium }}>
                          {grammarClassLabel(badge)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {grammar ? (
                  <View style={styles.grammar}>
                    <Text style={[styles.grammarTitle, { fontFamily: theme.fonts.bold }]}>{grammar.label}</Text>
                    <Text style={[styles.grammarText, { fontFamily: theme.fonts.regular }]}>{grammar.summary}</Text>
                    <Text style={[styles.grammarText, { fontFamily: theme.fonts.regular }]}>{grammar.explanation}</Text>
                    <Text style={[styles.grammarExample, { fontFamily: theme.fonts.semibold }]}>{grammar.exampleEn}</Text>
                    <Text style={[styles.grammarText, { fontFamily: theme.fonts.regular }]}>{grammar.examplePt}</Text>
                  </View>
                ) : null}

                {!expanded && dropdownMeaning ? (
                  <MeaningRow
                    label={dropdownMeaning}
                    saved={dropdownSaved}
                    disabled={saving || !resolvedVaultId}
                    onAdd={() => void handleAddMeaning(dropdownMeaning)}
                  />
                ) : null}
                {!expanded && !dropdownMeaning && (loadingInfo || translating) ? (
                  <Text style={[styles.hint, { fontFamily: theme.fonts.regular }]}>Buscando tradução…</Text>
                ) : null}

                <View style={styles.inputRow}>
                  <TextInput
                    value={customMeaning}
                    onChangeText={setCustomMeaning}
                    onSubmitEditing={() => void handleAddMeaning(customMeaning)}
                    placeholder="Novo significado"
                    placeholderTextColor="#8b949e"
                    style={[styles.input, { fontFamily: theme.fonts.regular }]}
                  />
                  <IconButton
                    label="Sugerir tradução"
                    name="sparkles"
                    color="#c4b5fd"
                    disabled={!clean || suggesting || suggestionLocked}
                    onPress={() => void handleSuggest()}
                  />
                  {suggesting ? <ActivityIndicator size="small" color="#c4b5fd" /> : null}
                  <IconButton
                    label="Adicionar significado"
                    name="add"
                    color="#d4d4d8"
                    disabled={!customMeaning.trim() || saving || !resolvedVaultId}
                    onPress={() => void handleAddMeaning(customMeaning)}
                  />
                </View>
                {suggestError ? (
                  <Text style={[styles.error, { fontFamily: theme.fonts.regular }]}>{suggestError}</Text>
                ) : null}
                {!resolvedVaultId ? (
                  <Text style={[styles.hint, { fontFamily: theme.fonts.regular }]}>
                    Crie um vault para salvar palavras.
                  </Text>
                ) : null}

                {expanded ? (
                  <View style={{ marginTop: 12 }}>
                    {!localSaved && vaults.length > 1 ? (
                      <View style={styles.vaults}>
                        {vaults.map((vault) => {
                          const active = resolvedVaultId === String(vault.id);
                          return (
                            <Pressable
                              key={vault.id}
                              onPress={() => setVaultId(String(vault.id))}
                              style={[styles.vaultChip, active && styles.vaultChipActive]}
                            >
                              <Text
                                style={{
                                  color: active ? "#24c875" : "#d4d4d8",
                                  fontFamily: theme.fonts.semibold,
                                  fontSize: 12,
                                }}
                              >
                                {vault.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}

                    {selectedMeanings.length > 0 ? (
                      <View style={{ marginTop: 8 }}>
                        {selectedMeanings.map((item) => (
                          <View key={item} style={styles.savedRow}>
                            <Text style={[styles.savedText, { fontFamily: theme.fonts.regular }]}>{item}</Text>
                            <IconButton
                              label={`Remover ${item}`}
                              name="close"
                              color="#7ddea8"
                              onPress={() => void handleRemoveMeaning(item)}
                            />
                          </View>
                        ))}
                      </View>
                    ) : null}

                    <Text style={[styles.section, { fontFamily: theme.fonts.semibold }]}>Significados populares</Text>
                    {(loadingInfo || translating) && (
                      <Text style={[styles.hint, { fontFamily: theme.fonts.regular }]}>Buscando tradução…</Text>
                    )}
                    {!loadingInfo && !translating && availableMeanings.length === 0 ? (
                      <Text style={[styles.hint, { fontFamily: theme.fonts.regular }]}>Nenhum significado sugerido.</Text>
                    ) : null}
                    {!loadingInfo && !translating
                      ? availableMeanings.map((item) => (
                          <Pressable
                            key={item}
                            disabled={saving || !resolvedVaultId}
                            onPress={() => void handleAddMeaning(item)}
                            style={styles.popularRow}
                          >
                            <Text style={[styles.popularText, { fontFamily: theme.fonts.regular }]}>{item}</Text>
                            <Ionicons name="add" size={16} color="#b0b0b0" />
                          </Pressable>
                        ))
                      : null}

                    {relatedPhrases.length > 0 ? (
                      <View style={{ marginTop: 14 }}>
                        <Text style={[styles.section, { fontFamily: theme.fonts.semibold }]}>Frases relacionadas</Text>
                        {relatedPhrases.map((phrase) => (
                          <Text key={phrase} style={[styles.phrase, { fontFamily: theme.fonts.regular }]}>
                            {phrase}
                          </Text>
                        ))}
                      </View>
                    ) : null}

                    <View style={{ marginTop: 14 }}>
                      {explanation && !explaining ? (
                        <View style={styles.contextBox}>
                          <Pressable disabled={!context} onPress={() => void handleContextualize()}>
                            <Text style={[styles.contextAction, { fontFamily: theme.fonts.semibold }]}>
                              Explicar contexto
                            </Text>
                          </Pressable>
                          <Text style={[styles.contextBody, { fontFamily: theme.fonts.regular }]}>{explanation}</Text>
                          {suggestedTranslation ? (
                            <View style={styles.translationRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.section, { fontFamily: theme.fonts.semibold, color: "#c4b5fd" }]}>
                                  Tradução
                                </Text>
                                <Text style={[styles.contextBody, { fontFamily: theme.fonts.semibold, color: "#ffffff" }]}>
                                  {suggestedTranslation}
                                </Text>
                              </View>
                              <Pressable
                                disabled={
                                  saving ||
                                  !resolvedVaultId ||
                                  hasMeaning(selectedMeanings, suggestedTranslation)
                                }
                                onPress={() => void handleAddMeaning(suggestedTranslation)}
                                style={styles.saveChip}
                              >
                                <Ionicons
                                  name={hasMeaning(selectedMeanings, suggestedTranslation) ? "checkmark" : "add"}
                                  size={14}
                                  color="#c4b5fd"
                                />
                                <Text style={{ color: "#c4b5fd", fontFamily: theme.fonts.semibold, fontSize: 12 }}>
                                  {hasMeaning(selectedMeanings, suggestedTranslation) ? "Salva" : "Salvar"}
                                </Text>
                              </Pressable>
                            </View>
                          ) : null}
                        </View>
                      ) : (
                        <Pressable
                          disabled={!context || explaining}
                          onPress={() => void handleContextualize()}
                          style={styles.contextButton}
                        >
                          <Ionicons name="sparkles" size={14} color="#c4b5fd" />
                          <Text style={{ color: "#c4b5fd", fontFamily: theme.fonts.semibold, fontSize: 13 }}>
                            {explaining ? "Explicando..." : "Explicar contexto"}
                          </Text>
                        </Pressable>
                      )}
                      {explanationError ? (
                        <Text style={[styles.error, { fontFamily: theme.fonts.regular }]}>{explanationError}</Text>
                      ) : null}
                    </View>

                    {origins.length > 0 ? (
                      <View style={{ marginTop: 14 }}>
                        <Text style={[styles.section, { fontFamily: theme.fonts.semibold }]}>
                          Origem dos significados
                        </Text>
                        {origins.map((item) => (
                          <View key={item.id} style={styles.origin}>
                            <Text style={[styles.hint, { fontFamily: theme.fonts.regular }]}>
                              {formatOriginDate(item.createdAt)}
                              {" · "}
                              {item.sourceTitle || "No vault"}
                            </Text>
                            <Text style={[styles.phrase, { fontFamily: theme.fonts.regular }]}>
                              {item.sentence || "Adicionada no vault"}
                            </Text>
                            <Text style={[styles.popularText, { fontFamily: theme.fonts.semibold }]}>
                              Significado: {item.meaning}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    <Text style={[styles.section, { marginTop: 14, fontFamily: theme.fonts.semibold }]}>Notas</Text>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      onBlur={() => void handleNotesBlur()}
                      placeholder="Adicionar nota aqui"
                      placeholderTextColor="#8b949e"
                      multiline
                      style={[styles.notes, { fontFamily: theme.fonts.regular }]}
                    />

                    <View style={styles.footer}>
                      {localSaved ? (
                        <Pressable disabled={saving} onPress={() => void handleRemove()} style={styles.removeButton}>
                          <Ionicons name="trash-outline" size={14} color="#a1a1aa" />
                          <Text style={{ color: "#a1a1aa", fontFamily: theme.fonts.semibold, fontSize: 12 }}>
                            Remover
                          </Text>
                        </Pressable>
                      ) : (
                        <View />
                      )}
                      <View style={styles.levels}>
                        {[1, 2, 3, 4].map((level) => {
                          const active = confidence === level;
                          return (
                            <Pressable
                              key={level}
                              disabled={saving || (!localSaved && !resolvedVaultId)}
                              onPress={() => void handleConfidence(level)}
                              style={[
                                styles.levelButton,
                                {
                                  backgroundColor: active ? LEVEL_COLORS[level - 1] : "#3d444d",
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  color: active ? LEVEL_TEXT[level - 1] : "#a1a1aa",
                                  fontFamily: theme.fonts.bold,
                                  fontSize: 12,
                                }}
                              >
                                {level}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                ) : null}

                {actionError ? (
                  <Text style={[styles.error, { fontFamily: theme.fonts.regular }]}>{actionError}</Text>
                ) : null}
              </View>
            </ScrollView>
            <Pressable
              accessibilityLabel={expanded ? "Recolher painel" : "Expandir painel"}
              onPress={() => setExpanded((current) => !current)}
              style={styles.chevron}
            >
              <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#8b949e" />
            </Pressable>
          </View>
          {placeAbove ? <Arrow pointing="down" left={arrowLeft} /> : null}
        </View>
      </View>
    </Modal>
  );
}

function MeaningRow({
  label,
  saved,
  disabled,
  onAdd,
}: {
  label: string;
  saved: boolean;
  disabled: boolean;
  onAdd: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.meaningRow}>
      <Text style={[styles.meaning, { fontFamily: theme.fonts.regular }]}>{label}</Text>
      {saved ? (
        <Ionicons name="checkmark" size={16} color="#24c875" />
      ) : (
        <IconButton label={`Salvar ${label}`} name="add" color="#a1a1aa" disabled={disabled} onPress={onAdd} />
      )}
    </View>
  );
}

function IconButton({
  label,
  name,
  color,
  onPress,
  disabled = false,
}: {
  label: string;
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.35 : 1 }}
    >
      <Ionicons name={name} size={18} color={color} />
    </Pressable>
  );
}

function Arrow({ pointing, left }: { pointing: "up" | "down"; left: number }) {
  const up = pointing === "up";
  return (
    <View
      style={{
        marginLeft: left - 8,
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomWidth: up ? 8 : 0,
        borderTopWidth: up ? 0 : 8,
        borderBottomColor: CARD,
        borderTopColor: CARD,
      }}
    />
  );
}

function toSaved(word: Word, vaultName: string): SavedReadingWord {
  return {
    id: word.id,
    name: word.name,
    vaultId: word.vaultId,
    vaultName,
    translations: word.translations ?? [],
    grammaticalClass: word.grammaticalClass,
    confidence: word.confidence,
    notes: word.notes ?? null,
  };
}

function hasMeaning(list: string[], value: string) {
  return list.some((item) => item.toLowerCase() === value.trim().toLowerCase());
}

function uniqueMeanings(values: string[]) {
  const unique: string[] = [];
  for (const item of values) {
    const value = item.trim();
    if (!value || hasMeaning(unique, value)) continue;
    unique.push(value);
  }
  return unique;
}

function collectCandidateMeanings(wordInfo?: DictionaryEntry | null) {
  if (!wordInfo?.meanings?.length) return [];
  const found: string[] = [];
  for (const meaning of wordInfo.meanings) {
    for (const definition of meaning.definitions ?? []) {
      const raw = definition.definition?.trim();
      if (!raw) continue;
      const short = raw.replace(/^\([^)]*\)\s*/, "").split(/[.;]/)[0]?.trim() ?? "";
      if (short.length < 2 || short.length > 80) continue;
      if (hasMeaning(found, short)) continue;
      found.push(short);
      if (found.length >= 10) return found;
    }
  }
  return found;
}

function bestShortTranslation(candidates: string[]) {
  const short = candidates.find((item) => {
    const text = item.trim();
    return text.length <= 48 && text.split(/\s+/).length <= 4;
  });
  return short ?? candidates[0] ?? null;
}

async function translateMany(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  texts: string[]
) {
  return Promise.all(
    texts.map(async (text) => {
      try {
        const data = await request<{ translatedText?: string }>("/translate", {
          method: "POST",
          body: JSON.stringify({ text, source: "en", target: "pt" }),
        });
        return data.translatedText?.trim() || text;
      } catch {
        return text;
      }
    })
  );
}

async function translateEntryPreview(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  entry: DictionaryEntry | null
): Promise<DictionaryEntry | null> {
  if (!entry?.meanings?.length) return entry;
  const meanings = entry.meanings.slice(0, 2).map((meaning) => ({
    ...meaning,
    definitions: (meaning.definitions ?? []).slice(0, 2).map((definition) => ({ ...definition })),
  }));
  const texts: string[] = [];
  const slots: Array<{ meaningIndex: number; definitionIndex: number }> = [];
  meanings.forEach((meaning, meaningIndex) => {
    (meaning.definitions ?? []).forEach((definition, definitionIndex) => {
      if (!definition.definition?.trim()) return;
      texts.push(definition.definition);
      slots.push({ meaningIndex, definitionIndex });
    });
  });
  const translated = await translateMany(request, texts);
  slots.forEach((slot, index) => {
    const definition = meanings[slot.meaningIndex]?.definitions?.[slot.definitionIndex];
    if (definition) definition.definition = translated[index];
  });
  return { ...entry, meanings };
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3d444d",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  headerTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4, minWidth: 0 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  word: { flex: 1, color: "#ffffff", fontSize: 20 },
  body: { paddingHorizontal: 12, paddingBottom: 4 },
  badges: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 8 },
  level: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badge: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  grammar: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    gap: 4,
  },
  grammarTitle: { color: "#ffffff", fontSize: 14 },
  grammarText: { color: "#d4d4d8", fontSize: 13, lineHeight: 18 },
  grammarExample: { color: "#7ddea8", fontSize: 13, marginTop: 4 },
  meaningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  meaning: { flex: 1, color: "#f4f4f5", fontSize: 14, lineHeight: 20 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 4 },
  input: {
    flex: 1,
    height: 36,
    color: "#f4f4f5",
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 2,
  },
  hint: { color: "#a1a1aa", fontSize: 12, marginTop: 6, lineHeight: 18 },
  error: { color: "#f87171", fontSize: 12, marginTop: 6 },
  section: { color: "#a1a1aa", fontSize: 11, marginTop: 10 },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#143022",
    borderRadius: 8,
    paddingLeft: 10,
    marginTop: 6,
  },
  savedText: { flex: 1, color: "#7ddea8", fontSize: 13, lineHeight: 18 },
  popularRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#3d444d",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
  },
  popularText: { flex: 1, color: "#7ddea8", fontSize: 13, lineHeight: 18 },
  phrase: { color: "#d4d4d8", fontSize: 12, lineHeight: 18, marginTop: 4 },
  contextBox: {
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.25)",
    backgroundColor: "rgba(196,181,253,0.08)",
    borderRadius: 8,
    padding: 10,
  },
  contextAction: { color: "#c4b5fd", fontSize: 12 },
  contextBody: { color: "#e4e4e7", fontSize: 13, lineHeight: 18, marginTop: 6 },
  contextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.25)",
    backgroundColor: "rgba(196,181,253,0.08)",
    borderRadius: 8,
    paddingVertical: 10,
  },
  translationRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  saveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#22272e",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  origin: { borderLeftWidth: 2, borderLeftColor: "#24c875", paddingLeft: 10, marginTop: 8 },
  notes: {
    minHeight: 72,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    color: "#f4f4f5",
    fontSize: 13,
    padding: 8,
    textAlignVertical: "top",
  },
  footer: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  removeButton: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6 },
  levels: { flexDirection: "row", gap: 8 },
  levelButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  vaults: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  vaultChip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  vaultChipActive: { borderColor: "#24c875" },
  chevron: { alignItems: "center", justifyContent: "center", paddingVertical: 6 },
});
