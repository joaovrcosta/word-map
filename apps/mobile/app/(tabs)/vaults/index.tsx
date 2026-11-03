import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type Href, router, useFocusEffect } from "expo-router";
import {
  LearningProgressExplainModal,
  LearningProgressRing,
  vaultLearningStats,
} from "../../../src/features/vaults/learning-progress";
import { useSession } from "../../../src/session";
import { useTheme } from "../../../src/theme";
import { countLabel, type Vault } from "../../../src/types";
import { ErrorText, Field, Heading, Loading, PrimaryButton, Screen, useTabBarInset } from "../../../src/ui";

type Filter = "all" | "progress" | "learned" | "empty";

const ACCENTS = ["#4B7BFF", "#9B5CFF", "#FF4B6A", "#24c875", "#FF9600", "#00C2A8"] as const;

const ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  "sparkles",
  "bookmark",
  "heart",
  "time",
  "library",
  "folder",
];

function askConfirm(title: string, message: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
      { text: "Excluir", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

function vaultAccent(id: number) {
  return ACCENTS[Math.abs(id) % ACCENTS.length] ?? ACCENTS[0];
}

function vaultIcon(id: number): keyof typeof Ionicons.glyphMap {
  return ICONS[Math.abs(id) % ICONS.length] ?? "folder";
}

function DeckIcon({ accent, name }: { accent: string; name: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={{ width: 56, height: 56 }}>
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 4,
          width: 46,
          height: 46,
          borderRadius: 12,
          backgroundColor: accent,
          opacity: 0.35,
          transform: [{ rotate: "8deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 2,
          top: 2,
          width: 46,
          height: 46,
          borderRadius: 12,
          backgroundColor: accent,
          opacity: 0.55,
          transform: [{ rotate: "-4deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: 48,
          height: 48,
          borderRadius: 13,
          backgroundColor: accent,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={name} size={22} color="#FFFFFF" />
      </View>
    </View>
  );
}

export default function VaultListScreen() {
  const theme = useTheme();
  const tabInset = useTabBarInset();
  const { request } = useSession();
  const [vaults, setVaults] = useState<Vault[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ id: number | null; name: string; isPublic: boolean } | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const [explainOpen, setExplainOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await request<Vault[]>("/vaults");
      setVaults(data);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os vaults");
      setVaults((current) => current ?? []);
    }
  }, [request]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const filtered = useMemo(() => {
    if (!vaults) return [];
    const term = query.trim().toLowerCase();
    let list = vaults.filter((vault) => {
      if (term && !vault.name.toLowerCase().includes(term)) return false;
      const { total, percent } = vaultLearningStats(vault.words);
      if (filter === "empty") return total === 0;
      if (filter === "learned") return total > 0 && percent >= 100;
      if (filter === "progress") return total > 0 && percent < 100;
      return true;
    });
    list = [...list].sort((left, right) => {
      const cmp = left.name.localeCompare(right.name, "pt");
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [vaults, filter, query, sortAsc]);

  const saveVault = async () => {
    if (!editor || !editor.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editor.id == null) {
        await request("/vaults", {
          method: "POST",
          body: JSON.stringify({ name: editor.name.trim(), isPublic: editor.isPublic }),
        });
      } else {
        await request(`/vaults/${editor.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: editor.name.trim(), isPublic: editor.isPublic }),
        });
      }
      setEditor(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o vault");
    } finally {
      setSaving(false);
    }
  };

  const removeVault = async (vault: Vault) => {
    const confirmed = await askConfirm(
      "Excluir vault",
      `Excluir “${vault.name}”? As palavras deste vault também saem.`
    );
    if (!confirmed) return;
    try {
      await request(`/vaults/${vault.id}`, { method: "DELETE" });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível excluir o vault");
    }
  };

  if (!vaults) return <Loading />;

  const chips: Array<{ id: Filter; label: string }> = [
    { id: "all", label: "Todos" },
    { id: "progress", label: "Em progresso" },
    { id: "learned", label: "Aprendidos" },
    { id: "empty", label: "Vazios" },
  ];

  return (
    <Screen reserveTabBar={false} backgroundColor={theme.shell.background}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: "#FFFFFF", fontFamily: theme.fonts.bold, fontSize: 34, letterSpacing: -0.5 }}>
          Meus vaults
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            accessibilityLabel="Buscar"
            onPress={() => setSearchOpen((open) => !open)}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Ionicons name="search" size={20} color="#FFFFFF" />
          </Pressable>
          <Pressable
            accessibilityLabel="Ordenar"
            onPress={() => setSortAsc((value) => !value)}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Ionicons name="swap-vertical" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {searchOpen ? (
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar vault"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={{
            marginTop: 12,
            height: 44,
            borderRadius: 12,
            paddingHorizontal: 14,
            color: "#FFFFFF",
            backgroundColor: "#1C1C1E",
            fontFamily: theme.fonts.regular,
            fontSize: 15,
          }}
        />
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
        {chips.map((chip) => {
          const active = filter === chip.id;
          return (
            <Pressable
              key={chip.id}
              onPress={() => setFilter(chip.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: active ? "#2A2A2C" : "transparent",
                borderWidth: 1,
                borderColor: active ? "#2A2A2C" : "rgba(255,255,255,0.22)",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: active ? theme.fonts.bold : theme.fonts.medium,
                  fontSize: 13,
                }}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <ErrorText>{error}</ErrorText> : null}

      {filtered.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", paddingBottom: tabInset }}>
          <Text style={{ color: "rgba(255,255,255,0.55)", fontFamily: theme.fonts.medium, fontSize: 15 }}>
            {vaults.length === 0
              ? "Nenhum vault ainda. Crie um e adicione palavras."
              : "Nenhum vault neste filtro."}
          </Text>
          {vaults.length === 0 ? (
            <PrimaryButton
              label="Criar vault"
              onPress={() => setEditor({ id: null, name: "", isPublic: false })}
            />
          ) : null}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          style={{ marginTop: 10, flex: 1 }}
          contentContainerStyle={{ paddingBottom: tabInset + 72 }}
          ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
          renderItem={({ item }) => {
            const accent = vaultAccent(item.id);
            const { total, percent } = vaultLearningStats(item.words);
            return (
              <Pressable
                onPress={() => router.push(`/vaults/${item.id}` as Href)}
                onLongPress={() => {
                  Alert.alert(item.name, undefined, [
                    {
                      text: "Editar",
                      onPress: () =>
                        setEditor({
                          id: item.id,
                          name: item.name,
                          isPublic: Boolean(item.isPublic),
                        }),
                    },
                    {
                      text: "Excluir",
                      style: "destructive",
                      onPress: () => void removeVault(item),
                    },
                    { text: "Cancelar", style: "cancel" },
                  ]);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 4,
                }}
              >
                <DeckIcon accent={accent} name={vaultIcon(item.id)} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={{ color: "#FFFFFF", fontFamily: theme.fonts.bold, fontSize: 17 }}
                  >
                    {item.name}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.55)",
                        fontFamily: theme.fonts.medium,
                        fontSize: 13,
                      }}
                    >
                      {countLabel(total, "palavra", "palavras")}
                    </Text>
                    <Ionicons
                      name={item.isPublic ? "globe-outline" : "lock-closed"}
                      size={12}
                      color="rgba(255,255,255,0.35)"
                    />
                    {item.isPublic ? (
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.35)",
                          fontFamily: theme.fonts.medium,
                          fontSize: 12,
                        }}
                      >
                        Público
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Pressable
                  onPress={() => setExplainOpen(true)}
                  hitSlop={8}
                  accessibilityLabel={`Progresso ${percent}%`}
                >
                  <LearningProgressRing percent={percent} size={52} color={accent} />
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}

      <Pressable
        accessibilityLabel="Novo vault"
        onPress={() => setEditor({ id: null, name: "", isPublic: false })}
        style={{
          position: "absolute",
          right: 20,
          bottom: tabInset + 12,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 3,
          borderColor: "#9B5CFF",
        }}
      >
        <Ionicons name="add" size={30} color="#111" />
      </Pressable>

      <LearningProgressExplainModal visible={explainOpen} onClose={() => setExplainOpen(false)} />

      <Modal animationType="fade" transparent visible={editor != null} onRequestClose={() => setEditor(null)}>
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
            <Heading>{editor?.id == null ? "Novo vault" : "Editar vault"}</Heading>
            <Field
              autoFocus
              value={editor?.name ?? ""}
              onChangeText={(name) => setEditor((current) => (current ? { ...current, name } : current))}
              placeholder="Nome do vault"
            />
            <Pressable
              onPress={() =>
                setEditor((current) =>
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
                value={Boolean(editor?.isPublic)}
                onValueChange={(isPublic) =>
                  setEditor((current) => (current ? { ...current, isPublic } : current))
                }
                trackColor={{ false: "rgba(255,255,255,0.18)", true: "rgba(36,200,117,0.45)" }}
                thumbColor={editor?.isPublic ? "#24c875" : "#f4f3f4"}
              />
            </Pressable>
            <PrimaryButton
              label={saving ? "Salvando..." : "Salvar"}
              disabled={saving || !editor?.name.trim()}
              onPress={() => void saveVault()}
            />
            <Pressable onPress={() => setEditor(null)} style={{ alignItems: "center", marginTop: 14 }}>
              <Text style={{ color: "rgba(255,255,255,0.55)", fontFamily: theme.fonts.semibold }}>
                Cancelar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = {
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
};
