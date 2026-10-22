import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type Href, router, useFocusEffect } from "expo-router";
import { normalizeGrammaticalClass, type DictionaryEntry } from "@word-map/shared";
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

const DEBOUNCE_MS = 300;

export default function SearchScreen() {
  const theme = useTheme();
  const { request } = useSession();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [vaultHits, setVaultHits] = useState<VaultHit[]>([]);
  const [dictionaryHit, setDictionaryHit] = useState<DictionaryHit | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingWord | null>(null);
  const [vaultFilter, setVaultFilter] = useState("");
  const [membership, setMembership] = useState<Set<number>>(new Set());
  const [busyVaultId, setBusyVaultId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [searchTick, setSearchTick] = useState(0);
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set());

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

  useFocusEffect(
    useCallback(() => {
      void loadVaults();
    }, [loadVaults])
  );

  useEffect(() => {
    if (!debounced) {
      setVaultHits([]);
      setDictionaryHit(null);
      setSavedNames(new Set());
      setSearching(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setError(null);

    (async () => {
      try {
        const [searchRows, dictionary] = await Promise.all([
          request<VaultHit[]>(`/words/search?q=${encodeURIComponent(debounced)}`).catch(() => []),
          request<{ entry?: DictionaryEntry | null; entries?: DictionaryEntry[] }>(
            `/dictionary?word=${encodeURIComponent(debounced)}`
          ).catch(() => ({ entry: null, entries: [] })),
        ]);
        if (cancelled) return;

        const rows = Array.isArray(searchRows) ? searchRows : [];
        setVaultHits(rows);
        setSavedNames(new Set(rows.map((hit) => hit.word.name.trim().toLowerCase())));

        const entry = dictionary.entry ?? dictionary.entries?.[0] ?? null;
        if (entry?.word) {
          const definitionsEn = (entry.meanings ?? [])
            .flatMap((meaning) => (meaning.definitions ?? []).map((item) => item.definition?.trim() ?? ""))
            .filter(Boolean)
            .slice(0, 3);
          const definitions = definitionsEn.length
            ? await Promise.all(
                definitionsEn.map(async (text) => {
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
              )
            : [];
          if (cancelled) return;
          setDictionaryHit({
            word: entry.word,
            grammaticalClass: normalizeGrammaticalClass(entry.meanings?.[0]?.partOfSpeech),
            definitions,
          });
        } else {
          setDictionaryHit(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setVaultHits([]);
          setDictionaryHit(null);
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
    setPending(word);
    setVaultFilter("");
    setActionError(null);
    setActionOk(null);
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
    if (busyVaultId != null) return;
    setPending(null);
    setVaultFilter("");
    setActionError(null);
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

  const showManual =
    Boolean(debounced) &&
    !searching &&
    !dictionaryHit &&
    !vaultHits.some((hit) => hit.word.name.toLowerCase() === debounced.toLowerCase());

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
      <Muted>Pesquise palavras e salve nos seus vaults.</Muted>

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
          placeholder="Adicione palavras em seus vaults"
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
          <Muted>Digite uma palavra para pesquisar no dicionário e nos seus vaults.</Muted>
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

          {dictionaryHit ? (
            <View style={{ marginTop: 18 }}>
              <Text style={[styles.section, { color: theme.shell.muted, fontFamily: theme.fonts.semibold }]}>
                Dicionário
              </Text>
              <ResultRow
                title={dictionaryHit.word}
                subtitle={classLabel(dictionaryHit.grammaticalClass)}
                detail={dictionaryHit.definitions.join(" · ")}
                icon="globe-outline"
                saved={isSaved(dictionaryHit.word)}
                onAdd={() =>
                  void openVaultPicker({
                    name: dictionaryHit.word,
                    grammaticalClass: dictionaryHit.grammaticalClass,
                    translations: dictionaryHit.definitions,
                    translate: false,
                  })
                }
              />
            </View>
          ) : null}

          {showManual ? (
            <View style={{ marginTop: 18 }}>
              <Text style={[styles.section, { color: theme.shell.muted, fontFamily: theme.fonts.semibold }]}>
                Salvar termo
              </Text>
              <ResultRow
                title={debounced}
                subtitle="Nenhum resultado no dicionário"
                detail="Salvar mesmo assim em um vault"
                icon="create-outline"
                saved={isSaved(debounced)}
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

          {!vaultHits.length && !dictionaryHit && !showManual ? (
            <View style={styles.empty}>
              <Muted>{`Nenhum resultado para “${debounced}”.`}</Muted>
            </View>
          ) : null}
        </ScrollView>
      )}

      <Modal visible={Boolean(pending)} transparent animationType="fade" onRequestClose={closePicker}>
        <Pressable style={styles.backdrop} onPress={closePicker}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.shell.surface }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 17 }}>
                  Adicionar a um vault
                </Text>
                <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.regular, fontSize: 13, marginTop: 2 }}>
                  {pending?.name}
                </Text>
              </View>
              <Pressable accessibilityLabel="Fechar" onPress={closePicker} style={styles.iconChip}>
                <Ionicons name="close" size={18} color={theme.shell.foreground} />
              </Pressable>
            </View>

            <View
              style={[
                styles.vaultSearch,
                { backgroundColor: theme.shell.chip, borderColor: theme.shell.line },
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

            <FlatList
              data={filteredVaults}
              keyExtractor={(item) => String(item.id)}
              style={{ marginTop: 10, maxHeight: 320 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Muted>Nenhum vault encontrado.</Muted>}
              renderItem={({ item }) => {
                const inVault = membership.has(item.id);
                const busy = busyVaultId === item.id;
                return (
                  <Pressable
                    disabled={busyVaultId != null}
                    onPress={() => void toggleVault(item)}
                    style={[styles.vaultRow, { backgroundColor: theme.shell.chip, opacity: busyVaultId != null && !busy ? 0.5 : 1 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.semibold, fontSize: 15 }}>
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
                        size={24}
                        color={inVault ? theme.colors.green : theme.shell.muted}
                      />
                    )}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
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
  onAdd,
}: {
  title: string;
  subtitle: string;
  detail?: string;
  icon: keyof typeof Ionicons.glyphMap;
  saved?: boolean;
  onAdd: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.result, { backgroundColor: theme.shell.surface }]}>
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
            style={{ color: theme.shell.muted, fontFamily: theme.fonts.regular, fontSize: 13, marginTop: 4, lineHeight: 18 }}
          >
            {detail}
          </Text>
        ) : null}
      </View>
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
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
    padding: 16,
  },
  sheet: {
    borderRadius: 24,
    padding: 18,
    maxHeight: "80%",
  },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  vaultSearch: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  vaultSearchInput: { flex: 1, fontSize: 14, padding: 0 },
  vaultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
});
