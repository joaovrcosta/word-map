import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const VAULT_ACCENTS = ["#4B7BFF", "#9B5CFF", "#FF4B6A", "#24c875", "#FF9600", "#00C2A8"] as const;

const ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  "sparkles",
  "bookmark",
  "heart",
  "time",
  "library",
  "folder",
];

export function vaultAccent(id: number) {
  return VAULT_ACCENTS[Math.abs(id) % VAULT_ACCENTS.length] ?? VAULT_ACCENTS[0];
}

export function vaultIcon(id: number): keyof typeof Ionicons.glyphMap {
  return ICONS[Math.abs(id) % ICONS.length] ?? "folder";
}

export function DeckThumb({
  accent,
  name,
  size = 56,
}: {
  accent: string;
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
}) {
  const back = Math.round(size * 0.82);
  const front = Math.round(size * 0.86);
  const iconSize = Math.round(size * 0.39);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: "absolute",
          right: 0,
          top: Math.round(size * 0.07),
          width: back,
          height: back,
          borderRadius: Math.round(size * 0.21),
          backgroundColor: accent,
          opacity: 0.35,
          transform: [{ rotate: "8deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          left: Math.round(size * 0.04),
          top: Math.round(size * 0.04),
          width: back,
          height: back,
          borderRadius: Math.round(size * 0.21),
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
          width: front,
          height: front,
          borderRadius: Math.round(size * 0.23),
          backgroundColor: accent,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={name} size={iconSize} color="#FFFFFF" />
      </View>
    </View>
  );
}

export function VaultDeckThumb({ vaultId, size = 56 }: { vaultId: number | null; size?: number }) {
  if (vaultId == null) {
    return <DeckThumb accent="#8E8E93" name="layers" size={size} />;
  }
  return <DeckThumb accent={vaultAccent(vaultId)} name={vaultIcon(vaultId)} size={size} />;
}
