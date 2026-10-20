import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { type Href, router, useFocusEffect } from "expo-router";
import { useSession } from "../../../src/session";
import { useTheme } from "../../../src/theme";
import { countLabel, type Vault } from "../../../src/types";
import { ErrorText, Field, Heading, Loading, Muted, PrimaryButton, Screen } from "../../../src/ui";

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

export default function VaultListScreen() {
  const theme = useTheme();
  const { request } = useSession();
  const [vaults, setVaults] = useState<Vault[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ id: number | null; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

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

  const saveVault = async () => {
    if (!editor || !editor.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editor.id == null) {
        await request("/vaults", {
          method: "POST",
          body: JSON.stringify({ name: editor.name.trim() }),
        });
      } else {
        await request(`/vaults/${editor.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: editor.name.trim() }),
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

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Heading>Vaults</Heading>
        <Pressable onPress={() => setEditor({ id: null, name: "" })}>
          <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.bold, fontSize: 16 }}>
            Novo
          </Text>
        </Pressable>
      </View>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {vaults.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Muted>Nenhum vault ainda. Crie um e adicione palavras.</Muted>
          <PrimaryButton label="Criar vault" onPress={() => setEditor({ id: null, name: "" })} />
        </View>
      ) : (
        <FlatList
          data={vaults}
          keyExtractor={(item) => String(item.id)}
          style={{ marginTop: 8, flex: 1 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/vaults/${item.id}` as Href)}
              style={{
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
                paddingVertical: 14,
              }}
            >
              <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 18 }}>
                {item.name}
              </Text>
              <Muted>{countLabel(item.words?.length ?? 0, "palavra", "palavras")}</Muted>
              <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
                <Pressable onPress={() => setEditor({ id: item.id, name: item.name })}>
                  <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.semibold }}>
                    Renomear
                  </Text>
                </Pressable>
                <Pressable onPress={() => void removeVault(item)}>
                  <Text style={{ color: theme.colors.destructive, fontFamily: theme.fonts.semibold }}>
                    Excluir
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          )}
        />
      )}
      <Modal animationType="fade" transparent visible={editor != null} onRequestClose={() => setEditor(null)}>
        <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.45)" }}>
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: theme.radii.lg,
              padding: 20,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Heading>{editor?.id == null ? "Novo vault" : "Renomear"}</Heading>
            <Field
              autoFocus
              value={editor?.name ?? ""}
              onChangeText={(name) => setEditor((current) => (current ? { ...current, name } : current))}
              placeholder="Nome do vault"
            />
            <PrimaryButton
              label={saving ? "Salvando..." : "Salvar"}
              disabled={saving || !editor?.name.trim()}
              onPress={() => void saveVault()}
            />
            <Pressable onPress={() => setEditor(null)} style={{ alignItems: "center", marginTop: 14 }}>
              <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.semibold }}>
                Cancelar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
