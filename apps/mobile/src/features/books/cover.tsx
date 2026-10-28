import { Image, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const houndCover = require("../../../assets/covers/hound-of-the-baskervilles.jpg");

const COVER_PALETTES = [
  { paper: "#f6f1e6", ink: "#1d6a86", spot: "#f0b429" },
  { paper: "#fff4ea", ink: "#e07a3d", spot: "#3d6ef5" },
  { paper: "#f4f0ff", ink: "#6a4de0", spot: "#f26d85" },
  { paper: "#eef8f1", ink: "#1c8a4c", spot: "#f2c14b" },
  { paper: "#fff0f3", ink: "#c43b5a", spot: "#7d5cff" },
];

export function isSherlockBook(title: string) {
  return /sherlock|baskerville|hound|doyle/i.test(title);
}

export function bookAuthor(title: string) {
  if (isSherlockBook(title)) return "Arthur Conan Doyle";
  return null;
}

export function BookArt({
  title,
  bookId = 0,
  coverUrl,
}: {
  title: string;
  bookId?: number;
  coverUrl?: string | null;
}) {
  if (coverUrl?.trim()) {
    return <Image source={{ uri: coverUrl.trim() }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />;
  }
  if (isSherlockBook(title)) {
    return <Image source={houndCover} style={{ width: "100%", height: "100%" }} resizeMode="cover" />;
  }

  const palette = COVER_PALETTES[Math.abs(bookId) % COVER_PALETTES.length]!;
  return (
    <View style={{ flex: 1, backgroundColor: palette.paper, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: "72%",
          height: "62%",
          borderRadius: 18,
          backgroundColor: palette.ink,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: palette.spot,
          }}
        />
        <Ionicons name="book" size={36} color="#fffaf3" />
      </View>
    </View>
  );
}
