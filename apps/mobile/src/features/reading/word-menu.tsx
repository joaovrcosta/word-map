import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type NativeSyntheticEvent,
  type TextInputFocusEventData,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { type Href, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import {
  buildReadingContext,
  DEFAULT_PHRASES_VAULT_NAME,
  DEFAULT_WORDS_VAULT_NAME,
  extractRelatedSentences,
  formatOriginDate,
  grammarClassBySlug,
  grammarClassLabel,
  isPhraseName,
  MAX_FOLLOW_UP_QUESTION,
  MAX_FOLLOW_UP_SENTENCE,
  MAX_FOLLOW_UPS_PER_EXPLANATION,
  normalizeGrammaticalClass,
  normalizePhrase,
  resolveGrammarSlug,
  splitParagraphs,
  type DictionaryEntry,
  type ReadingPage,
  type TutorFollowUpResponse,
  type TutorFollowUpTurn,
} from "@word-map/shared";
import { userFacingError } from "../../api";
import { useSession } from "../../session";
import { speakWord } from "../../speech";
import { shell, useTheme } from "../../theme";
import { useReaderTheme } from "./reader-theme";
import { type Vault, type Word } from "../../types";
import { type WordAnchor } from "./page-text";

const LEVEL_COLORS = ["#ff4b4b", "#ff9600", "#ffc800", "#24c875"];
const LEVEL_TEXT = [shell.foreground, shell.foreground, shell.onPastel, shell.foreground];
const GLOW_EDGE = "rgba(201, 242, 196, 0.42)";
const GLOW_MID = "rgba(155, 232, 184, 0.18)";
const GLOW_BAND = 32;
/** Secundário legível no painel escuro (shell.muted fica fraco em corpo de texto). */
const PANEL_SECONDARY = "#C7C7CC";
const PANEL_PLACEHOLDER = "#AEAEB2";
/** Card elevado: shell.surface (#1C1C1E) quase some no fundo (#121212). */
const PANEL_CARD = "#2C2C2E";
const PANEL_CARD_SOFT = "#252528";

function celebrateSave() {
  if (Platform.OS !== "web") {
    void (async () => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await new Promise((resolve) => setTimeout(resolve, 100));
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // dispositivo sem haptic
      }
    })();
  }
  AccessibilityInfo.announceForAccessibility("Palavra salva");
}

function SaveBorderPulse({ pulseKey, sheet }: { pulseKey: number; sheet: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const radius = sheet ? 0 : 20;

  useEffect(() => {
    if (pulseKey <= 0) return;
    let active: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    opacity.setValue(0);

    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        active = Animated.sequence([
          Animated.timing(opacity, { toValue: 0.5, duration: 140, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 320, useNativeDriver: true }),
        ]);
      } else {
        active = Animated.sequence([
          Animated.timing(opacity, { toValue: 0.85, duration: 110, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.18, duration: 90, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.65, duration: 110, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 380, useNativeDriver: true }),
        ]);
      }
      active.start();
    });

    return () => {
      cancelled = true;
      active?.stop();
      opacity.stopAnimation();
    };
  }, [pulseKey, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity,
          borderRadius: radius,
          overflow: "hidden",
          zIndex: 28,
        },
      ]}
    >
      {/* Fade nas 4 bordas: mint → transparente para o centro */}
      <LinearGradient
        colors={[GLOW_EDGE, GLOW_MID, "transparent"]}
        locations={[0, 0.4, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: GLOW_BAND }}
      />
      <LinearGradient
        colors={["transparent", GLOW_MID, GLOW_EDGE]}
        locations={[0, 0.6, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: GLOW_BAND }}
      />
      <LinearGradient
        colors={[GLOW_EDGE, GLOW_MID, "transparent"]}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: GLOW_BAND }}
      />
      <LinearGradient
        colors={["transparent", GLOW_MID, GLOW_EDGE]}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: GLOW_BAND }}
      />
    </Animated.View>
  );
}

function SavedCheckIcon({ pulseKey, size = 18 }: { pulseKey: number; size?: number }) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pulseKey <= 0) return;
    let active: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    opacity.setValue(0.4);
    scale.setValue(0.7);

    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        active = Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        });
      } else {
        active = Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(scale, { toValue: 1.12, duration: 180, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1, duration: 160, useNativeDriver: true }),
          ]),
        ]);
      }
      active.start();
    });

    return () => {
      cancelled = true;
      active?.stop();
      opacity.stopAnimation();
      scale.stopAnimation();
    };
  }, [pulseKey, opacity, scale]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ opacity, transform: [{ scale }] }}
    >
      <Ionicons name="checkmark" size={size} color={theme.colors.green} />
    </Animated.View>
  );
}
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

function LevelTrack({ points, compact = false }: { points: LevelPoint[]; compact?: boolean }) {
  const theme = useTheme();
  const story = levelStory(points);
  const shown = points.slice(-14);
  const [width, setWidth] = useState(0);
  const height = compact ? 72 : 120;
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
        <Text style={{ color: shell.muted, fontFamily: theme.fonts.medium, fontSize: 14, lineHeight: 20 }}>
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
  const needle = normalizePhrase(clean);
  const matchesSurface = (value: string) =>
    normalizePhrase(value) === needle || value.toLowerCase() === clean.toLowerCase();

  // Só a forma exata da superfície (knew ≠ know). Lemma no check-text
  // ainda destaca no texto, mas não reutiliza a palavra do vault.
  for (const item of foundWords) {
    if (!matchesSurface(item.word)) continue;
    for (const vault of item.vaultInfo) {
      const word = vault.words.find((entry) => matchesSurface(entry.name));
      if (!word) continue;
      const stored = vaults
        .find((row) => row.id === vault.id)
        ?.words.find((entry) => entry.id === word.id);
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
  }

  for (const vault of vaults) {
    const word = vault.words.find((entry) => matchesSurface(entry.name));
    if (!word) continue;
    return {
      id: word.id,
      name: word.name,
      vaultId: vault.id,
      vaultName: vault.name,
      translations: word.translations,
      grammaticalClass: word.grammaticalClass,
      confidence: word.confidence,
      notes: word.notes ?? null,
    };
  }

  return null;
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
  voiceId = null,
  onClose,
  onChanged,
  onCloseSession,
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
  voiceId?: string | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onCloseSession?: (info: { dirty: boolean; materialized: boolean }) => void;
}) {
  const theme = useTheme();
  const reader = useReaderTheme();
  const router = useRouter();
  const { request } = useSession();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(full);
  const [localSaved, setLocalSaved] = useState<SavedReadingWord | null>(saved);
  const dirtyRef = useRef(false);
  const materializedRef = useRef(false);
  const markDirty = () => {
    dirtyRef.current = true;
  };
  const requestClose = () => {
    const info = { dirty: dirtyRef.current, materialized: materializedRef.current };
    if (onCloseSession) onCloseSession(info);
    else onClose();
  };
  const [selectedMeanings, setSelectedMeanings] = useState<string[]>(saved?.translations ?? []);
  const [customMeaning, setCustomMeaning] = useState("");
  const [notes, setNotes] = useState(saved?.notes ?? "");
  const phraseSelection = isPhraseName(clean);
  const defaultVaultId = (() => {
    if (saved) return String(saved.vaultId);
    if (phraseSelection) {
      const phrases = vaults.find((item) => item.name === DEFAULT_PHRASES_VAULT_NAME);
      if (phrases) return String(phrases.id);
    }
    const words = vaults.find((item) => item.name === DEFAULT_WORDS_VAULT_NAME);
    return String(words?.id ?? vaults[0]?.id ?? "");
  })();
  const [vaultId, setVaultId] = useState(defaultVaultId);
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
  const [followUps, setFollowUps] = useState<TutorFollowUpTurn[]>([]);
  const [followOpen, setFollowOpen] = useState(false);
  const [followQuestion, setFollowQuestion] = useState("");
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [savePulseKey, setSavePulseKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [levels, setLevels] = useState<LevelPoint[]>([]);
  const [grammarSlug, setGrammarSlug] = useState<string | null>(null);
  const suggestingRef = useRef(false);
  const followBusyRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const placeAboveLockRef = useRef<boolean | null>(null);
  const [cardBoxHeight, setCardBoxHeight] = useState(0);
  const [keyboardPad, setKeyboardPad] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => setKeyboardPad(event.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardPad(0)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const scrollInputIntoView = (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
    const target = event?.nativeEvent?.target;
    const scroller = scrollRef.current as
      | (ScrollView & {
          scrollResponderScrollNativeHandleToKeyboard?: (
            nodeHandle: number,
            additionalOffset: number,
            preventNegativeScrollOffset: boolean
          ) => void;
        })
      | null;
    if (target != null && typeof scroller?.scrollResponderScrollNativeHandleToKeyboard === "function") {
      setTimeout(() => {
        scroller.scrollResponderScrollNativeHandleToKeyboard?.(Number(target), 90, true);
      }, 80);
      return;
    }
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  const savedKey = saved
    ? `${saved.id}|${saved.translations.join("\n")}|${saved.confidence}|${saved.notes ?? ""}|${saved.vaultId}|${saved.grammaticalClass}`
    : "";

  useEffect(() => {
    setLocalSaved(saved);
    placeAboveLockRef.current = null;
    setCardBoxHeight(0);
  }, [clean, savedKey, anchor.x, anchor.y, anchor.width, anchor.height]);

  useEffect(() => {
    // Expandir/recolher muda a altura alvo — reposiciona uma vez, sem flipar no meio do save
    placeAboveLockRef.current = null;
    setCardBoxHeight(0);
  }, [expanded, full]);

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
    setFollowUps([]);
    setFollowOpen(false);
    setFollowQuestion("");
    setFollowBusy(false);
    setFollowError(null);
    followBusyRef.current = false;
    setSavePulseKey(0);
    setActionError(null);
  }, [clean, full]);

  useEffect(() => {
    if (localSaved) {
      setVaultId(String(localSaved.vaultId));
      return;
    }
    if (phraseSelection) {
      const phrases = vaults.find((item) => item.name === DEFAULT_PHRASES_VAULT_NAME);
      if (phrases) {
        setVaultId(String(phrases.id));
        return;
      }
    }
    const words = vaults.find((item) => item.name === DEFAULT_WORDS_VAULT_NAME);
    setVaultId(String(words?.id ?? vaults[0]?.id ?? ""));
  }, [clean, localSaved, phraseSelection, vaults]);

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

  const suggestedClass = phraseSelection
    ? "frase"
    : normalizeGrammaticalClass(
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

  const persistMeanings = async (
    translations: string[],
    nextConfidence?: number
  ): Promise<SavedReadingWord> => {
    markDirty();
    setSaving(true);
    setActionError(null);
    try {
      if (!localSaved && !resolvedVaultId) {
        throw new Error("Crie um vault para salvar palavras.");
      }
      let next: SavedReadingWord;
      if (localSaved) {
        const updated = await request<Word>(`/words/${localSaved.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            translations,
            ...(nextConfidence != null ? { confidence: nextConfidence } : {}),
            origin: origin(),
          }),
        });
        next = toSaved(updated, localSaved.vaultName);
        setLocalSaved(next);
        setSelectedMeanings(next.translations);
        await refreshOrigins(next.id);
        materializedRef.current = true;
      } else {
        const created = await request<Word>("/words", {
          method: "POST",
          body: JSON.stringify({
            name: phraseSelection ? normalizePhrase(clean) : clean,
            grammaticalClass: suggestedClass,
            translations: translations.length ? translations : [clean],
            notes: notes.trim() || null,
            confidence: nextConfidence ?? 1,
            vaultId: Number(resolvedVaultId),
            origin: origin(),
          }),
        });
        const vaultName = vaults.find((item) => item.id === created.vaultId)?.name ?? "";
        next = toSaved(created, vaultName);
        setLocalSaved(next);
        setSelectedMeanings(next.translations);
        await refreshOrigins(next.id);
        materializedRef.current = true;
      }
      try {
        await onChanged();
      } catch {
        setActionError(null);
      }
      return next;
    } catch (error) {
      const message = userFacingError(error, "Não foi possível salvar");
      setActionError(message);
      throw error instanceof Error ? error : new Error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMeaning = async (value: string) => {
    const meaning = value.trim();
    if (!meaning || hasMeaning(selectedMeanings, meaning) || saving) return;
    markDirty();
    const previous = selectedMeanings;
    const next = [...selectedMeanings, meaning];
    setSelectedMeanings(next);
    setCustomMeaning("");
    setSavePulseKey((key) => key + 1);
    celebrateSave();
    try {
      await persistMeanings(next);
    } catch {
      setSelectedMeanings(previous);
      setCustomMeaning(meaning);
    }
  };

  const handleRemoveMeaning = async (value: string) => {
    markDirty();
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
    markDirty();
    if (localSaved) {
      setSaving(true);
      setActionError(null);
      try {
        const updated = await request<Word>(`/words/${localSaved.id}`, {
          method: "PATCH",
          body: JSON.stringify({ confidence: level }),
        });
        setLocalSaved(toSaved(updated, localSaved.vaultName));
        materializedRef.current = true;
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
    markDirty();
    setSaving(true);
    setActionError(null);
    try {
      const updated = await request<Word>(`/words/${localSaved.id}`, {
        method: "PATCH",
        body: JSON.stringify({ notes: value }),
      });
      setLocalSaved(toSaved(updated, localSaved.vaultName));
      materializedRef.current = true;
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
    markDirty();
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
      materializedRef.current = true;
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
      const sentence = context?.sentence?.trim() || null;
      const data = await request<{ translation?: string }>("/tutor/suggest-translation", {
        method: "POST",
        body: JSON.stringify({
          word: clean,
          // Hermes muitas vezes não tem Intl.Segmenter → a "frase" vira o parágrafo todo.
          sentence: sentence ? sentence.slice(0, 400) : null,
          wordId: localSaved?.id,
        }),
      });
      const translation = data.translation?.trim();
      if (!translation) throw new Error("Não foi possível sugerir uma tradução.");
      setCustomMeaning(translation);
      setSuggestionLocked(true);
      locked = true;
      setSuggestError(null);
    } catch (error) {
      setSuggestError(userFacingError(error, "Não foi possível sugerir uma tradução."));
    } finally {
      setSuggesting(false);
      if (!locked) suggestingRef.current = false;
    }
  };

  const resetFollowUps = () => {
    setFollowUps([]);
    setFollowOpen(false);
    setFollowQuestion("");
    setFollowError(null);
    setFollowBusy(false);
    followBusyRef.current = false;
  };

  const handleContextualize = async () => {
    if (!context || explaining) return;
    setExplaining(true);
    setExplanationError(null);
    resetFollowUps();
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
      setExplanationError(null);
    } catch (error) {
      setExplanationError(userFacingError(error, "Não foi possível explicar este trecho."));
    } finally {
      setExplaining(false);
    }
  };

  const handleFollowUp = async () => {
    if (!context || !explanation || followBusyRef.current || followBusy) return;
    if (followUps.length >= MAX_FOLLOW_UPS_PER_EXPLANATION) return;
    const question = followQuestion.trim().slice(0, MAX_FOLLOW_UP_QUESTION);
    if (!question) return;
    followBusyRef.current = true;
    setFollowBusy(true);
    setFollowError(null);
    try {
      const data = await request<TutorFollowUpResponse>("/tutor/follow-up", {
        method: "POST",
        body: JSON.stringify({
          span: context.span,
          sentence: context.sentence.slice(0, MAX_FOLLOW_UP_SENTENCE),
          explanation,
          question,
          previousTurns: followUps,
        }),
      });
      const answer = data.answer?.trim();
      if (!answer) throw new Error("Não foi possível responder esta dúvida.");
      setFollowUps((current) => [...current, { question, answer }]);
      setFollowQuestion("");
      setFollowError(null);
    } catch (error) {
      setFollowError(userFacingError(error, "Não foi possível responder esta dúvida."));
    } finally {
      setFollowBusy(false);
      followBusyRef.current = false;
    }
  };

  const sheet = full;
  const details = sheet || expanded;
  const margin = 12;
  const gap = 8;
  const edgePad = Math.max(insets.bottom, 12) + 8;
  const arrowH = 8;
  const chevronH = 36;
  const cardWidth = sheet ? window.width : Math.min(340, window.width - margin * 2);
  const safeAnchor =
    anchor.width > 0
      ? anchor
      : { x: window.width / 2, y: window.height * 0.35, width: 1, height: 1 };
  let left = safeAnchor.x + safeAnchor.width / 2 - cardWidth / 2;
  left = Math.max(margin, Math.min(left, window.width - cardWidth - margin));
  const belowTop = safeAnchor.y + safeAnchor.height + gap;
  const spaceBelow = Math.max(160, window.height - belowTop - edgePad);
  const spaceAbove = Math.max(160, safeAnchor.y - gap - edgePad);
  // Compacto: altura = conteúdo (sem buraco). LevelTrack só ao expandir → salvar não desloca.
  const COMPACT_ESTIMATE = 300;
  const availableGuess = Math.max(spaceBelow, spaceAbove) - arrowH;
  const maxExpanded = Math.min(window.height * 0.7, availableGuess);
  const maxCompact = Math.min(window.height * 0.45, availableGuess);
  const placeAboveNeeded =
    belowTop + (details ? maxExpanded : Math.min(COMPACT_ESTIMATE, maxCompact)) + arrowH >
      window.height - edgePad && spaceAbove >= spaceBelow;
  if (placeAboveLockRef.current === null) {
    placeAboveLockRef.current = placeAboveNeeded;
  }
  const placeAbove = placeAboveLockRef.current;
  const available = (placeAbove ? spaceAbove : spaceBelow) - arrowH;
  const fittedCard = Math.min(details ? window.height * 0.7 : window.height * 0.45, available);
  const measuredH = cardBoxHeight > 0 ? cardBoxHeight : Math.min(COMPACT_ESTIMATE, fittedCard) + arrowH;
  const top = placeAbove
    ? Math.max(edgePad, safeAnchor.y - gap - Math.min(measuredH, fittedCard + arrowH))
    : belowTop;
  const arrowLeft = Math.max(16, Math.min(safeAnchor.x + safeAnchor.width / 2 - left, cardWidth - 16));
  const scrollMax = Math.max(140, fittedCard - chevronH);
  const contextPanel = (
    <View>
      {explanation && !explaining ? (
        <View style={styles.contextBox}>
          <Pressable disabled={!context} onPress={() => void handleContextualize()}>
            <Text style={[styles.contextAction, { fontFamily: theme.fonts.semibold }]}>Explicar contexto</Text>
          </Pressable>
          <Text style={[styles.contextBody, { fontFamily: theme.fonts.regular }]}>{explanation}</Text>
          {suggestedTranslation ? (
            <View style={styles.translationRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.colors.greenText,
                    fontFamily: theme.fonts.semibold,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  Tradução
                </Text>
                <Text style={[styles.contextBody, { fontFamily: theme.fonts.semibold, color: shell.foreground, marginTop: 2 }]}>
                  {suggestedTranslation}
                </Text>
              </View>
              <Pressable
                disabled={saving || !resolvedVaultId || hasMeaning(selectedMeanings, suggestedTranslation)}
                onPress={() => void handleAddMeaning(suggestedTranslation)}
                style={[
                  styles.saveChip,
                  hasMeaning(selectedMeanings, suggestedTranslation)
                    ? { backgroundColor: theme.colors.green }
                    : { backgroundColor: reader.menu.chip },
                ]}
              >
                <Ionicons
                  name={hasMeaning(selectedMeanings, suggestedTranslation) ? "checkmark" : "add"}
                  size={14}
                  color={
                    hasMeaning(selectedMeanings, suggestedTranslation) ? "#ffffff" : theme.colors.greenText
                  }
                />
                <Text
                  style={{
                    color: hasMeaning(selectedMeanings, suggestedTranslation)
                      ? "#ffffff"
                      : theme.colors.greenText,
                    fontFamily: theme.fonts.semibold,
                    fontSize: 12,
                  }}
                >
                  {hasMeaning(selectedMeanings, suggestedTranslation) ? "Salva" : "Salvar"}
                </Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.followBox}>
            {!followOpen ? (
              <Pressable onPress={() => setFollowOpen(true)} hitSlop={6}>
                <Text style={[styles.followGate, { color: PANEL_SECONDARY, fontFamily: theme.fonts.medium }]}>
                  Não entendi ainda
                </Text>
              </Pressable>
            ) : (
              <>
                <Text style={[styles.followTitle, { color: PANEL_SECONDARY, fontFamily: theme.fonts.semibold }]}>
                  Ainda com dúvida? · {followUps.length}/{MAX_FOLLOW_UPS_PER_EXPLANATION}
                </Text>
                {followUps.map((turn, index) => (
                  <View key={`${index}-${turn.question}`} style={styles.followTurn}>
                    <Text style={[styles.followQuestion, { color: shell.foreground, fontFamily: theme.fonts.semibold }]}>
                      {turn.question}
                    </Text>
                    <Text style={[styles.contextBody, { fontFamily: theme.fonts.regular }]}>{turn.answer}</Text>
                  </View>
                ))}
                {followUps.length < MAX_FOLLOW_UPS_PER_EXPLANATION ? (
                  <View style={styles.followRow}>
                    <TextInput
                      value={followQuestion}
                      onChangeText={(value) => setFollowQuestion(value.slice(0, MAX_FOLLOW_UP_QUESTION))}
                      placeholder="Pergunte sobre esta explicação"
                      placeholderTextColor={PANEL_PLACEHOLDER}
                      editable={!followBusy}
                      autoFocus
                      onFocus={scrollInputIntoView}
                      style={[
                        styles.followInput,
                        {
                          color: shell.foreground,
                          fontFamily: theme.fonts.regular,
                          backgroundColor: theme.shell.chip,
                          borderColor: theme.shell.line,
                        },
                      ]}
                      onSubmitEditing={() => void handleFollowUp()}
                      returnKeyType="send"
                    />
                    <Pressable
                      accessibilityLabel="Enviar dúvida"
                      disabled={followBusy || !followQuestion.trim()}
                      onPress={() => void handleFollowUp()}
                      style={[styles.iconChip, { opacity: followBusy || !followQuestion.trim() ? 0.35 : 1 }]}
                    >
                      {followBusy ? (
                        <ActivityIndicator color={theme.colors.green} />
                      ) : (
                        <Ionicons name="send" size={16} color={theme.colors.greenText} />
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <Text style={[styles.followLimit, { color: PANEL_SECONDARY, fontFamily: theme.fonts.regular }]}>
                    Limite de 2 perguntas nesta explicação
                  </Text>
                )}
                {followError ? (
                  <Pressable onPress={() => void handleFollowUp()} hitSlop={6}>
                    <Text style={[styles.error, { fontFamily: theme.fonts.regular }]}>
                      {followError} · Tentar de novo
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        </View>
      ) : (
        <Pressable
          disabled={!context || explaining}
          onPress={() => void handleContextualize()}
          style={styles.contextButton}
        >
          <Ionicons name="sparkles" size={16} color={shell.onPastel} />
          <Text style={{ color: shell.onPastel, fontFamily: theme.fonts.bold, fontSize: 15 }}>
            {explaining ? "Explicando o trecho…" : "Explicar contexto"}
          </Text>
        </Pressable>
      )}
      {explanationError ? (
        <Pressable onPress={() => void handleContextualize()} hitSlop={6}>
          <Text style={[styles.error, { fontFamily: theme.fonts.regular }]}>
            {explanationError} · Tentar de novo
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
  const levelBar = (
    <View style={[styles.footer, sheet && styles.sheetFooter]}>
      {localSaved ? (
        <Pressable disabled={saving} onPress={() => void handleRemove()} style={styles.removeButton}>
          <View style={styles.iconChip}>
            <Ionicons name="trash-outline" size={sheet ? 18 : 14} color={shell.foreground} />
          </View>
          {sheet ? null : (
            <Text style={{ color: shell.muted, fontFamily: theme.fonts.semibold, fontSize: 12 }}>Remover</Text>
          )}
        </Pressable>
      ) : (
        <View style={{ width: sheet ? 42 : 0 }} />
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
          onPress={requestClose}
          style={[styles.sheetDone, { backgroundColor: theme.colors.green }]}
        >
          <Ionicons name="checkmark" size={22} color={shell.foreground} />
        </Pressable>
      ) : null}
    </View>
  );
  return (
    <Modal transparent={!sheet} visible animationType={sheet ? "slide" : "fade"} onRequestClose={requestClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: sheet ? reader.background : "transparent" }}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        {sheet ? null : <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={requestClose} />}
        <View
          onLayout={(event) => {
            if (sheet) return;
            const next = event.nativeEvent.layout.height;
            setCardBoxHeight((current) => (Math.abs(current - next) < 2 ? current : next));
          }}
          style={
            sheet
              ? styles.sheet
              : { position: "absolute", top, left, width: cardWidth, maxHeight: fittedCard + arrowH }
          }
        >
          {!sheet && !placeAbove ? <Arrow pointing="up" left={arrowLeft} /> : null}
          <View
            style={[
              styles.card,
              {
                backgroundColor: reader.menu.card,
                borderColor: reader.menu.cardBorder,
              },
              sheet && styles.cardSheet,
              sheet && { paddingTop: insets.top },
              !sheet && { maxHeight: fittedCard },
            ]}
          >
            <SaveBorderPulse pulseKey={savePulseKey} sheet={Boolean(sheet)} />
            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              bounces={sheet}
              nestedScrollEnabled
              style={sheet ? { flex: 1 } : { maxHeight: scrollMax }}
              contentContainerStyle={{
                // No card flutuante o KeyboardAvoidingView já move o bloco — não somar keyboardPad
                paddingBottom: sheet ? 24 + Math.max(0, keyboardPad - insets.bottom) : 8,
              }}
            >
              <View style={[styles.header, sheet && { paddingHorizontal: 20, paddingTop: 16 }]}>
                <View style={styles.headerTitle}>
                  <Pressable
                    accessibilityLabel={`Ouvir ${clean}`}
                    onPress={() => speakWord(clean, { voiceId })}
                    style={[styles.iconChip, { backgroundColor: reader.menu.chip }]}
                  >
                    <Ionicons name="volume-high-outline" size={18} color={reader.foreground} />
                  </Pressable>
                  <Text
                    numberOfLines={1}
                    style={[styles.word, { color: reader.foreground, fontFamily: theme.fonts.serifItalic }]}
                  >
                    {clean}
                  </Text>
                </View>
                <View style={styles.headerActions}>
                  <View style={styles.checkSlot}>
                    {localSaved ? <SavedCheckIcon pulseKey={savePulseKey} size={18} /> : null}
                  </View>
                  {sheet ? null : (
                    <IconButton
                      label="Remover palavra"
                      name="trash-outline"
                      color={reader.menu.muted}
                      disabled={saving || !localSaved}
                      onPress={() => void handleRemove()}
                    />
                  )}
                  <Pressable
                    accessibilityLabel="Fechar painel"
                    onPress={requestClose}
                    style={[styles.iconChip, { backgroundColor: reader.menu.chip }]}
                  >
                    <Ionicons name="close" size={18} color={reader.foreground} />
                  </Pressable>
                </View>
              </View>

              <View style={[styles.body, sheet && { paddingHorizontal: 20 }]}>
                <View style={styles.badges}>
                  {partOfSpeechBadges.map((badge) => {
                    const slug = resolveGrammarSlug(badge);
                    const active = Boolean(slug && grammarSlug === slug);
                    return (
                      <Pressable
                        key={badge}
                        disabled={!slug}
                        onPress={() => setGrammarSlug((current) => (current === slug ? null : slug))}
                        style={[styles.badge, active && styles.badgeActive]}
                      >
                        <Text
                          style={{
                            color: active ? shell.chipActiveText : shell.chipText,
                            fontSize: 11,
                            fontFamily: theme.fonts.medium,
                          }}
                        >
                          {grammarClassLabel(badge)}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {confidence > 0 ? (
                    <View
                      style={[
                        styles.level,
                        { backgroundColor: LEVEL_COLORS[Math.min(confidence, 4) - 1] },
                      ]}
                    >
                      <Text
                        style={{
                          color: LEVEL_TEXT[Math.min(confidence, 4) - 1],
                          fontFamily: theme.fonts.bold,
                          fontSize: 11,
                        }}
                      >
                        {confidence}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {localSaved && details ? (
                  <LevelTrack
                    compact={!sheet}
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
                  <MeaningSkeleton rows={2} compact />
                ) : null}

                <View style={styles.inputRow}>
                  <TextInput
                    value={customMeaning}
                    onChangeText={setCustomMeaning}
                    onFocus={scrollInputIntoView}
                    onSubmitEditing={() => void handleAddMeaning(customMeaning)}
                    placeholder={sheet ? "Digite um novo significado aqui" : "Novo significado"}
                    placeholderTextColor={PANEL_PLACEHOLDER}
                    style={[styles.input, sheet && styles.inputBox, { fontFamily: theme.fonts.regular }]}
                  />
                  <Pressable
                    accessibilityLabel={suggesting ? "Buscando tradução" : "Sugerir tradução"}
                    disabled={!clean || suggesting || suggestionLocked}
                    onPress={() => void handleSuggest()}
                    style={[styles.iconChip, { opacity: !clean || suggesting || suggestionLocked ? 0.35 : 1 }]}
                  >
                    {suggesting ? (
                      <ActivityIndicator size="small" color={shell.tones.lilac} />
                    ) : (
                      <Ionicons name="sparkles" size={18} color={shell.tones.lilac} />
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Adicionar significado"
                    disabled={!customMeaning.trim() || saving || !resolvedVaultId}
                    onPress={() => void handleAddMeaning(customMeaning)}
                    style={[
                      styles.iconChip,
                      {
                        backgroundColor: customMeaning.trim() ? shell.tones.cream : shell.chip,
                        opacity: !customMeaning.trim() || saving || !resolvedVaultId ? 0.35 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name="add"
                      size={20}
                      color={customMeaning.trim() ? shell.onPastel : shell.foreground}
                    />
                  </Pressable>
                </View>
                {suggestError ? (
                  <Pressable onPress={() => void handleSuggest()} hitSlop={6}>
                    <Text style={[styles.error, { fontFamily: theme.fonts.regular }]}>
                      {suggestError} · Tentar de novo
                    </Text>
                  </Pressable>
                ) : null}
                {!resolvedVaultId ? (
                  <Pressable
                    onPress={() => {
                      requestClose();
                      router.push("/vaults" as Href);
                    }}
                    style={styles.vaultCta}
                  >
                    <Text style={[styles.hint, { fontFamily: theme.fonts.regular, marginBottom: 0 }]}>
                      Crie um vault para salvar palavras.
                    </Text>
                    <Text style={{ color: theme.colors.green, fontFamily: theme.fonts.bold, fontSize: 13 }}>
                      Abrir vaults
                    </Text>
                  </Pressable>
                ) : null}

                {!sheet ? <View style={{ marginTop: 12 }}>{contextPanel}</View> : null}

                {details ? (
                  <View style={{ marginTop: 4 }}>
                    {!localSaved && vaults.length > 1 ? (
                      <View style={{ marginTop: 4, marginBottom: 4 }}>
                        <Text style={[styles.section, { fontFamily: theme.fonts.bold }]}>
                          Salvar neste vault
                        </Text>
                        <Text style={[styles.hint, { fontFamily: theme.fonts.regular, marginBottom: 8 }]}>
                          Escolha o cofre onde a palavra vai ser guardada.
                        </Text>
                        <View style={styles.vaults}>
                          {vaults.map((vault) => {
                            const active = resolvedVaultId === String(vault.id);
                            return (
                              <Pressable
                                key={vault.id}
                                onPress={() => {
                                  markDirty();
                                  setVaultId(String(vault.id));
                                }}
                                style={[styles.vaultChip, active && styles.vaultChipActive]}
                              >
                                <Ionicons
                                  name="folder-outline"
                                  size={14}
                                  color={active ? shell.chipActiveText : shell.chipText}
                                />
                                <Text
                                  style={{
                                    color: active ? shell.chipActiveText : shell.chipText,
                                    fontFamily: theme.fonts.semibold,
                                    fontSize: 13,
                                  }}
                                >
                                  {vault.name}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ) : null}

                    {selectedMeanings.length > 0 ? (
                      <View style={{ marginTop: 8 }}>
                        <Text style={[styles.section, { fontFamily: theme.fonts.bold }]}>Significados salvos</Text>
                        {selectedMeanings.map((item) => (
                          <View key={item} style={styles.savedRow}>
                            <Text style={[styles.savedText, { fontFamily: theme.fonts.medium }]}>{item}</Text>
                            <IconButton
                              label={`Remover ${item}`}
                              name="close"
                              color={shell.actionOnPastel}
                              onPress={() => void handleRemoveMeaning(item)}
                            />
                          </View>
                        ))}
                      </View>
                    ) : null}

                    <Text style={[styles.section, { fontFamily: theme.fonts.bold }]}>Significados populares</Text>
                    {loadingInfo || translating ? <MeaningSkeleton rows={3} /> : null}
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
                            <Text style={[styles.popularText, { fontFamily: theme.fonts.medium }]}>{item}</Text>
                            <View
                              style={[
                                styles.iconChip,
                                { width: 32, height: 32, borderRadius: 16, backgroundColor: "#3F3F42" },
                              ]}
                            >
                              <Ionicons name="add" size={18} color={shell.foreground} />
                            </View>
                          </Pressable>
                        ))
                      : null}

                    {relatedPhrases.length > 0 ? (
                      <View style={{ marginTop: 18 }}>
                        <Text style={[styles.section, { fontFamily: theme.fonts.bold }]}>Frases relacionadas</Text>
                        <View style={styles.phraseWrap}>
                          {relatedPhrases.map((phrase) => {
                            const short = phrase.trim().split(/\s+/).length <= 6;
                            return (
                              <View key={phrase} style={short ? styles.phraseChip : styles.phraseCard}>
                                <Text
                                  style={[
                                    short ? styles.phraseChipText : styles.phraseCardText,
                                    { fontFamily: theme.fonts.regular },
                                  ]}
                                >
                                  {phrase}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    ) : null}

                    {origins.length > 0 ? (
                      <View style={{ marginTop: 18 }}>
                        <Text style={[styles.section, { fontFamily: theme.fonts.bold }]}>
                          Origem dos significados
                        </Text>
                        {origins.map((item) => (
                          <View key={item.id} style={styles.origin}>
                            <Text style={[styles.hint, { fontFamily: theme.fonts.medium }]}>
                              {formatOriginDate(item.createdAt)}
                              {" · "}
                              {item.sourceTitle || "No vault"}
                            </Text>
                            <Text style={[styles.phrase, { fontFamily: theme.fonts.regular }]}>
                              {item.sentence || "Adicionada no vault"}
                            </Text>
                            <Text style={[styles.originMeaning, { fontFamily: theme.fonts.semibold }]}>
                              Significado: {item.meaning}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    <Text style={[styles.section, { marginTop: 18, fontFamily: theme.fonts.bold }]}>Anotações</Text>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      onFocus={scrollInputIntoView}
                      onBlur={() => void handleNotesBlur()}
                      placeholder="Adicionar anotação aqui"
                      placeholderTextColor={PANEL_PLACEHOLDER}
                      multiline
                      style={[
                        styles.notes,
                        !sheet && styles.notesCompact,
                        { fontFamily: theme.fonts.regular },
                      ]}
                    />

                    {sheet ? null : levelBar}
                  </View>
                ) : null}

                {actionError ? (
                  <Text style={[styles.error, { fontFamily: theme.fonts.regular }]}>{actionError}</Text>
                ) : null}
              </View>
            </ScrollView>
            {sheet && keyboardPad === 0 ? (
              <View style={[styles.sheetBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>{levelBar}</View>
            ) : sheet ? null : (
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
      </KeyboardAvoidingView>
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
      <View style={styles.meaningAction}>
        {saved ? (
          <Ionicons name="checkmark" size={16} color={theme.colors.green} />
        ) : (
          <IconButton label={`Salvar ${label}`} name="add" color={shell.muted} disabled={disabled} onPress={onAdd} />
        )}
      </View>
    </View>
  );
}

function MeaningSkeleton({ rows = 3, compact = false }: { rows?: number; compact?: boolean }) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const widths = [0.88, 0.72, 0.6];

  return (
    <View accessibilityLabel="Carregando significados" style={{ marginTop: compact ? 4 : 0 }}>
      {Array.from({ length: rows }, (_, index) => (
        <Animated.View
          key={index}
          style={[
            compact ? styles.skeletonCompact : styles.skeletonRow,
            { opacity: pulse },
          ]}
        >
          <View
            style={[
              styles.skeletonBar,
              { width: `${Math.round((widths[index % widths.length] ?? 0.7) * 100)}%` },
            ]}
          />
          {!compact ? <View style={styles.skeletonChip} /> : null}
        </Animated.View>
      ))}
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
  sheetBar: {
    backgroundColor: shell.tabBar,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginHorizontal: 0,
  },
  sheetFooter: {
    marginTop: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  sheetDone: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  iconChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3A3A3C",
  },
  inputBox: {
    height: 52,
    borderWidth: 0,
    borderBottomWidth: 0,
    borderColor: "transparent",
    borderRadius: 20,
    backgroundColor: PANEL_CARD,
    paddingHorizontal: 16,
  },
  phraseWrap: { gap: 10, marginTop: 12 },
  phraseChip: {
    alignSelf: "flex-start",
    backgroundColor: PANEL_CARD,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  phraseChipText: { color: shell.chipText, fontSize: 14 },
  phraseCard: {
    backgroundColor: PANEL_CARD,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  phraseCardText: { color: shell.foreground, fontSize: 15, lineHeight: 22 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  headerTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkSlot: { width: 18, height: 18, alignItems: "center", justifyContent: "center" },
  meaningAction: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  word: { flex: 1, color: shell.foreground, fontSize: 28, lineHeight: 34 },
  body: { paddingHorizontal: 16, paddingBottom: 4 },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-start",
    alignSelf: "stretch",
    gap: 6,
    marginBottom: 8,
    marginTop: 2,
  },
  level: {
    width: 22,
    height: 22,
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: shell.chip,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeActive: {
    backgroundColor: shell.chipActive,
  },
  grammar: {
    backgroundColor: PANEL_CARD,
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
    gap: 6,
  },
  grammarTitle: { color: shell.foreground, fontSize: 17 },
  grammarText: { color: PANEL_SECONDARY, fontSize: 14, lineHeight: 20 },
  grammarExample: { color: shell.foreground, fontSize: 14, marginTop: 4 },
  meaningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: shell.line,
  },
  meaning: { flex: 1, color: shell.foreground, fontSize: 15, lineHeight: 22 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  input: {
    flex: 1,
    height: 40,
    color: shell.foreground,
    fontSize: 15,
    borderBottomWidth: 1,
    borderBottomColor: shell.line,
    paddingHorizontal: 2,
  },
  hint: { color: PANEL_SECONDARY, fontSize: 13, marginTop: 8, lineHeight: 18 },
  error: { color: shell.dangerOnDark, fontSize: 13, marginTop: 8 },
  section: { color: shell.foreground, fontSize: 18, marginTop: 20 },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: shell.tones.green,
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 8,
    marginTop: 10,
  },
  savedText: { flex: 1, color: shell.onPastel, fontSize: 15, lineHeight: 22 },
  popularRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PANEL_CARD,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 10,
  },
  popularText: { flex: 1, color: shell.foreground, fontSize: 15, lineHeight: 22 },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PANEL_CARD,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginTop: 10,
  },
  skeletonCompact: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: shell.line,
  },
  skeletonBar: {
    height: 14,
    borderRadius: 7,
    backgroundColor: PANEL_CARD_SOFT,
  },
  skeletonChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: "auto",
    backgroundColor: PANEL_CARD_SOFT,
  },
  phrase: { color: shell.foreground, fontSize: 14, lineHeight: 21, marginTop: 6 },
  originMeaning: { color: shell.foreground, fontSize: 14, lineHeight: 20, marginTop: 6 },
  origin: {
    backgroundColor: PANEL_CARD,
    borderLeftWidth: 8,
    borderLeftColor: shell.tones.cream,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 10,
    overflow: "hidden",
  },
  notes: {
    minHeight: 88,
    marginTop: 12,
    borderWidth: 0,
    borderColor: "transparent",
    borderRadius: 20,
    backgroundColor: PANEL_CARD,
    color: shell.foreground,
    fontSize: 15,
    padding: 16,
    textAlignVertical: "top",
  },
  notesCompact: {
    minHeight: 56,
    marginTop: 8,
    padding: 12,
    borderRadius: 16,
  },
  footer: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  removeButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  levels: { flexDirection: "row", gap: 10 },
  levelButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  levelButtonSheet: { width: 46, height: 46, borderRadius: 23 },
  vaults: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vaultChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: shell.chip,
    borderWidth: 0,
    borderColor: "transparent",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  vaultChipActive: { backgroundColor: shell.chipActive },
  contextBox: {
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: PANEL_CARD,
    borderRadius: 20,
    padding: 16,
  },
  contextAction: { color: shell.foreground, fontSize: 14 },
  contextBody: { color: shell.foreground, fontSize: 15, lineHeight: 22, marginTop: 8 },
  followBox: { marginTop: 14, gap: 8 },
  followGate: { fontSize: 13, textDecorationLine: "underline" },
  followTitle: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.3 },
  followTurn: { gap: 2, marginTop: 4 },
  followQuestion: { fontSize: 13, marginTop: 4 },
  followRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  followInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  followLimit: { fontSize: 12, marginTop: 4 },
  contextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: shell.tones.lilac,
    borderRadius: 20,
    paddingVertical: 16,
    marginTop: 4,
  },
  vaultCta: { marginTop: 8, gap: 4 },
  translationRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  saveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: shell.chip,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chevron: { alignItems: "center", justifyContent: "center", paddingVertical: 8 },
});
