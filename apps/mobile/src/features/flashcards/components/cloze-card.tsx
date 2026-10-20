import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { answersMatch, clozeTranslationHint, splitSentenceAtAnswer, type FlashcardWord } from "@word-map/shared";
import { useTheme } from "../../../theme";
import { cues } from "../cues";
import { MotionFrame } from "../motion";
import { DuoButton } from "./duo-button";
import { FeedbackBanner } from "./feedback-banner";

export function ClozeCard({
  word,
  sentence,
  answer,
  onAnswer,
}: {
  word: FlashcardWord;
  sentence: string;
  answer: string;
  onAnswer: (correct: boolean) => void;
}) {
  const theme = useTheme();
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState<boolean | null>(null);
  const [popToken, setPopToken] = useState(0);
  const [shakeToken, setShakeToken] = useState(0);
  const aliveRef = useRef(true);
  const hint = clozeTranslationHint(word.translations, answer);
  const parts = splitSentenceAtAnswer(sentence, answer);
  const initial = answer.trim().slice(0, 1);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const finish = (correct: boolean) => {
    if (picked !== null) return;
    setPicked(correct);
    if (correct) {
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
        COMPLETE A FRASE
      </Text>
      <Text style={{ marginTop: 24, textAlign: "center", color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 22 }}>
        {parts.map((part, index) =>
          part.type === "text" ? (
            <Text key={index}>{part.value}</Text>
          ) : (
            <Text
              key={index}
              style={{
                color: theme.colors.greenText,
                borderBottomWidth: 2,
                borderBottomColor: theme.colors.green,
              }}
            >
              {` ${initial} `}
            </Text>
          )
        )}
      </Text>
      {hint ? (
        <Text style={{ marginTop: 12, color: theme.colors.mutedForeground, fontFamily: theme.fonts.regular, fontSize: 15 }}>{hint}</Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={setValue}
        editable={picked === null}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        accessibilityLabel="Palavra que completa a frase"
        onSubmitEditing={() => finish(answersMatch(value, answer))}
        style={{
          marginTop: 28,
          width: "100%",
          height: 48,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: picked === true ? theme.colors.green : picked === false ? theme.colors.destructive : theme.colors.border,
          color: theme.colors.foreground,
          backgroundColor: theme.colors.card,
          fontFamily: theme.fonts.bold,
          fontSize: 16,
          textAlign: "center",
          paddingHorizontal: 16,
        }}
      />
      {picked === null ? (
        <View style={{ marginTop: "auto", width: "100%" }}>
          <Pressable onPress={() => finish(false)} style={{ alignItems: "center", paddingVertical: 10, marginBottom: 6 }}>
            <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.semibold, fontSize: 15 }}>Não sei</Text>
          </Pressable>
          <DuoButton
            label="VERIFICAR"
            disabled={!value.trim()}
            onPress={() => finish(answersMatch(value, answer))}
            color={theme.colors.green}
          />
        </View>
      ) : null}
      </MotionFrame>
      {picked !== null ? (
        <FeedbackBanner
          correct={picked}
          answer={answer}
          onContinue={() => {
            if (!aliveRef.current) return;
            onAnswer(picked);
          }}
        />
      ) : null}
    </View>
  );
}
