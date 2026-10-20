import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import Animated, { FadeInDown } from "react-native-reanimated";
import { type FlashcardWord } from "@word-map/shared";
import { speakWord } from "../../../speech";
import { useTheme } from "../../../theme";
import { cues } from "../cues";
import { MotionFrame, useMotionEnabled } from "../motion";
import { PressScale } from "./duo-button";
import { FeedbackBanner } from "./feedback-banner";
import { primaryTranslation } from "../words";

export function ListenCard({
  word,
  options,
  onAnswer,
}: {
  word: FlashcardWord;
  options: string[];
  onAnswer: (correct: boolean) => void;
}) {
  const theme = useTheme();
  const motion = useMotionEnabled();
  const [picked, setPicked] = useState<string | null>(null);
  const [popToken, setPopToken] = useState(0);
  const [shakeToken, setShakeToken] = useState(0);
  const aliveRef = useRef(true);
  const correct = primaryTranslation(word).toLowerCase();

  useEffect(() => {
    aliveRef.current = true;
    speakWord(word.name);
    return () => {
      aliveRef.current = false;
      Speech.stop();
    };
  }, [word.id, word.name]);

  const choose = (option: string) => {
    if (picked) return;
    const isCorrect = option.trim().toLowerCase() === correct;
    setPicked(option);
    if (isCorrect) {
      cues.correct();
      setPopToken((current) => current + 1);
    } else {
      cues.wrong();
      setShakeToken((current) => current + 1);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <MotionFrame popToken={popToken} shakeToken={shakeToken} burst={popToken} style={{ flex: 1, alignItems: "center", paddingTop: 24, paddingHorizontal: 20, paddingBottom: 16 }}>
      <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.bold, fontSize: 13, letterSpacing: 0.6 }}>
        OUÇA E MARQUE A TRADUÇÃO
      </Text>
      <Pressable
        onPress={() => speakWord(word.name)}
        accessibilityLabel="Ouvir de novo"
        style={{
          marginTop: 24,
          width: 64,
          height: 64,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: theme.colors.green,
          backgroundColor: theme.colors.greenSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="volume-high" size={28} color={theme.colors.greenText} />
      </Pressable>
      <View style={{ marginTop: 28, width: "100%", gap: 12 }}>
        {options.map((option, index) => {
          const isPicked = picked === option;
          const isRight = option.trim().toLowerCase() === correct;
          const showRight = picked !== null && isRight;
          const showWrong = isPicked && !isRight;
          return (
            <Animated.View key={option} entering={motion ? FadeInDown.delay(index * 40).duration(220) : undefined}>
              <PressScale
                disabled={picked !== null}
                onPress={() => choose(option)}
                style={{
                  minHeight: 48,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: showRight ? theme.colors.green : showWrong ? theme.colors.destructive : theme.colors.border,
                  backgroundColor: showRight ? theme.colors.greenSoft : theme.colors.card,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 16, textAlign: "center" }}>
                  {option}
                </Text>
              </PressScale>
            </Animated.View>
          );
        })}
      </View>
      </MotionFrame>
      {picked !== null ? (
        <FeedbackBanner
          correct={picked.trim().toLowerCase() === correct}
          answer={primaryTranslation(word)}
          onContinue={() => {
            if (!aliveRef.current) return;
            onAnswer(picked.trim().toLowerCase() === correct);
          }}
        />
      ) : null}
    </View>
  );
}
