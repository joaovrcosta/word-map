import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { type Href, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { normalizeGrammaticalClass, type DictionaryEntry } from "@word-map/shared";
import { ReadingWordMenu, type SavedReadingWord } from "../reading/word-menu";
import { useSession } from "../../session";
import { useTheme } from "../../theme";
import { classLabel, type Vault, type Word } from "../../types";
import { ErrorText } from "../../ui";

type SearchScope = "words" | "decks";

const RECENT_KEY = "word-map.vault-word-search-recent";
const MAX_RECENT = 12;
const DEBOUNCE_MS = 300;
const GRADIENT = ["#FF2D95", "#4B7BFF"] as const;

const SEARCH_IDEAS = [
  "bat: baseball",
  "joie de vivre",
  "scintillate",
  "serendipity",
  "ephemeral",
  "ubuntu",
  "saudade",
];

type VaultHit = {
  word: Word;
  vault: {
    id: number;
    name: string;
    userId?: number;
    isPublic?: boolean;
    owner?: { id: number; name: string; username: string | null };
  };
  isOwner?: boolean;
};

type PublicVaultHit = {
  id: number;
  name: string;
  isPublic: true;
  wordCount: number;
  likeCount?: number;
  likedByMe?: boolean;
  isOwner?: boolean;
  owner: { id: number; name: string; username: string | null };
};

function ownerLabel(owner?: { name: string; username: string | null } | null) {
  if (!owner) return "alguém";
  const username = owner.username?.trim();
  if (username) return `@${username}`;
  return owner.name.trim() || "alguém";
}

type DictionaryHit = {
  word: string;
  grammaticalClass: string;
  definitions: string[];
};

type PendingWord = {
  name: string;
  grammaticalClass: string;
  translations: string[];
  translate: boolean;
};

type OpenedWord = {
  clean: string;
  saved: SavedReadingWord | null;
};

function savedFromVaultHit(hit: VaultHit): SavedReadingWord {
  return {
    id: hit.word.id,
    name: hit.word.name,
    vaultId: hit.word.vaultId || hit.vault.id,
    vaultName: hit.vault.name,
    translations: hit.word.translations,
    grammaticalClass: hit.word.grammaticalClass,
    confidence: hit.word.confidence,
    notes: hit.word.notes ?? null,
  };
}

type Props = {
  visible: boolean;
  onClose: () => void;
  preferredVaultId?: number;
  onChanged?: () => void;
  /** Sheet sobe até o topo (aba Busca). */
  fullScreen?: boolean;
};

export function AddWordSearchSheet({
  visible,
  onClose,
  preferredVaultId,
  onChanged,
  fullScreen = false,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { request } = useSession();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [vaultHits, setVaultHits] = useState<VaultHit[]>([]);
  const [dictionaryHits, setDictionaryHits] = useState<DictionaryHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set());
  const [preferredSaved, setPreferredSaved] = useState<Set<string>>(new Set());
  const [searchTick, setSearchTick] = useState(0);
  const [pending, setPending] = useState<PendingWord | null>(null);
  const [opened, setOpened] = useState<OpenedWord | null>(null);
  const [vaultFilter, setVaultFilter] = useState("");
  const [membership, setMembership] = useState<Set<number>>(new Set());
  const [busyVaultId, setBusyVaultId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [creatingVault, setCreatingVault] = useState(false);
  const [newVaultName, setNewVaultName] = useState("");
  const [newVaultPublic, setNewVaultPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchScope, setSearchScope] = useState<SearchScope>("words");
  const includePublicVaults = searchScope === "decks";
  const [publicVaultHits, setPublicVaultHits] = useState<PublicVaultHit[]>([]);
  const [publicVaultBusyId, setPublicVaultBusyId] = useState<number | null>(null);
  const [publicVaultActionOk, setPublicVaultActionOk] = useState<string | null>(null);

  const sheetDragY = useRef(new Animated.Value(0)).current;
  const searchSheetY = useRef(new Animated.Value(0)).current;
  const searchBackdrop = useRef(new Animated.Value(0)).current;
  const busyVaultIdRef = useRef<number | null>(null);
  const creatingRef = useRef(false);
  const dismissSheetRef = useRef<() => void>(() => {});
  const dismissingSearchRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    busyVaultIdRef.current = busyVaultId;
  }, [busyVaultId]);

  useEffect(() => {
    creatingRef.current = creating;
  }, [creating]);

  const finishSearchClose = useCallback(() => {
    dismissingSearchRef.current = false;
    onCloseRef.current();
  }, []);

  const dismissSearchSheet = useCallback(() => {
    if (dismissingSearchRef.current) return;
    dismissingSearchRef.current = true;
    Animated.parallel([
      Animated.timing(searchSheetY, {
        toValue: windowHeight,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(searchBackdrop, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) finishSearchClose();
      else dismissingSearchRef.current = false;
    });
  }, [finishSearchClose, searchBackdrop, searchSheetY, windowHeight]);

  useEffect(() => {
    if (!visible) {
      dismissingSearchRef.current = false;
      return;
    }
    dismissingSearchRef.current = false;
    searchSheetY.setValue(windowHeight);
    searchBackdrop.setValue(0);
    Animated.parallel([
      Animated.spring(searchSheetY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
        speed: 14,
      }),
      Animated.timing(searchBackdrop, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, searchBackdrop, searchSheetY, windowHeight]);

  const searchSheetPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 3,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          searchSheetY.stopAnimation();
          searchBackdrop.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          const dy = Math.max(0, gesture.dy);
          searchSheetY.setValue(dy);
          searchBackdrop.setValue(Math.max(0, 1 - dy / (windowHeight * 0.45)));
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 110 || gesture.vy > 1.05) {
            dismissSearchSheet();
            return;
          }
          Animated.parallel([
            Animated.spring(searchSheetY, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 5,
            }),
            Animated.timing(searchBackdrop, {
              toValue: 1,
              duration: 160,
              useNativeDriver: true,
            }),
          ]).start();
        },
      }),
    [dismissSearchSheet, searchBackdrop, searchSheetY, windowHeight]
  );

  const sheetPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        sheetDragY.stopAnimation();
        sheetDragY.setValue(0);
      },
      onPanResponderMove: (_, gesture) => {
        sheetDragY.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_, gesture) => {
        if (busyVaultIdRef.current != null || creatingRef.current) {
          Animated.spring(sheetDragY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
          return;
        }
        if (gesture.dy > 80 || gesture.vy > 0.9) {
          Animated.timing(sheetDragY, { toValue: 520, duration: 180, useNativeDriver: true }).start(() => {
            sheetDragY.setValue(0);
            dismissSheetRef.current();
          });
          return;
        }
        Animated.spring(sheetDragY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      },
    })
  ).current;

  const loadRecent = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_KEY);
      if (!raw) {
        setRecent([]);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      setRecent(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
    } catch {
      setRecent([]);
    }
  }, []);

  const loadVaults = useCallback(async () => {
    try {
      const data = await request<Vault[]>("/vaults");
      setVaults(Array.isArray(data) ? data : []);
    } catch {
      setVaults([]);
    }
  }, [request]);

  const refreshAfterWordChange = useCallback(async () => {
    await loadVaults();
    setSearchTick((tick) => tick + 1);
    onChanged?.();
  }, [loadVaults, onChanged]);

  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setDebounced("");
    setVaultHits([]);
    setPublicVaultHits([]);
    setDictionaryHits([]);
    setSearchScope("words");
    setError(null);
    setOpened(null);
    setPending(null);
    void loadRecent();
    void loadVaults();
  }, [visible, loadRecent, loadVaults]);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  const remember = async (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    const next = [clean, ...recent.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(
      0,
      MAX_RECENT
    );
    setRecent(next);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const removeRecent = async (value: string) => {
    const next = recent.filter((item) => item !== value);
    setRecent(next);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  useEffect(() => {
    if (!visible) return;
    if (!debounced) {
      setVaultHits([]);
      setPublicVaultHits([]);
      setDictionaryHits([]);
      setSavedNames(new Set());
      setSearching(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setError(null);
    void remember(debounced);

    const sameTerm = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

    const lookupDictionary = async (term: string) => {
      const dictionary = await request<{ entry?: DictionaryEntry | null; entries?: DictionaryEntry[] }>(
        `/dictionary?word=${encodeURIComponent(term)}`
      ).catch(() => ({ entry: null, entries: [] }));
      return dictionary.entry ?? dictionary.entries?.[0] ?? null;
    };

    const translateText = async (text: string, source: string, target: string) => {
      try {
        const data = await request<{ translatedText?: string }>("/translate", {
          method: "POST",
          body: JSON.stringify({ text, source, target }),
        });
        return data.translatedText?.trim() || "";
      } catch {
        return "";
      }
    };

    const hitFromEntry = async (entry: DictionaryEntry, preferPt?: string): Promise<DictionaryHit | null> => {
      if (!entry.word) return null;
      const definitionsEn = (entry.meanings ?? [])
        .flatMap((meaning) => (meaning.definitions ?? []).map((item) => item.definition?.trim() ?? ""))
        .filter(Boolean)
        .slice(0, 3);
      const translated = definitionsEn.length
        ? await Promise.all(definitionsEn.map((text) => translateText(text, "en", "pt").then((pt) => pt || text)))
        : [];
      const prefer = preferPt?.trim();
      let definitions = translated;
      if (prefer) {
        const lower = prefer.toLowerCase();
        if (!translated.some((item) => item.toLowerCase() === lower)) {
          definitions = [prefer, ...translated].slice(0, 3);
        }
      }
      return {
        word: entry.word,
        grammaticalClass: normalizeGrammaticalClass(entry.meanings?.[0]?.partOfSpeech),
        definitions,
      };
    };

    (async () => {
      try {
        const publicQuery = includePublicVaults ? "&includePublic=1" : "";
        const [searchRows, publicVaultRows, directEntry] = await Promise.all([
          request<VaultHit[]>(
            `/words/search?q=${encodeURIComponent(debounced)}${publicQuery}`
          ).catch(() => []),
          includePublicVaults
            ? request<PublicVaultHit[]>(
                `/vaults/public?q=${encodeURIComponent(debounced)}`
              ).catch(() => [])
            : Promise.resolve([] as PublicVaultHit[]),
          lookupDictionary(debounced),
        ]);
        if (cancelled) return;

        const rows = Array.isArray(searchRows) ? searchRows : [];
        setVaultHits(rows);
        setPublicVaultHits(Array.isArray(publicVaultRows) ? publicVaultRows : []);
        setSavedNames(
          new Set(
            rows
              .filter((hit) => hit.isOwner !== false)
              .map((hit) => hit.word.name.trim().toLowerCase())
          )
        );

        const exactDirect =
          directEntry?.word && sameTerm(directEntry.word, debounced) ? directEntry : null;
        const fuzzyDirect = directEntry?.word && !exactDirect ? directEntry : null;

        const hits: DictionaryHit[] = [];
        const seen = new Set<string>();
        const pushHit = (hit: DictionaryHit | null) => {
          if (!hit?.word) return;
          const key = hit.word.trim().toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          hits.push(hit);
        };

        if (exactDirect) {
          pushHit(await hitFromEntry(exactDirect));
          if (cancelled) return;
          setDictionaryHits(hits);
          return;
        }

        const english = await translateText(debounced, "pt", "en");
        if (cancelled) return;
        const englishTerm = english.trim();
        if (englishTerm && !sameTerm(englishTerm, debounced)) {
          const translatedEntry = await lookupDictionary(englishTerm);
          if (cancelled) return;
          if (translatedEntry?.word) {
            pushHit(await hitFromEntry(translatedEntry, debounced));
          } else {
            pushHit({
              word: englishTerm,
              grammaticalClass: "substantivo",
              definitions: [debounced],
            });
          }
          if (cancelled) return;
        }

        if (hits.length === 0 && fuzzyDirect?.word) {
          pushHit(await hitFromEntry(fuzzyDirect));
          if (cancelled) return;
        }

        setDictionaryHits(hits);
      } catch (cause) {
        if (!cancelled) {
          setVaultHits([]);
          setDictionaryHits([]);
          setSavedNames(new Set());
          setError(cause instanceof Error ? cause.message : "Não foi possível pesquisar.");
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remember só no debounce, não re-dispara busca
  }, [debounced, includePublicVaults, request, searchTick, visible]);

  useEffect(() => {
    if (preferredVaultId == null) {
      setPreferredSaved(new Set());
      return;
    }
    const next = new Set<string>();
    for (const hit of vaultHits) {
      if (hit.vault.id === preferredVaultId) {
        next.add(hit.word.name.trim().toLowerCase());
      }
    }
    setPreferredSaved(next);
  }, [vaultHits, preferredVaultId]);

  const isSaved = (name: string) => {
    const key = name.trim().toLowerCase();
    if (preferredVaultId != null) return preferredSaved.has(key);
    return savedNames.has(key);
  };

  const filteredVaults = useMemo(() => {
    const term = vaultFilter.trim().toLowerCase();
    const list = !term
      ? vaults
      : vaults.filter((vault) => vault.name.toLowerCase().includes(term));
    if (preferredVaultId == null) return list;
    return [...list].sort((left, right) => {
      if (left.id === preferredVaultId) return -1;
      if (right.id === preferredVaultId) return 1;
      return 0;
    });
  }, [vaults, vaultFilter, preferredVaultId]);

  const saveToPreferredVault = async (word: PendingWord) => {
    if (preferredVaultId == null || busyVaultId != null) return;
    setBusyVaultId(preferredVaultId);
    setError(null);
    try {
      const alreadyIn = await request<boolean>(
        `/words/exists?name=${encodeURIComponent(word.name)}&vaultId=${preferredVaultId}`
      ).catch(() => false);

      const key = word.name.trim().toLowerCase();
      if (alreadyIn) {
        await request("/words/remove-from-vault", {
          method: "POST",
          body: JSON.stringify({ wordName: word.name, vaultId: preferredVaultId }),
        });
        setPreferredSaved((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      } else {
        let translations = word.translations;
        if (word.translate && translations.length > 0) {
          translations = await Promise.all(
            translations.map(async (text) => {
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
        await request("/words", {
          method: "POST",
          body: JSON.stringify({
            name: word.name,
            grammaticalClass: word.grammaticalClass,
            translations,
            confidence: 1,
            vaultId: preferredVaultId,
            isSaved: true,
          }),
        });
        setPreferredSaved((current) => new Set(current).add(key));
      }
      setSearchTick((tick) => tick + 1);
      await loadVaults();
      onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o vault.");
    } finally {
      setBusyVaultId(null);
    }
  };

  const handleAddWord = (word: PendingWord) => {
    if (preferredVaultId != null) {
      void saveToPreferredVault(word);
      return;
    }
    void openVaultPicker(word);
  };

  const openVaultPicker = async (word: PendingWord) => {
    sheetDragY.setValue(0);
    setPending(word);
    setVaultFilter("");
    setActionError(null);
    setActionOk(null);
    setCreatingVault(false);
    setNewVaultName("");
    setMembership(new Set());
    try {
      const checks = await Promise.all(
        vaults.map(async (vault) => {
          try {
            const exists = await request<boolean>(
              `/words/exists?name=${encodeURIComponent(word.name)}&vaultId=${vault.id}`
            );
            return exists ? vault.id : null;
          } catch {
            return null;
          }
        })
      );
      setMembership(new Set(checks.filter((id): id is number => id != null)));
    } catch {
      setMembership(new Set());
    }
  };

  const closePicker = () => {
    if (busyVaultId != null || creating) return;
    sheetDragY.setValue(0);
    setPending(null);
    setVaultFilter("");
    setActionError(null);
    setActionOk(null);
    setCreatingVault(false);
    setNewVaultName("");
    setNewVaultPublic(false);
  };

  dismissSheetRef.current = closePicker;

  const createVault = async () => {
    const name = newVaultName.trim();
    if (!name || creating) return;
    setCreating(true);
    setActionError(null);
    try {
      await request<Vault>("/vaults", {
        method: "POST",
        body: JSON.stringify({ name, isPublic: newVaultPublic }),
      });
      setNewVaultName("");
      setNewVaultPublic(false);
      setCreatingVault(false);
      await loadVaults();
      setActionOk(`Vault “${name}” criado.`);
      setSearchTick((tick) => tick + 1);
      onChanged?.();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Não foi possível criar o vault.");
    } finally {
      setCreating(false);
    }
  };

  const toggleVault = async (vault: Vault) => {
    if (!pending) return;
    setBusyVaultId(vault.id);
    setActionError(null);
    setActionOk(null);
    const alreadyIn = membership.has(vault.id);
    try {
      if (alreadyIn) {
        await request("/words/remove-from-vault", {
          method: "POST",
          body: JSON.stringify({ wordName: pending.name, vaultId: vault.id }),
        });
        const nextMembership = new Set(membership);
        nextMembership.delete(vault.id);
        setMembership(nextMembership);
        const key = pending.name.trim().toLowerCase();
        setSavedNames((current) => {
          if (nextMembership.size > 0) return current;
          const next = new Set(current);
          next.delete(key);
          return next;
        });
        setActionOk(`Removida de “${vault.name}”.`);
      } else {
        let translations = pending.translations;
        if (pending.translate && translations.length > 0) {
          translations = await Promise.all(
            translations.map(async (text) => {
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
        await request("/words", {
          method: "POST",
          body: JSON.stringify({
            name: pending.name,
            grammaticalClass: pending.grammaticalClass,
            translations,
            confidence: 1,
            vaultId: vault.id,
            isSaved: true,
          }),
        });
        setMembership((current) => new Set(current).add(vault.id));
        setSavedNames((current) => new Set(current).add(pending.name.trim().toLowerCase()));
        setActionOk(`Salva em “${vault.name}”.`);
        await loadVaults();
      }
      setSearchTick((tick) => tick + 1);
      onChanged?.();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Não foi possível atualizar o vault.");
    } finally {
      setBusyVaultId(null);
    }
  };

  const togglePublicVaultLike = async (vaultId: number) => {
    if (publicVaultBusyId != null) return;
    setPublicVaultBusyId(vaultId);
    setPublicVaultActionOk(null);
    setError(null);
    try {
      const result = await request<{ liked: boolean; likeCount: number }>(`/vaults/${vaultId}/like`, {
        method: "POST",
      });
      setPublicVaultHits((current) =>
        current
          .map((item) =>
            item.id === vaultId
              ? { ...item, likedByMe: result.liked, likeCount: result.likeCount }
              : item
          )
          .sort((left, right) => {
            const likeDiff = (right.likeCount ?? 0) - (left.likeCount ?? 0);
            if (likeDiff !== 0) return likeDiff;
            return (right.wordCount ?? 0) - (left.wordCount ?? 0);
          })
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível curtir o vault.");
    } finally {
      setPublicVaultBusyId(null);
    }
  };

  const savePublicVaultToAccount = async (vault: PublicVaultHit) => {
    if (vault.isOwner || publicVaultBusyId != null) return;
    setPublicVaultBusyId(vault.id);
    setPublicVaultActionOk(null);
    setError(null);
    try {
      const created = await request<Vault>(`/vaults/${vault.id}/save`, { method: "POST" });
      await loadVaults();
      onChanged?.();
      setPublicVaultActionOk(`“${created.name}” salvo nos seus vaults.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o vault.");
    } finally {
      setPublicVaultBusyId(null);
    }
  };

  const ownVaultHits = useMemo(() => {
    const mine = vaultHits.filter((hit) => hit.isOwner !== false);
    // De dentro de um vault: só mostra se já está neste vault (não lista outros).
    if (preferredVaultId != null) {
      return mine.filter((hit) => hit.vault.id === preferredVaultId);
    }
    return mine;
  }, [vaultHits, preferredVaultId]);
  const publicWordHits = useMemo(
    () => vaultHits.filter((hit) => hit.isOwner === false),
    [vaultHits]
  );
  const exactVaultHit = ownVaultHits.some(
    (hit) => hit.word.name.trim().toLowerCase() === debounced.toLowerCase()
  );
  const dictionaryExact = dictionaryHits.some(
    (hit) => hit.word.trim().toLowerCase() === debounced.toLowerCase()
  );
  const showManual = Boolean(debounced) && !searching && !exactVaultHit && !dictionaryExact;

  const sheet = (
      <View style={[styles.root, fullScreen ? styles.rootFull : null]}>
        {fullScreen ? null : (
          <Animated.View
            style={[styles.backdrop, { opacity: searchBackdrop }]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={dismissSearchSheet} />
          </Animated.View>
        )}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.shell.background,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              paddingTop: fullScreen ? Math.max(insets.top - 2, 8) : 6,
              maxHeight: fullScreen ? windowHeight - Math.max(insets.top * 0.15, 6) : Platform.OS === "ios" ? "96%" : "97%",
              minHeight: fullScreen ? windowHeight - Math.max(insets.top, 12) : "94%",
              transform: [{ translateY: searchSheetY }],
            },
          ]}
        >
          <View style={styles.handleWrap} {...searchSheetPan.panHandlers}>
            <View style={styles.handle} />
          </View>

          <View style={{ paddingHorizontal: 18 }}>
            <LinearGradient
              colors={[...GRADIENT]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.searchBorder}
            >
              <View style={[styles.searchInner, { backgroundColor: theme.shell.background }]}>
                <View style={styles.searchGlyph}>
                  <Ionicons name="search" size={18} color="#FF2D95" />
                  <Ionicons name="sparkles" size={10} color="#4B7BFF" style={styles.searchSpark} />
                </View>
                <TextInput
                  autoFocus
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Buscar ou descrever qualquer palavra"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  style={[styles.searchInput, { fontFamily: theme.fonts.regular }]}
                />
                {query ? (
                  <Pressable accessibilityLabel="Limpar" hitSlop={8} onPress={() => setQuery("")}>
                    <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.45)" />
                  </Pressable>
                ) : (
                  <Ionicons name="mic-outline" size={20} color="rgba(255,255,255,0.75)" />
                )}
              </View>
            </LinearGradient>
          </View>

          <View style={styles.segmentRow}>
            {(
              [
                { id: "words" as const, label: "Palavras" },
                { id: "decks" as const, label: "Decks" },
              ] as const
            ).map((item) => {
              const active = searchScope === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSearchScope(item.id)}
                  style={[styles.segment, active ? styles.segmentActive : null]}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      { fontFamily: theme.fonts.semibold },
                      active ? styles.segmentLabelActive : null,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <View style={{ paddingHorizontal: 18, marginTop: 10 }}>
              <ErrorText>{error}</ErrorText>
            </View>
          ) : null}

          {!debounced ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              {searchScope === "decks" ? (
                <Text style={[styles.emptyRecent, { fontFamily: theme.fonts.regular, marginTop: 22 }]}>
                  Busque decks públicos pelo nome — os seus e os de outras pessoas.
                </Text>
              ) : (
                <>
              <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.bold }]}>Ideias de busca</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 18, gap: 10 }}
              >
                {SEARCH_IDEAS.map((idea) => (
                  <Pressable key={idea} onPress={() => setQuery(idea)}>
                    <LinearGradient
                      colors={[...GRADIENT]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.chipBorder}
                    >
                      <View style={[styles.chipInner, { backgroundColor: theme.shell.background }]}>
                        <Ionicons name="search" size={14} color="#FF2D95" />
                        <Text style={[styles.chipLabel, { fontFamily: theme.fonts.medium }]} numberOfLines={1}>
                          {idea}
                        </Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.bold, marginTop: 28 }]}>
                Buscas recentes
              </Text>
              {recent.length === 0 ? (
                <Text style={[styles.emptyRecent, { fontFamily: theme.fonts.regular }]}>
                  Digite em inglês ou português para pesquisar no dicionário e nos seus vaults.
                </Text>
              ) : (
                recent.map((item, index) => (
                  <View key={`${item}-${index}`}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <Pressable onPress={() => setQuery(item)} style={styles.recentRow}>
                      <Text
                        style={[styles.recentText, { fontFamily: theme.fonts.regular, fontStyle: "italic" }]}
                        numberOfLines={1}
                      >
                        {item}
                      </Text>
                      <Pressable
                        accessibilityLabel="Remover busca"
                        hitSlop={10}
                        onPress={() => void removeRecent(item)}
                        style={styles.recentRemove}
                      >
                        <Ionicons name="close" size={18} color="rgba(255,255,255,0.85)" />
                      </Pressable>
                    </Pressable>
                  </View>
                ))
              )}
                </>
              )}
            </ScrollView>
          ) : searching ? (
            <View style={styles.empty}>
              <ActivityIndicator color={theme.colors.green} />
              <Text style={{ color: "rgba(255,255,255,0.55)", fontFamily: theme.fonts.regular, marginTop: 10 }}>
                Pesquisando…
              </Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1, marginTop: 8 }}
              contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              {searchScope === "words" && ownVaultHits.length > 0 ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.resultSection, { fontFamily: theme.fonts.semibold }]}>
                    {preferredVaultId != null
                      ? `Já neste vault · ${ownVaultHits.length}`
                      : `Nos seus vaults · ${ownVaultHits.length}`}
                  </Text>
                  {ownVaultHits.map((hit) => (
                    <ResultRow
                      key={`${hit.vault.id}-${hit.word.id}`}
                      title={hit.word.name}
                      subtitle={`${classLabel(hit.word.grammaticalClass)} · ${hit.vault.name}`}
                      detail={hit.word.translations.join(", ")}
                      icon="folder-outline"
                      saved
                      onPress={() =>
                        setOpened({
                          clean: hit.word.name,
                          saved: savedFromVaultHit(hit),
                        })
                      }
                      onAdd={() =>
                        handleAddWord({
                          name: hit.word.name,
                          grammaticalClass: hit.word.grammaticalClass || "substantivo",
                          translations: hit.word.translations,
                          translate: false,
                        })
                      }
                    />
                  ))}
                </View>
              ) : null}

              {includePublicVaults && publicVaultActionOk ? (
                <Text
                  style={{
                    color: theme.colors.green,
                    fontFamily: theme.fonts.medium,
                    fontSize: 13,
                    marginTop: 10,
                  }}
                >
                  {publicVaultActionOk}
                </Text>
              ) : null}

              {includePublicVaults && publicVaultHits.length > 0 ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.resultSection, { fontFamily: theme.fonts.semibold }]}>
                    Decks públicos · {publicVaultHits.length}
                  </Text>
                  {publicVaultHits.map((vault) => {
                    const busy = publicVaultBusyId === vault.id;
                    return (
                      <Pressable
                        key={vault.id}
                        style={styles.publicVaultRow}
                        onPress={() => {
                          if (!vault.isOwner) return;
                          onClose();
                          router.push(`/vaults/${vault.id}` as Href);
                        }}
                      >
                        <View style={[styles.resultIcon, { backgroundColor: "rgba(75,123,255,0.18)" }]}>
                          <Ionicons
                            name={vault.isOwner ? "folder-outline" : "people-outline"}
                            size={20}
                            color="#4B7BFF"
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            numberOfLines={1}
                            style={{ color: "#FFFFFF", fontFamily: theme.fonts.semibold, fontSize: 16 }}
                          >
                            {vault.name}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{
                              color: "rgba(255,255,255,0.5)",
                              fontFamily: theme.fonts.regular,
                              fontSize: 13,
                              marginTop: 2,
                            }}
                          >
                            {vault.isOwner ? "Seu deck" : ownerLabel(vault.owner)} · {vault.wordCount}{" "}
                            {vault.wordCount === 1 ? "palavra" : "palavras"}
                          </Text>
                        </View>
                        <View style={styles.publicVaultActions}>
                          <Pressable
                            accessibilityLabel={vault.likedByMe ? "Remover curtida" : "Curtir vault"}
                            hitSlop={8}
                            disabled={publicVaultBusyId != null}
                            onPress={(event) => {
                              event.stopPropagation?.();
                              void togglePublicVaultLike(vault.id);
                            }}
                            style={styles.publicVaultActionBtn}
                          >
                            {busy ? (
                              <ActivityIndicator size="small" color="#FF2D95" />
                            ) : (
                              <>
                                <Ionicons
                                  name={vault.likedByMe ? "heart" : "heart-outline"}
                                  size={18}
                                  color={vault.likedByMe ? "#FF2D95" : "rgba(255,255,255,0.7)"}
                                />
                                <Text
                                  style={{
                                    color: vault.likedByMe ? "#FF2D95" : "rgba(255,255,255,0.55)",
                                    fontFamily: theme.fonts.medium,
                                    fontSize: 12,
                                    marginLeft: 4,
                                  }}
                                >
                                  {vault.likeCount ?? 0}
                                </Text>
                              </>
                            )}
                          </Pressable>
                          {!vault.isOwner ? (
                            <Pressable
                              accessibilityLabel="Salvar vault na minha conta"
                              hitSlop={8}
                              disabled={publicVaultBusyId != null}
                              onPress={(event) => {
                                event.stopPropagation?.();
                                void savePublicVaultToAccount(vault);
                              }}
                              style={styles.publicVaultActionBtn}
                            >
                              <Ionicons name="download-outline" size={18} color={theme.colors.green} />
                            </Pressable>
                          ) : (
                            <Ionicons name="globe-outline" size={18} color={theme.colors.green} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {includePublicVaults && publicWordHits.length > 0 ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.resultSection, { fontFamily: theme.fonts.semibold }]}>
                    Em vaults públicos · {publicWordHits.length}
                  </Text>
                  {publicWordHits.map((hit) => (
                    <ResultRow
                      key={`public-${hit.vault.id}-${hit.word.id}`}
                      title={hit.word.name}
                      subtitle={`${classLabel(hit.word.grammaticalClass)} · ${hit.vault.name} · ${ownerLabel(hit.vault.owner)}`}
                      detail={hit.word.translations.join(", ")}
                      icon="globe-outline"
                      saved={isSaved(hit.word.name)}
                      onPress={() =>
                        setOpened({
                          clean: hit.word.name,
                          saved: null,
                        })
                      }
                      onAdd={() =>
                        handleAddWord({
                          name: hit.word.name,
                          grammaticalClass: hit.word.grammaticalClass || "substantivo",
                          translations: hit.word.translations,
                          translate: false,
                        })
                      }
                    />
                  ))}
                </View>
              ) : null}

              {searchScope === "words" && dictionaryHits.length > 0 ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.resultSection, { fontFamily: theme.fonts.semibold }]}>
                    Dicionário · {dictionaryHits.length}
                  </Text>
                  {dictionaryHits.map((dictionaryHit) => (
                    <ResultRow
                      key={dictionaryHit.word}
                      title={dictionaryHit.word}
                      subtitle={classLabel(dictionaryHit.grammaticalClass)}
                      detail={dictionaryHit.definitions.join(" · ")}
                      icon="globe-outline"
                      saved={isSaved(dictionaryHit.word)}
                      onPress={() => {
                        const hit = ownVaultHits.find(
                          (item) =>
                            item.word.name.trim().toLowerCase() === dictionaryHit.word.trim().toLowerCase()
                        );
                        setOpened({
                          clean: dictionaryHit.word,
                          saved: hit ? savedFromVaultHit(hit) : null,
                        });
                      }}
                      onAdd={() =>
                        handleAddWord({
                          name: dictionaryHit.word,
                          grammaticalClass: dictionaryHit.grammaticalClass,
                          translations: dictionaryHit.definitions.slice(0, 1),
                          translate: false,
                        })
                      }
                    />
                  ))}
                </View>
              ) : null}

              {searchScope === "words" && showManual ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.resultSection, { fontFamily: theme.fonts.semibold }]}>
                    {dictionaryHits.length > 0 ? "Ou salvar o que você digitou" : "Salvar termo"}
                  </Text>
                  <ResultRow
                    title={debounced}
                    subtitle={
                      dictionaryHits.length > 0
                        ? `Salvar “${debounced}” como está`
                        : "Nenhum resultado no dicionário"
                    }
                    detail={
                      dictionaryHits.length > 0
                        ? "O dicionário sugeriu outro termo — você ainda pode salvar o seu"
                        : "Salvar mesmo assim em um vault"
                    }
                    icon="create-outline"
                    saved={isSaved(debounced)}
                    onPress={() => {
                      const hit = ownVaultHits.find(
                        (item) => item.word.name.trim().toLowerCase() === debounced.toLowerCase()
                      );
                      setOpened({
                        clean: debounced,
                        saved: hit ? savedFromVaultHit(hit) : null,
                      });
                    }}
                    onAdd={() =>
                      handleAddWord({
                        name: debounced,
                        grammaticalClass: "substantivo",
                        translations: [],
                        translate: false,
                      })
                    }
                  />
                </View>
              ) : null}

              {searchScope === "words" &&
              !ownVaultHits.length &&
              !dictionaryHits.length &&
              !showManual ? (
                <View style={styles.empty}>
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontFamily: theme.fonts.regular }}>
                    {`Nenhum resultado para “${debounced}”.`}
                  </Text>
                </View>
              ) : null}

              {searchScope === "decks" &&
              !publicVaultHits.length &&
              !publicWordHits.length ? (
                <View style={styles.empty}>
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontFamily: theme.fonts.regular }}>
                    {`Nenhum deck público para “${debounced}”.`}
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          )}
        </Animated.View>
      </View>
  );

  const overlays = (
    <>
      {opened ? (
        <ReadingWordMenu
          clean={opened.clean}
          anchor={{ x: 0, y: 0, width: 0, height: 0 }}
          sourceText=""
          chapterContent=""
          pages={[]}
          pageIndex={0}
          bookTitle=""
          saved={opened.saved}
          vaults={vaults}
          full
          onClose={() => setOpened(null)}
          onChanged={refreshAfterWordChange}
        />
      ) : null}

      <Modal visible={Boolean(pending)} transparent animationType="fade" onRequestClose={closePicker}>
        <View style={styles.spotifyBackdrop}>
          <Pressable accessibilityLabel="Fechar" style={styles.spotifyDismiss} onPress={closePicker} />
          <Animated.View
            style={[
              styles.spotifySheet,
              {
                backgroundColor: theme.shell.surface,
                paddingBottom: Math.max(insets.bottom, 16),
                transform: [{ translateY: sheetDragY }],
              },
            ]}
          >
            <View style={styles.pickerHandleWrap} {...sheetPan.panHandlers}>
              <View style={[styles.pickerHandle, { backgroundColor: theme.shell.line }]} />
            </View>

            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              style={{ maxHeight: windowHeight * 0.92 - 28 - Math.max(insets.bottom, 16) }}
            >
              <View style={styles.spotifyHeader}>
                <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                  <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 16 }}>
                    Adicionar a um vault
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{ color: theme.shell.muted, fontFamily: theme.fonts.regular, fontSize: 13, marginTop: 2 }}
                  >
                    {pending?.name}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Criar vault"
                  disabled={creating || busyVaultId != null}
                  onPress={() => {
                    setCreatingVault((current) => !current);
                    setActionError(null);
                    setActionOk(null);
                  }}
                  hitSlop={8}
                >
                  <Text style={{ color: theme.colors.green, fontFamily: theme.fonts.bold, fontSize: 15 }}>
                    Criar vault
                  </Text>
                </Pressable>
              </View>

              {creatingVault ? (
                <View style={{ gap: 10, marginBottom: 8 }}>
                  <View
                    style={[styles.createRow, { backgroundColor: theme.shell.chip, borderColor: theme.shell.line }]}
                  >
                    <TextInput
                      value={newVaultName}
                      onChangeText={setNewVaultName}
                      placeholder="Nome do novo vault"
                      placeholderTextColor={theme.shell.muted}
                      autoFocus
                      autoCapitalize="sentences"
                      style={[
                        styles.vaultSearchInput,
                        { color: theme.shell.foreground, fontFamily: theme.fonts.regular },
                      ]}
                      onSubmitEditing={() => void createVault()}
                    />
                    <Pressable
                      accessibilityLabel="Salvar vault"
                      disabled={creating || !newVaultName.trim()}
                      onPress={() => void createVault()}
                      style={{ opacity: creating || !newVaultName.trim() ? 0.45 : 1 }}
                    >
                      {creating ? (
                        <ActivityIndicator color={theme.colors.green} />
                      ) : (
                        <Text style={{ color: theme.colors.green, fontFamily: theme.fonts.bold, fontSize: 14 }}>
                          Criar
                        </Text>
                      )}
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => setNewVaultPublic((value) => !value)}
                    style={[
                      styles.createPublicRow,
                      { backgroundColor: theme.shell.chip, borderColor: theme.shell.line },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                      <Text
                        style={{
                          color: theme.shell.foreground,
                          fontFamily: theme.fonts.semibold,
                          fontSize: 14,
                        }}
                      >
                        Vault público
                      </Text>
                      <Text
                        style={{
                          color: theme.shell.muted,
                          fontFamily: theme.fonts.regular,
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        Outras pessoas podem encontrar este vault na busca
                      </Text>
                    </View>
                    <Switch
                      value={newVaultPublic}
                      onValueChange={setNewVaultPublic}
                      trackColor={{ false: "rgba(255,255,255,0.18)", true: "rgba(36,200,117,0.45)" }}
                      thumbColor={newVaultPublic ? theme.colors.green : "#f4f3f4"}
                    />
                  </Pressable>
                </View>
              ) : null}

              <View style={[styles.vaultSearch, { backgroundColor: theme.shell.chip }]}>
                <Ionicons name="search" size={14} color={theme.shell.muted} />
                <TextInput
                  value={vaultFilter}
                  onChangeText={setVaultFilter}
                  placeholder="Procurar um vault…"
                  placeholderTextColor={theme.shell.muted}
                  autoCapitalize="none"
                  style={[
                    styles.vaultSearchInput,
                    { color: theme.shell.foreground, fontFamily: theme.fonts.regular },
                  ]}
                />
              </View>

              {actionError ? <ErrorText>{actionError}</ErrorText> : null}
              {actionOk ? (
                <Text
                  style={{
                    color: theme.colors.greenText,
                    fontFamily: theme.fonts.medium,
                    marginTop: 8,
                    fontSize: 13,
                  }}
                >
                  {actionOk}
                </Text>
              ) : null}

              <View style={{ marginTop: 6 }}>
                {filteredVaults.length === 0 ? (
                  <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.regular, marginTop: 16 }}>
                    Nenhum vault encontrado.
                  </Text>
                ) : (
                  filteredVaults.map((item) => {
                    const inVault = membership.has(item.id);
                    const busy = busyVaultId === item.id;
                    const preferred = preferredVaultId === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        disabled={busyVaultId != null}
                        onPress={() => void toggleVault(item)}
                        style={[
                          styles.spotifyRow,
                          {
                            borderBottomColor: theme.shell.line,
                            opacity: busyVaultId != null && !busy ? 0.5 : 1,
                          },
                        ]}
                      >
                        <View style={[styles.vaultThumb, { backgroundColor: theme.shell.chip }]}>
                          <Ionicons name="folder" size={18} color={theme.shell.foreground} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            numberOfLines={1}
                            style={{
                              color: theme.shell.foreground,
                              fontFamily: theme.fonts.semibold,
                              fontSize: 15,
                            }}
                          >
                            {item.name}
                            {preferred ? " · atual" : ""}
                          </Text>
                          <Text
                            style={{
                              color: theme.shell.muted,
                              fontFamily: theme.fonts.regular,
                              fontSize: 12,
                              marginTop: 2,
                            }}
                          >
                            {item.words?.length ?? 0}{" "}
                            {(item.words?.length ?? 0) === 1 ? "palavra" : "palavras"}
                          </Text>
                        </View>
                        {busy ? (
                          <ActivityIndicator color={theme.colors.green} />
                        ) : (
                          <Ionicons
                            name={inVault ? "checkmark-circle" : "add-circle-outline"}
                            size={26}
                            color={inVault ? theme.colors.green : theme.shell.muted}
                          />
                        )}
                      </Pressable>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );

  if (fullScreen) {
    if (!visible) return overlays;
    return (
      <>
        {sheet}
        {overlays}
      </>
    );
  }

  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={dismissSearchSheet}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      {sheet}
      {overlays}
    </Modal>
  );
}

function ResultRow({
  title,
  subtitle,
  detail,
  icon,
  saved = false,
  onPress,
  onAdd,
}: {
  title: string;
  subtitle: string;
  detail?: string;
  icon: keyof typeof Ionicons.glyphMap;
  saved?: boolean;
  onPress?: () => void;
  onAdd: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.result, { backgroundColor: "#141414" }]}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <View style={[styles.resultIcon, { backgroundColor: "#222" }]}>
          <Ionicons name={icon} size={18} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#FFFFFF", fontFamily: theme.fonts.bold, fontSize: 16 }}>{title}</Text>
          <Text style={{ color: "rgba(255,255,255,0.5)", fontFamily: theme.fonts.medium, fontSize: 12, marginTop: 2 }}>
            {subtitle}
          </Text>
          {detail ? (
            <Text
              numberOfLines={2}
              style={{
                color: "rgba(255,255,255,0.45)",
                fontFamily: theme.fonts.regular,
                fontSize: 13,
                marginTop: 4,
                lineHeight: 18,
              }}
            >
              {detail}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel={saved ? `Gerenciar vaults de ${title}` : `Adicionar ${title}`}
        onPress={onAdd}
        style={styles.iconChip}
      >
        <Ionicons
          name={saved ? "checkmark-circle" : "add-circle"}
          size={26}
          color={saved ? theme.colors.green : "#C5A8FF"}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  rootFull: {
    backgroundColor: "#000000",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    minHeight: "88%",
  },
  handleWrap: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 2,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  segmentRow: {
    marginTop: 14,
    marginHorizontal: 18,
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A2A2C",
  },
  segmentActive: {
    backgroundColor: "#E8E8EA",
  },
  segmentLabel: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  segmentLabelActive: {
    color: "#111111",
  },
  publicVaultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  publicVaultActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  publicVaultActionBtn: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 6,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  createPublicRow: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  searchBorder: {
    borderRadius: 999,
    padding: 2,
    overflow: "hidden",
  },
  searchInner: {
    borderRadius: 999,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  searchGlyph: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
  searchSpark: { position: "absolute", right: -2, top: -2 },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 16, paddingVertical: 12 },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    marginTop: 22,
    marginBottom: 14,
    paddingHorizontal: 18,
  },
  chipBorder: { borderRadius: 999, padding: 1.5, overflow: "hidden" },
  chipInner: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    maxWidth: 220,
  },
  chipLabel: { color: "#FFFFFF", fontSize: 14 },
  emptyRecent: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    paddingHorizontal: 18,
    lineHeight: 20,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  recentText: { flex: 1, color: "#FFFFFF", fontSize: 17 },
  recentRemove: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 18,
  },
  empty: { marginTop: 36, alignItems: "center", paddingHorizontal: 24 },
  resultSection: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  spotifyBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  spotifyDismiss: { flex: 1 },
  spotifySheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  pickerHandleWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    paddingTop: 10,
    paddingBottom: 12,
    marginHorizontal: -18,
    paddingHorizontal: 18,
  },
  pickerHandle: { width: 44, height: 5, borderRadius: 3 },
  spotifyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  createRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  vaultSearch: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  vaultSearchInput: { flex: 1, fontSize: 14, padding: 0 },
  spotifyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  vaultThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
