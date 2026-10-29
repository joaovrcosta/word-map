import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type Href, router, useFocusEffect } from "expo-router";
import { normalizeGrammaticalClass, type DictionaryEntry } from "@word-map/shared";
import { ReadingWordMenu, type SavedReadingWord } from "../../src/features/reading/word-menu";
import { useSession } from "../../src/session";
import { useTheme } from "../../src/theme";
import { classLabel, type Vault, type Word } from "../../src/types";
import { ErrorText, Heading, Muted, Screen } from "../../src/ui";

type VaultHit = {
  word: Word;
  vault: { id: number; name: string };
};

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

const DEBOUNCE_MS = 300;

export default function SearchScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { request } = useSession();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [vaultHits, setVaultHits] = useState<VaultHit[]>([]);
  const [dictionaryHits, setDictionaryHits] = useState<DictionaryHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingWord | null>(null);
  const [opened, setOpened] = useState<OpenedWord | null>(null);
  const [vaultFilter, setVaultFilter] = useState("");
  const [membership, setMembership] = useState<Set<number>>(new Set());
  const [busyVaultId, setBusyVaultId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [searchTick, setSearchTick] = useState(0);
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set());
  const [creatingVault, setCreatingVault] = useState(false);
  const [newVaultName, setNewVaultName] = useState("");
  const [creating, setCreating] = useState(false);
  const sheetDragY = useRef(new Animated.Value(0)).current;
  const busyVaultIdRef = useRef<number | null>(null);
  const creatingRef = useRef(false);
  const dismissSheetRef = useRef<() => void>(() => {});

  useEffect(() => {
    busyVaultIdRef.current = busyVaultId;
  }, [busyVaultId]);

  useEffect(() => {
    creatingRef.current = creating;
  }, [creating]);

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

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

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
  }, [loadVaults]);

  useFocusEffect(
    useCallback(() => {
      void loadVaults();
    }, [loadVaults])
  );

  useEffect(() => {
    if (!debounced) {
      setVaultHits([]);
      setDictionaryHits([]);
      setSavedNames(new Set());
      setSearching(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setError(null);

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
        const [searchRows, directEntry] = await Promise.all([
          request<VaultHit[]>(`/words/search?q=${encodeURIComponent(debounced)}`).catch(() => []),
          lookupDictionary(debounced),
        ]);
        if (cancelled) return;

        const rows = Array.isArray(searchRows) ? searchRows : [];
        setVaultHits(rows);
        setSavedNames(new Set(rows.map((hit) => hit.word.name.trim().toLowerCase())));

        const exactDirect =
          directEntry?.word && sameTerm(directEntry.word, debounced) ? directEntry : null;
        const fuzzyDirect =
          directEntry?.word && !exactDirect ? directEntry : null;

        const hits: DictionaryHit[] = [];
        const seen = new Set<string>();
        const pushHit = (hit: DictionaryHit | null) => {
          if (!hit?.word) return;
          const key = hit.word.trim().toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          hits.push(hit);
        };

        // Match exato em inglês: usa direto e não traduz (run, give up…).
        if (exactDirect) {
          pushHit(await hitFromEntry(exactDirect));
          if (cancelled) return;
          setDictionaryHits(hits);
          return;
        }

        // Sem match exato: tenta PT→EN (desistir → give up), mesmo se houver fuzzy (desister).
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

        // Fuzzy só se a tradução PT→EN não deu resultado (ex.: typo em inglês).
        // Evita ruído tipo escada → espada / desistir → desister.
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
  }, [debounced, request, searchTick]);

  const isSaved = (name: string) => savedNames.has(name.trim().toLowerCase());

  const filteredVaults = useMemo(() => {
    const term = vaultFilter.trim().toLowerCase();
    if (!term) return vaults;
    return vaults.filter((vault) => vault.name.toLowerCase().includes(term));
  }, [vaults, vaultFilter]);

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
  };

  dismissSheetRef.current = () => {
    setPending(null);
    setVaultFilter("");
    setActionError(null);
    setActionOk(null);
    setCreatingVault(false);
    setNewVaultName("");
  };

  const createVault = async () => {
    const name = newVaultName.trim();
    if (!name || creating) return;
    setCreating(true);
    setActionError(null);
    try {
      await request<Vault>("/vaults", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setNewVaultName("");
      setCreatingVault(false);
      await loadVaults();
      setActionOk(`Vault “${name}” criado.`);
      setSearchTick((tick) => tick + 1);
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
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Não foi possível atualizar o vault.");
    } finally {
      setBusyVaultId(null);
    }
  };

  const exactVaultHit = vaultHits.some(
    (hit) => hit.word.name.trim().toLowerCase() === debounced.toLowerCase()
  );
  const dictionaryExact = dictionaryHits.some(
    (hit) => hit.word.trim().toLowerCase() === debounced.toLowerCase()
  );
  const showManual =
    Boolean(debounced) && !searching && !exactVaultHit && !dictionaryExact;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/home" as Href);
  };

  return (
    <Screen>
      <Pressable onPress={goBack} hitSlop={8} style={{ alignSelf: "flex-start", marginBottom: 4 }}>
        <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.semibold, fontSize: 15 }}>
          Voltar
        </Text>
      </Pressable>
      <Heading>Buscar</Heading>
      <Muted>Busque em inglês ou português e salve nos seus vaults.</Muted>

      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: theme.shell.surface,
            borderColor: theme.shell.line,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={theme.shell.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Ex.: give up ou desistir"
          placeholderTextColor={theme.shell.muted}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          style={[styles.searchInput, { color: theme.shell.foreground, fontFamily: theme.fonts.regular }]}
        />
        {query ? (
          <Pressable accessibilityLabel="Limpar busca" onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={theme.shell.muted} />
          </Pressable>
        ) : null}
      </View>

      {error ? <ErrorText>{error}</ErrorText> : null}

      {!debounced ? (
        <View style={styles.empty}>
          <Muted>Digite em inglês ou português para pesquisar no dicionário e nos seus vaults.</Muted>
        </View>
      ) : searching ? (
        <View style={styles.empty}>
          <ActivityIndicator color={theme.colors.green} />
          <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.regular, marginTop: 10 }}>
            Pesquisando…
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, marginTop: 4 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {vaultHits.length > 0 ? (
            <View style={{ marginTop: 18 }}>
              <Text style={[styles.section, { color: theme.shell.muted, fontFamily: theme.fonts.semibold }]}>
                Nos seus vaults · {vaultHits.length}
              </Text>
              {vaultHits.map((hit) => (
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
                    void openVaultPicker({
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

          {dictionaryHits.length > 0 ? (
            <View style={{ marginTop: 18 }}>
              <Text style={[styles.section, { color: theme.shell.muted, fontFamily: theme.fonts.semibold }]}>
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
                    const hit = vaultHits.find(
                      (item) =>
                        item.word.name.trim().toLowerCase() === dictionaryHit.word.trim().toLowerCase()
                    );
                    setOpened({
                      clean: dictionaryHit.word,
                      saved: hit ? savedFromVaultHit(hit) : null,
                    });
                  }}
                  onAdd={() =>
                    void openVaultPicker({
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

          {showManual ? (
            <View style={{ marginTop: 18 }}>
              <Text style={[styles.section, { color: theme.shell.muted, fontFamily: theme.fonts.semibold }]}>
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
                  const hit = vaultHits.find(
                    (item) => item.word.name.trim().toLowerCase() === debounced.toLowerCase()
                  );
                  setOpened({
                    clean: debounced,
                    saved: hit ? savedFromVaultHit(hit) : null,
                  });
                }}
                onAdd={() =>
                  void openVaultPicker({
                    name: debounced,
                    grammaticalClass: "substantivo",
                    translations: [],
                    translate: false,
                  })
                }
              />
            </View>
          ) : null}

          {!vaultHits.length && !dictionaryHits.length && !showManual ? (
            <View style={styles.empty}>
              <Muted>{`Nenhum resultado para “${debounced}”.`}</Muted>
            </View>
          ) : null}
        </ScrollView>
      )}

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
          <Pressable
            accessibilityLabel="Fechar"
            style={styles.spotifyDismiss}
            onPress={closePicker}
          />
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
            <View style={styles.handleWrap} {...sheetPan.panHandlers}>
              <View style={[styles.handle, { backgroundColor: theme.shell.line }]} />
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
                <View
                  style={[
                    styles.createRow,
                    { backgroundColor: theme.shell.chip, borderColor: theme.shell.line },
                  ]}
                >
                  <TextInput
                    value={newVaultName}
                    onChangeText={setNewVaultName}
                    placeholder="Nome do novo vault"
                    placeholderTextColor={theme.shell.muted}
                    autoFocus
                    autoCapitalize="sentences"
                    style={[styles.vaultSearchInput, { color: theme.shell.foreground, fontFamily: theme.fonts.regular }]}
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
              ) : null}

              <View
                style={[
                  styles.vaultSearch,
                  { backgroundColor: theme.shell.chip, borderColor: "transparent" },
                ]}
              >
                <Ionicons name="search" size={14} color={theme.shell.muted} />
                <TextInput
                  value={vaultFilter}
                  onChangeText={setVaultFilter}
                  placeholder="Procurar um vault…"
                  placeholderTextColor={theme.shell.muted}
                  autoCapitalize="none"
                  style={[styles.vaultSearchInput, { color: theme.shell.foreground, fontFamily: theme.fonts.regular }]}
                />
              </View>

              {actionError ? <ErrorText>{actionError}</ErrorText> : null}
              {actionOk ? (
                <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.medium, marginTop: 8, fontSize: 13 }}>
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
                            style={{ color: theme.shell.foreground, fontFamily: theme.fonts.semibold, fontSize: 15 }}
                          >
                            {item.name}
                          </Text>
                          <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.regular, fontSize: 12, marginTop: 2 }}>
                            {item.words?.length ?? 0} {(item.words?.length ?? 0) === 1 ? "palavra" : "palavras"}
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
    </Screen>
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
    <View style={[styles.result, { backgroundColor: theme.shell.surface }]}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <View style={[styles.resultIcon, { backgroundColor: theme.shell.chip }]}>
          <Ionicons name={icon} size={18} color={theme.shell.foreground} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 16 }}>{title}</Text>
          <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 12, marginTop: 2 }}>
            {subtitle}
          </Text>
          {detail ? (
            <Text
              numberOfLines={2}
              style={{
                color: theme.shell.muted,
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
          color={saved ? theme.colors.green : theme.shell.tones.lilac}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  empty: { marginTop: 28, alignItems: "center" },
  section: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 },
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
  spotifyDismiss: {
    flex: 1,
  },
  spotifySheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  handleWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    paddingTop: 10,
    paddingBottom: 12,
    marginHorizontal: -18,
    paddingHorizontal: 18,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
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
    borderWidth: 1,
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
