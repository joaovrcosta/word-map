import { useEffect, useMemo, useRef, useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import {
  buildReadingContext,
  extractRelatedSentences,
  formatOriginDate,
  grammarClassBySlug,
  grammarClassLabel,
  normalizeGrammaticalClass,
  resolveGrammarSlug,
  splitParagraphs,
  type DictionaryEntry,
  type ReadingPage,
} from "@word-map/shared";
import { useSession } from "../../session";
import { speakWord } from "../../speech";
import { shell, useTheme } from "../../theme";
import { type Vault, type Word } from "../../types";
import { type WordAnchor } from "./page-text";

const LEVEL_COLORS = ["#ff4b4b", "#ff9600", "#ffc800", "#24c875"];
const LEVEL_TEXT = [shell.foreground, shell.foreground, shell.onPastel, shell.foreground];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type LevelPoint = {
  date: string;
  level: number;
};

function localDay(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function dayPhrase(iso: string, today: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  const diff = Math.round(
    (Date.UTC(todayYear, todayMonth - 1, todayDay) - Date.UTC(year, month - 1, day)) / 86400000
  );
  const short = `${day} ${MONTHS[month - 1] ?? ""}`;
  if (diff === 0) return `Hoje, ${short}`;
  if (diff === 1) return `Ontem, ${short}`;
  return short;
}

function levelStory(points: LevelPoint[]) {
  if (points.length === 0) return null;
  const today = localDay();
  const last = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : null;
  if (!previous) return `${dayPhrase(last.date, today)}, nível ${last.level}.`;
  if (previous.date === last.date) {
    return `${dayPhrase(last.date, today)}, nível ${previous.level} → ${last.level}.`;
  }
  return `${dayPhrase(previous.date, today)}, nível ${previous.level}. ${dayPhrase(last.date, today)}, nível ${last.level}.`;
}

function LevelTrack({ points }: { points: LevelPoint[] }) {
  const theme = useTheme();
  const story = levelStory(points);
  const shown = points.slice(-14);
  const [width, setWidth] = useState(0);
  const height = 120;
  const labelW = 16;
  const padRight = 8;
  const padTop = 8;
  const padBottom = 22;
  const plotH = height - padTop - padBottom;
  const plotW = Math.max(0, width - labelW - padRight);
  const coords = shown.map((point, index) => {
    const x = shown.length <= 1 ? plotW / 2 : (index / (shown.length - 1)) * plotW;
    const y = ((4 - point.level) / 3) * plotH;
    return { x, y, point };
  });

  return (
    <View style={{ marginTop: 12 }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {story ? (
        <Text style={{ color: shell.foreground, fontFamily: theme.fonts.regular, fontSize: 13, lineHeight: 18 }}>
          {story}
        </Text>
      ) : null}
      <View style={{ height, marginTop: 8 }}>
        {[4, 3, 2, 1].map((level) => (
          <Text
            key={level}
            style={{
              position: "absolute",
              left: 0,
              top: padTop + ((4 - level) / 3) * plotH - 6,
              width: labelW,
              color: shell.muted,
              fontSize: 10,
              fontFamily: theme.fonts.semibold,
            }}
          >
            {level}
          </Text>
        ))}
        {width > 0
          ? coords.slice(0, -1).map((from, index) => {
              const to = coords[index + 1];
              if (!to) return null;
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const length = Math.hypot(dx, dy);
              return (
                <View
                  key={`line-${index}`}
                  style={{
                    position: "absolute",
                    left: labelW + (from.x + to.x) / 2 - length / 2,
                    top: padTop + (from.y + to.y) / 2 - 1,
                    width: length,
                    height: 2,
                    borderRadius: 1,
                    backgroundColor: theme.colors.green,
                    transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                  }}
                />
              );
            })
          : null}
        {coords.map(({ x, y, point }, index) => (
          <View
            key={`dot-${index}-${point.date}-${point.level}`}
            style={{
              position: "absolute",
              left: labelW + x - 5,
              top: padTop + y - 5,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: LEVEL_COLORS[point.level - 1],
              borderWidth: 2,
              borderColor: shell.background,
            }}
          />
        ))}
        {coords.map(({ x, point }, index) => (
          <Text
            key={`day-${index}-${point.date}`}
            style={{
              position: "absolute",
              left: labelW + x - 14,
              top: height - 16,
              width: 28,
              textAlign: "center",
              color: shell.muted,
              fontSize: 10,
              fontFamily: theme.fonts.semibold,
            }}
          >
            {point.date.slice(8)}
          </Text>
        ))}
      </View>
    </View>
  );
}

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
  full = false,
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
  full?: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const theme = useTheme();
  const { request } = useSession();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [boxHeight, setBoxHeight] = useState(0);
  const [expanded, setExpanded] = useState(full);
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
  const [levels, setLevels] = useState<LevelPoint[]>([]);
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
    setExpanded(full);
    setGrammarSlug(null);
    setExplanation(null);
    setSuggestedTranslation(null);
    setExplanationError(null);
    setActionError(null);
  }, [clean, full]);

  useEffect(() => {
    if (vaultId || localSaved || vaults.length === 0) return;
    setVaultId(String(vaults[0].id));
  }, [vaultId, localSaved, vaults]);

  useEffect(() => {
    if (!localSaved) {
      setLevels([]);
      return;
    }
    let cancelled = false;
    request<LevelPoint[]>(`/words/${localSaved.id}/levels`)
      .then((rows) => {
        if (!cancelled) setLevels(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setLevels([]);
      });
    return () => {
      cancelled = true;
    };
  }, [localSaved?.id, localSaved?.confidence, request]);

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

  const sheet = full;
  const details = sheet || expanded;
  const margin = 12;
  const gap = 8;
  const cardWidth = sheet ? window.width : Math.min(340, window.width - margin * 2);
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
  const maxCard = details ? Math.min(window.height * 0.72, 560) : Math.min(window.height * 0.46, 380);
  const levelBar = (
    <View style={[styles.footer, sheet && styles.sheetFooter]}>
      {localSaved ? (
        <Pressable disabled={saving} onPress={() => void handleRemove()} style={styles.removeButton}>
          <Ionicons name="trash-outline" size={sheet ? 18 : 14} color={shell.muted} />
          {sheet ? null : (
            <Text style={{ color: shell.muted, fontFamily: theme.fonts.semibold, fontSize: 12 }}>Remover</Text>
          )}
        </Pressable>
      ) : (
        <View style={{ width: sheet ? 36 : 0 }} />
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
                sheet && styles.levelButtonSheet,
                {
                  backgroundColor: active ? LEVEL_COLORS[level - 1] : shell.chip,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? LEVEL_TEXT[level - 1] : shell.muted,
                  fontFamily: theme.fonts.bold,
                  fontSize: 13,
                }}
              >
                {level}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {sheet ? (
        <Pressable
          accessibilityLabel="Fechar painel"
          onPress={onClose}
          style={[styles.sheetDone, { backgroundColor: theme.colors.green }]}
        >
          <Ionicons name="checkmark" size={20} color={shell.foreground} />
        </Pressable>
      ) : null}
    </View>
  );
  const contextPanel = (
    <View style={sheet ? { marginTop: 14 } : styles.contextDock}>
      {explanation && !explaining ? (
        <View style={styles.contextBox}>
          <Pressable disabled={!context} onPress={() => void handleContextualize()}>
            <Text style={[styles.contextAction, { fontFamily: theme.fonts.semibold }]}>Explicar contexto</Text>
          </Pressable>
          {sheet ? (
            <Text style={[styles.contextBody, { fontFamily: theme.fonts.regular }]}>{explanation}</Text>
          ) : (
            <ScrollView style={{ maxHeight: 112 }} nestedScrollEnabled>
              <Text style={[styles.contextBody, { fontFamily: theme.fonts.regular }]}>{explanation}</Text>
            </ScrollView>
          )}
          {suggestedTranslation ? (
            <View style={styles.translationRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.section, { fontFamily: theme.fonts.semibold, color: theme.colors.greenText }]}>Tradução</Text>
                <Text style={[styles.contextBody, { fontFamily: theme.fonts.semibold, color: shell.foreground }]}>
                  {suggestedTranslation}
                </Text>
              </View>
              <Pressable
                disabled={saving || !resolvedVaultId || hasMeaning(selectedMeanings, suggestedTranslation)}
                onPress={() => void handleAddMeaning(suggestedTranslation)}
                style={styles.saveChip}
              >
                <Ionicons
                  name={hasMeaning(selectedMeanings, suggestedTranslation) ? "checkmark" : "add"}
                  size={14}
                  color={theme.colors.greenText}
                />
                <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.semibold, fontSize: 12 }}>
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
          <Ionicons name="sparkles" size={14} color={shell.onPastel} />
          <Text style={{ color: shell.onPastel, fontFamily: theme.fonts.semibold, fontSize: 13 }}>
            {explaining ? "Explicando..." : "Explicar contexto"}
          </Text>
        </Pressable>
      )}
      {explanationError ? (
        <Text style={[styles.error, { fontFamily: theme.fonts.regular }]}>{explanationError}</Text>
      ) : null}
    </View>
  );
  const dockReserve = !sheet && details ? (explanation && !explaining ? 168 : 84) : 36;

  return (
    <Modal transparent={!sheet} visible animationType={sheet ? "slide" : "fade"} onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: sheet ? shell.background : "transparent" }}>
        {sheet ? null : <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={onClose} />}
        <View
          onLayout={(event) => {
            if (sheet) return;
            const next = event.nativeEvent.layout.height;
            setBoxHeight((current) => (Math.abs(current - next) < 1 ? current : next));
          }}
          style={sheet ? styles.sheet : { position: "absolute", top, left, width: cardWidth }}
        >
          {!sheet && !placeAbove ? <Arrow pointing="up" left={arrowLeft} /> : null}
          <View style={[styles.card, sheet && styles.cardSheet, sheet && { paddingTop: insets.top }]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              bounces={sheet}
              style={sheet ? { flex: 1 } : { maxHeight: Math.max(140, maxCard - dockReserve) }}
              contentContainerStyle={{ paddingBottom: sheet ? 24 : 8 }}
            >
              <View style={[styles.header, sheet && { paddingHorizontal: 16, paddingTop: 12 }]}>
                <View style={styles.headerTitle}>
                  <IconButton
                    label={`Ouvir ${clean}`}
                    name="volume-high-outline"
                    color={shell.muted}
                    onPress={() => speakWord(clean)}
                  />
                  <Text numberOfLines={1} style={[styles.word, { fontFamily: theme.fonts.bold }]}>
                    {clean}
                  </Text>
                </View>
                <View style={styles.headerActions}>
                  {localSaved && !sheet ? <Ionicons name="checkmark" size={18} color={theme.colors.green} /> : null}
                  {sheet ? null : (
                    <IconButton
                      label="Remover palavra"
                      name="trash-outline"
                      color={shell.muted}
                      disabled={saving || !localSaved}
                      onPress={() => void handleRemove()}
                    />
                  )}
                  <IconButton label="Fechar painel" name="close" color={shell.muted} onPress={onClose} />
                </View>
              </View>

              <View style={[styles.body, sheet && { paddingHorizontal: 16 }]}>
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
                        <Text style={{ color: shell.chipText, fontSize: 12, fontFamily: theme.fonts.medium }}>
                          {grammarClassLabel(badge)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {localSaved ? (
                  <LevelTrack
                    points={
                      levels.length > 0
                        ? levels
                        : [{ date: localDay(), level: Math.min(4, Math.max(1, confidence || 1)) }]
                    }
                  />
                ) : null}

                {grammar ? (
                  <View style={styles.grammar}>
                    <Text style={[styles.grammarTitle, { fontFamily: theme.fonts.bold }]}>{grammar.label}</Text>
                    <Text style={[styles.grammarText, { fontFamily: theme.fonts.regular }]}>{grammar.summary}</Text>
                    <Text style={[styles.grammarText, { fontFamily: theme.fonts.regular }]}>{grammar.explanation}</Text>
                    <Text style={[styles.grammarExample, { fontFamily: theme.fonts.semibold }]}>{grammar.exampleEn}</Text>
                    <Text style={[styles.grammarText, { fontFamily: theme.fonts.regular }]}>{grammar.examplePt}</Text>
                  </View>
                ) : null}

                {!details && dropdownMeaning ? (
                  <MeaningRow
                    label={dropdownMeaning}
                    saved={dropdownSaved}
                    disabled={saving || !resolvedVaultId}
                    onAdd={() => void handleAddMeaning(dropdownMeaning)}
                  />
                ) : null}
                {!details && !dropdownMeaning && (loadingInfo || translating) ? (
                  <Text style={[styles.hint, { fontFamily: theme.fonts.regular }]}>Buscando tradução…</Text>
                ) : null}

                <View style={styles.inputRow}>
                  <TextInput
                    value={customMeaning}
                    onChangeText={setCustomMeaning}
                    onSubmitEditing={() => void handleAddMeaning(customMeaning)}
                    placeholder={sheet ? "Digite um novo significado aqui" : "Novo significado"}
                    placeholderTextColor={shell.muted}
                    style={[styles.input, sheet && styles.inputBox, { fontFamily: theme.fonts.regular }]}
                  />
                  <IconButton
                    label="Sugerir tradução"
                    name="sparkles"
                    color={shell.tones.lilac}
                    disabled={!clean || suggesting || suggestionLocked}
                    onPress={() => void handleSuggest()}
                  />
                  {suggesting ? <ActivityIndicator size="small" color={shell.tones.lilac} /> : null}
                  <IconButton
                    label="Adicionar significado"
                    name="add"
                    color={shell.foreground}
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

                {details ? (
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
                                  color: active ? theme.colors.green : shell.foreground,
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
                        <Text style={[styles.section, { fontFamily: theme.fonts.semibold }]}>Significados salvos</Text>
                        {selectedMeanings.map((item) => (
                          <View key={item} style={styles.savedRow}>
                            <Text style={[styles.savedText, { fontFamily: theme.fonts.regular }]}>{item}</Text>
                            <IconButton
                              label={`Remover ${item}`}
                              name="close"
                              color={shell.onPastel}
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
                            <Ionicons name="add" size={16} color={shell.muted} />
                          </Pressable>
                        ))
                      : null}

                    {relatedPhrases.length > 0 ? (
                      <View style={{ marginTop: 14 }}>
                        <Text style={[styles.section, { fontFamily: theme.fonts.semibold }]}>Frases relacionadas</Text>
                        <View style={styles.phraseWrap}>
                          {relatedPhrases.map((phrase) => (
                            <View key={phrase} style={styles.phraseChip}>
                              <Text style={[styles.phraseChipText, { fontFamily: theme.fonts.regular }]}>{phrase}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}

                    {sheet ? contextPanel : null}

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

                    <Text style={[styles.section, { marginTop: 14, fontFamily: theme.fonts.semibold }]}>Anotações</Text>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      onBlur={() => void handleNotesBlur()}
                      placeholder="Adicionar anotação aqui"
                      placeholderTextColor={shell.muted}
                      multiline
                      style={[styles.notes, { fontFamily: theme.fonts.regular }]}
                    />

                    {sheet ? null : levelBar}
                  </View>
                ) : null}

                {actionError ? (
                  <Text style={[styles.error, { fontFamily: theme.fonts.regular }]}>{actionError}</Text>
                ) : null}
              </View>
            </ScrollView>
            {details && !sheet ? contextPanel : null}
            {sheet ? (
              <View style={{ paddingBottom: insets.bottom }}>{levelBar}</View>
            ) : (
              <Pressable
                accessibilityLabel={expanded ? "Recolher painel" : "Expandir painel"}
                onPress={() => setExpanded((current) => !current)}
                style={styles.chevron}
              >
                <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={shell.muted} />
              </Pressable>
            )}
          </View>
          {!sheet && placeAbove ? <Arrow pointing="down" left={arrowLeft} /> : null}
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
        <Ionicons name="checkmark" size={16} color={theme.colors.green} />
      ) : (
        <IconButton label={`Salvar ${label}`} name="add" color={shell.muted} disabled={disabled} onPress={onAdd} />
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
        borderBottomColor: shell.background,
        borderTopColor: shell.background,
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
  sheet: { flex: 1 },
  card: {
    backgroundColor: shell.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: shell.line,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  cardSheet: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  sheetFooter: {
    marginTop: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: shell.line,
  },
  sheetDone: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  inputBox: {
    height: 48,
    borderWidth: 1,
    borderBottomWidth: 1,
    borderColor: shell.line,
    borderRadius: 16,
    backgroundColor: shell.surface,
    paddingHorizontal: 14,
  },
  phraseWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  phraseChip: {
    backgroundColor: shell.chip,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  phraseChipText: { color: shell.chipText, fontSize: 13 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  headerTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4, minWidth: 0 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  word: { flex: 1, color: shell.foreground, fontSize: 28 },
  body: { paddingHorizontal: 16, paddingBottom: 4 },
  badges: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 },
  level: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badge: {
    backgroundColor: shell.chip,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  grammar: {
    backgroundColor: shell.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    gap: 4,
  },
  grammarTitle: { color: shell.foreground, fontSize: 16 },
  grammarText: { color: shell.muted, fontSize: 13, lineHeight: 18 },
  grammarExample: { color: shell.foreground, fontSize: 13, marginTop: 4 },
  meaningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: shell.line,
  },
  meaning: { flex: 1, color: shell.foreground, fontSize: 14, lineHeight: 20 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  input: {
    flex: 1,
    height: 36,
    color: shell.foreground,
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: shell.line,
    paddingHorizontal: 2,
  },
  hint: { color: shell.muted, fontSize: 12, marginTop: 6, lineHeight: 18 },
  error: { color: shell.dangerOnDark, fontSize: 12, marginTop: 6 },
  section: { color: shell.muted, fontSize: 13, marginTop: 16 },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: shell.tones.green,
    borderRadius: 14,
    paddingLeft: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  savedText: { flex: 1, color: shell.onPastel, fontSize: 14, lineHeight: 20 },
  popularRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: shell.chip,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  popularText: { flex: 1, color: shell.foreground, fontSize: 14, lineHeight: 20 },
  phrase: { color: shell.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  contextBox: {
    borderWidth: 1,
    borderColor: shell.line,
    backgroundColor: shell.surface,
    borderRadius: 16,
    padding: 14,
  },
  contextAction: { color: shell.foreground, fontSize: 13 },
  contextBody: { color: shell.foreground, fontSize: 14, lineHeight: 20, marginTop: 6 },
  contextDock: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: shell.line,
  },
  contextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: shell.tones.lilac,
    borderRadius: 16,
    paddingVertical: 14,
  },
  translationRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  saveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: shell.chip,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  origin: { borderLeftWidth: 3, borderLeftColor: shell.tones.green, paddingLeft: 10, marginTop: 10 },
  notes: {
    minHeight: 72,
    marginTop: 8,
    borderWidth: 1,
    borderColor: shell.line,
    borderRadius: 16,
    backgroundColor: shell.surface,
    color: shell.foreground,
    fontSize: 14,
    padding: 12,
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
  levelButtonSheet: { width: 42, height: 42, borderRadius: 21 },
  vaults: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vaultChip: {
    backgroundColor: shell.chip,
    borderWidth: 1,
    borderColor: shell.chip,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  vaultChipActive: { borderColor: shell.tones.green },
  chevron: { alignItems: "center", justifyContent: "center", paddingVertical: 6 },
});
