import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { grammarClassLabel, type FlashcardWord } from "@word-map/shared";
import { speakWord } from "../../../speech";
import { useTheme } from "../../../theme";
import { cues } from "../cues";
import { FlipCard, useMotionEnabled, useStudyCardSize } from "../motion";
import { DuoButton } from "./duo-button";

const RATINGS = [
  { confidence: 1, label: "Não lembro" },
  { confidence: 2, label: "Difícil" },
  { confidence: 3, label: "Bom" },
  { confidence: 4, label: "Fácil" },
] as const;

function StudyCard({ children, onSpeak }: { children: ReactNode; onSpeak: () => void }) {
  const theme = useTheme();
  const size = useStudyCardSize();
  const dark = theme.name === "dark";

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 28,
        backgroundColor: dark ? theme.colors.card : "#ffffff",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.16,
        shadowRadius: 18,
        elevation: 8,
      }}
    >
      <Pressable
        onPress={onSpeak}
        accessibilityLabel="Ouvir"
        hitSlop={8}
        style={{ position: "absolute", top: 16, right: 16, width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
      >
        <Ionicons name="volume-high" size={26} color="#1cb0f6" />
      </Pressable>
      {children}
    </View>
  );
}

export function RecallCard({
  word,
  showAnswer,
  onToggle,
  onAnswer,
}: {
  word: FlashcardWord;
  showAnswer: boolean;
  onToggle: () => void;
  onAnswer: (confidence: number) => void;
}) {
  const theme = useTheme();
  const cardSize = useStudyCardSize();
  const motion = useMotionEnabled();
  const lockedRef = useRef(false);
  const [popToken, setPopToken] = useState(0);

  useEffect(() => {
    lockedRef.current = false;
  }, [word.id]);

  const rate = (confidence: number) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    cues.rate();
    if (confidence < 3 || !motion) {
      onAnswer(confidence);
      return;
    }
    setPopToken((current) => current + 1);
    setTimeout(() => onAnswer(confidence), 420);
  };

  const speak = () => speakWord(word.name);

  return (
    <View style={{ flex: 1, paddingTop: 24, paddingBottom: 16 }}>
      <FlipCard
        flipped={showAnswer}
        popToken={popToken}
        front={
          <StudyCard onSpeak={speak}>
            {word.grammaticalClass ? (
              <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.bold, fontSize: 12, letterSpacing: 0.8 }}>
                {grammarClassLabel(word.grammaticalClass).toUpperCase()}
              </Text>
            ) : null}
            <Text
              style={{
                marginTop: 8,
                color: theme.colors.foreground,
                fontFamily: theme.fonts.bold,
                fontSize: 34,
                textAlign: "center",
              }}
            >
              {word.name}
            </Text>
          </StudyCard>
        }
        back={
          <StudyCard onSpeak={speak}>
            {word.translations.length > 0 ? (
              word.translations.map((translation, index) => (
                <Text
                  key={`${translation}-${index}`}
                  style={{ color: theme.colors.greenText, fontFamily: theme.fonts.bold, fontSize: 28, textAlign: "center" }}
                >
                  {translation}
                </Text>
              ))
            ) : (
              <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.regular, fontSize: 16 }}>Sem tradução</Text>
            )}
            <Text style={{ marginTop: 10, color: theme.colors.mutedForeground, fontFamily: theme.fonts.bold, fontSize: 14 }}>{word.name}</Text>
          </StudyCard>
        }
      />
      {showAnswer ? (
        <View style={{ marginTop: "auto", width: cardSize, alignSelf: "center", flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {RATINGS.map((rating) => (
            <Pressable
              key={rating.confidence}
              onPress={() => rate(rating.confidence)}
              style={{
                flexGrow: 1,
                flexBasis: "45%",
                height: 52,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.green,
              }}
            >
              <Text style={{ color: "#ffffff", fontFamily: theme.fonts.bold, fontSize: 13 }}>{rating.label.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={{ marginTop: "auto", width: cardSize, alignSelf: "center" }}>
          <DuoButton label="CONTINUAR" onPress={onToggle} color={theme.colors.green} />
        </View>
      )}
    </View>
  );
}
