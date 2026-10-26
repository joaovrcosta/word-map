import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type Href, Redirect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { clearSharedPayloads, useIncomingShare } from "expo-sharing";
import { normalizeGrammaticalClass, type DictionaryEntry } from "@word-map/shared";
import {
  parseSharedText,
  sharedPayloadText,
} from "../src/features/share/parse-shared-text";
import { useSession } from "../src/session";
import { useTheme } from "../src/theme";
import { type Vault } from "../src/types";
import { ErrorText, Heading, Muted, PrimaryButton, Screen } from "../src/ui";

export default function ShareScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, user, request } = useSession();
  const { sharedPayloads, resolvedSharedPayloads, isResolving, error: shareError } =
    useIncomingShare();

  const [word, setWord] = useState("");
  const [hydratedWord, setHydratedWord] = useState(false);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [membership, setMembership] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState("");
  const [busyVaultId, setBusyVaultId] = useState<number | null>(null);
  const [loadingVaults, setLoadingVaults] = useState(false);
  const [grammaticalClass, setGrammaticalClass] = useState("substantivo");
  const [translations, setTranslations] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const rawShared = useMemo(() => {
    const fromRaw = sharedPayloadText(sharedPayloads);
    if (fromRaw) return fromRaw;
    return sharedPayloadText(
      resolvedSharedPayloads.map((payload) => ({
        value: typeof payload.value === "string" ? payload.value : "",
        shareType: payload.shareType,
        mimeType: payload.mimeType ?? payload.contentMimeType ?? undefined,
      }))
    );
  }, [resolvedSharedPayloads, sharedPayloads]);

  useEffect(() => {
    if (hydratedWord || isResolving) return;
    if (!rawShared) {
      setHydratedWord(true);
      return;
    }
    setWord(parseSharedText(rawShared));
    setHydratedWord(true);
  }, [hydratedWord, isResolving, rawShared]);

  const loadVaults = useCallback(async () => {
    setLoadingVaults(true);
    try {
      const data = await request<Vault[]>("/vaults");
      setVaults(data);
    } catch {
      setVaults([]);
    } finally {
      setLoadingVaults(false);
    }
  }, [request]);

  useEffect(() => {
    if (!user) return;
    void loadVaults();
  }, [loadVaults, user]);

  const refreshMembership = useCallback(
    async (name: string, list: Vault[]) => {
      const clean = name.trim();
      if (!clean || list.length === 0) {
        setMembership(new Set());
        return;
      }
      const checks = await Promise.all(
        list.map(async (vault) => {
          try {
            const exists = await request<boolean>(
              `/words/exists?name=${encodeURIComponent(clean)}&vaultId=${vault.id}`
            );
            return exists ? vault.id : null;
          } catch {
            return null;
          }
        })
      );
      setMembership(new Set(checks.filter((id): id is number => id != null)));
    },
    [request]
  );

  useEffect(() => {
    if (!user || !word.trim() || vaults.length === 0) return;
    const handle = setTimeout(() => {
      void refreshMembership(word, vaults);
    }, 250);
    return () => clearTimeout(handle);
  }, [refreshMembership, user, vaults, word]);

  useEffect(() => {
    const clean = word.trim();
    if (!user || !clean) {
      setGrammaticalClass("substantivo");
      setTranslations([]);
      return;
    }
    let cancelled = false;
    setLookingUp(true);
    const handle = setTimeout(() => {
      void (async () => {
        try {
          const dictionary = await request<{
            entry?: DictionaryEntry | null;
            entries?: DictionaryEntry[];
          }>(`/dictionary?word=${encodeURIComponent(clean)}`);
          if (cancelled) return;
          const first = dictionary.entry ?? dictionary.entries?.[0] ?? null;
          if (!first?.word) {
            setGrammaticalClass("substantivo");
            setTranslations([]);
            return;
          }
          setGrammaticalClass(
            normalizeGrammaticalClass(first.meanings?.[0]?.partOfSpeech) || "substantivo"
          );
          const meanings = (first.meanings ?? [])
            .flatMap((meaning) => (meaning.definitions ?? []).map((item) => item.definition?.trim() ?? ""))
            .filter(Boolean)
            .slice(0, 3);
          setTranslations(meanings);
        } catch {
          if (!cancelled) {
            setGrammaticalClass("substantivo");
            setTranslations([]);
          }
        } finally {
          if (!cancelled) setLookingUp(false);
        }
      })();
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [request, user, word]);

  const filteredVaults = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return vaults;
    return vaults.filter((vault) => vault.name.toLowerCase().includes(term));
  }, [filter, vaults]);

  const finish = () => {
    clearSharedPayloads();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/home" as Href);
  };

  const toggleVault = async (vault: Vault) => {
    const name = word.trim();
    if (!name || busyVaultId != null) return;
    setBusyVaultId(vault.id);
    setActionError(null);
    setActionOk(null);
    const alreadyIn = membership.has(vault.id);
    try {
      if (alreadyIn) {
        await request("/words/remove-from-vault", {
          method: "POST",
          body: JSON.stringify({ wordName: name, vaultId: vault.id }),
        });
        setMembership((current) => {
          const next = new Set(current);
          next.delete(vault.id);
          return next;
        });
        setActionOk(`Removida de “${vault.name}”.`);
      } else {
        let nextTranslations = translations;
        if (nextTranslations.length > 0) {
          nextTranslations = await Promise.all(
            nextTranslations.map(async (text) => {
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
            name,
            grammaticalClass,
            translations: nextTranslations,
            confidence: 1,
            vaultId: vault.id,
            isSaved: true,
          }),
        });
        setMembership((current) => new Set(current).add(vault.id));
        setActionOk(`Salva em “${vault.name}”.`);
        await loadVaults();
      }
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Não foi possível atualizar o vault.");
    } finally {
      setBusyVaultId(null);
    }
  };

  if (!ready || isResolving || !hydratedWord) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.green} />
          <Muted>Abrindo o texto compartilhado…</Muted>
        </View>
      </Screen>
    );
  }

  if (!user) {
    return <Redirect href={"/" as Href} />;
  }

  return (
    <Screen>
      <View style={{ paddingTop: Math.max(insets.top - 8, 0) }}>
        <Pressable onPress={finish} hitSlop={10}>
          <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.semibold }}>
            Fechar
          </Text>
        </Pressable>
        <Heading>Salvar no Word Map</Heading>
        <Muted>Escolha em qual vault guardar o texto compartilhado.</Muted>
      </View>

      {shareError ? <ErrorText>{shareError.message}</ErrorText> : null}
      {!rawShared && !word ? (
        <ErrorText>Nenhum texto foi recebido. Compartilhe uma palavra de outro app.</ErrorText>
      ) : null}

      <View
        style={[
          styles.wordBox,
          { backgroundColor: theme.shell.chip, borderColor: theme.shell.line },
        ]}
      >
        <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 12 }}>
          PALAVRA / FRASE
        </Text>
        <TextInput
          value={word}
          onChangeText={setWord}
          placeholder="ex.: hello"
          placeholderTextColor={theme.shell.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            marginTop: 6,
            color: theme.shell.foreground,
            fontFamily: theme.fonts.bold,
            fontSize: 22,
            padding: 0,
          }}
        />
        {lookingUp ? (
          <Text style={{ marginTop: 8, color: theme.shell.muted, fontFamily: theme.fonts.regular, fontSize: 12 }}>
            Buscando no dicionário…
          </Text>
        ) : translations[0] ? (
          <Text style={{ marginTop: 8, color: theme.shell.muted, fontFamily: theme.fonts.regular, fontSize: 13 }}>
            {translations[0]}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.search,
          { backgroundColor: theme.shell.chip, borderColor: "transparent" },
        ]}
      >
        <Ionicons name="search" size={14} color={theme.shell.muted} />
        <TextInput
          value={filter}
          onChangeText={setFilter}
          placeholder="Procurar um vault…"
          placeholderTextColor={theme.shell.muted}
          autoCapitalize="none"
          style={{ flex: 1, color: theme.shell.foreground, fontFamily: theme.fonts.regular, fontSize: 14, padding: 0 }}
        />
      </View>

      {actionError ? <ErrorText>{actionError}</ErrorText> : null}
      {actionOk ? (
        <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.medium, marginTop: 8, fontSize: 13 }}>
          {actionOk}
        </Text>
      ) : null}

      {loadingVaults ? (
        <View style={{ marginTop: 24, alignItems: "center" }}>
          <ActivityIndicator color={theme.colors.green} />
        </View>
      ) : (
        <ScrollView style={{ marginTop: 8, flex: 1 }} keyboardShouldPersistTaps="handled">
          {filteredVaults.length === 0 ? (
            <Muted>Nenhum vault encontrado. Crie um na aba Vaults.</Muted>
          ) : (
            filteredVaults.map((item) => {
              const inVault = membership.has(item.id);
              const busy = busyVaultId === item.id;
              return (
                <Pressable
                  key={item.id}
                  disabled={busyVaultId != null || !word.trim()}
                  onPress={() => void toggleVault(item)}
                  style={[
                    styles.row,
                    {
                      borderBottomColor: theme.shell.line,
                      opacity: busyVaultId != null && !busy ? 0.5 : 1,
                    },
                  ]}
                >
                  <View style={[styles.thumb, { backgroundColor: theme.shell.chip }]}>
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
        </ScrollView>
      )}

      <View style={{ paddingBottom: Math.max(insets.bottom, 12), paddingTop: 8 }}>
        <PrimaryButton label="Concluir" onPress={finish} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  wordBox: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  search: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
