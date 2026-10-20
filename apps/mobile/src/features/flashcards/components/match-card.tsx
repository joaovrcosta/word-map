import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import { type FlashcardWord, type MatchPair } from "@word-map/shared";
import { useTheme } from "../../../theme";
import { cues } from "../cues";
import { MotionFrame, ShakeView, useMotionEnabled } from "../motion";
import { BUTTON_EDGE, DuoButton, PressScale } from "./duo-button";
import { shufflePairs } from "../lesson-queue";

function MatchTile({
  label,
  done,
  wrong,
  selected,
  onPress,
}: {
  label: string;
  done: boolean;
  wrong: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const motion = useMotionEnabled();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!done) return;
    if (!motion) {
      opacity.value = 0;
      return;
    }
    scale.value = withSequence(withTiming(1.08, { duration: 120 }), withTiming(0, { duration: 180 }));
    opacity.value = withDelay(120, withTiming(0, { duration: 180 }));
  }, [done, motion, opacity, scale]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <ShakeView active={wrong}>
      <View style={{ height: 76 }}>
        <Animated.View style={[{ flex: 1 }, animated]}>
          <PressScale
            disabled={done}
            onPress={onPress}
            style={{
              flex: 1,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: wrong ? theme.colors.destructive : done || selected ? theme.colors.green : theme.colors.border,
              backgroundColor: done ? theme.colors.greenSoft : "transparent",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 10,
            }}
          >
            <Text numberOfLines={3} style={{ color: theme.colors.foreground, fontFamily: theme.fonts.medium, fontSize: 15, textAlign: "center" }}>
              {label}
            </Text>
          </PressScale>
        </Animated.View>
      </View>
    </ShakeView>
  );
}

export function MatchCard({
  pairs,
  onPair,
  onComplete,
}: {
  pairs: MatchPair[];
  onPair: (word: FlashcardWord, correct: boolean) => void;
  onComplete: (missed: FlashcardWord[]) => void;
}) {
  const theme = useTheme();
  const [translations] = useState(() => shufflePairs(pairs));
  const [words] = useState(() => shufflePairs(pairs));
  const [selectedTranslation, setSelectedTranslation] = useState<number | null>(null);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [wrongIds, setWrongIds] = useState<number[]>([]);
  const [popToken, setPopToken] = useState(0);
  const aliveRef = useRef(true);
  const scoredRef = useRef(new Set<number>());
  const missedRef = useRef<FlashcardWord[]>([]);
  const ready = matched.length === pairs.length;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const mark = (word: FlashcardWord, correct: boolean) => {
    if (scoredRef.current.has(word.id)) return;
    scoredRef.current.add(word.id);
    if (!correct) missedRef.current = [...missedRef.current, word];
    onPair(word, correct);
  };

  const resolve = (translationId: number, wordId: number) => {
    const pair = pairs.find((item) => item.word.id === translationId);
    if (!pair) return;
    if (translationId === wordId) {
      setMatched((current) => [...current, translationId]);
      setSelectedTranslation(null);
      setSelectedWord(null);
      setWrongIds([]);
      cues.correct();
      setPopToken((current) => current + 1);
      mark(pair.word, true);
      return;
    }
    setWrongIds([translationId, wordId]);
    cues.wrong();
    mark(pair.word, false);
    setTimeout(() => {
      setSelectedTranslation(null);
      setSelectedWord(null);
      setWrongIds([]);
    }, 450);
  };

  const pickTranslation = (id: number) => {
    if (matched.includes(id)) return;
    cues.tap();
    setSelectedTranslation(id);
    setWrongIds([]);
    if (selectedWord !== null) resolve(id, selectedWord);
  };

  const pickWord = (id: number) => {
    if (matched.includes(id)) return;
    cues.tap();
    setSelectedWord(id);
    setWrongIds([]);
    if (selectedTranslation !== null) resolve(selectedTranslation, id);
  };

  const renderTile = (id: number, label: string, onPress: () => void, selected: boolean) => (
    <MatchTile
      key={id}
      label={label}
      done={matched.includes(id)}
      wrong={wrongIds.includes(id)}
      selected={selected}
      onPress={onPress}
    />
  );

  return (
    <MotionFrame popToken={popToken} shakeToken={0} burst={popToken} style={{ flex: 1, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16 }}>
      <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 22 }}>Combine os pares:</Text>
      <View style={{ marginTop: 22, flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1, gap: 12 }}>
          {translations.map((pair) =>
            renderTile(
              pair.word.id,
              pair.translation,
              () => pickTranslation(pair.word.id),
              selectedTranslation === pair.word.id
            )
          )}
        </View>
        <View style={{ flex: 1, gap: 12 }}>
          {words.map((pair) =>
            renderTile(pair.word.id, pair.word.name, () => pickWord(pair.word.id), selectedWord === pair.word.id)
          )}
        </View>
      </View>
      <View style={{ marginTop: "auto" }}>
        <DuoButton
          label="VERIFICAR"
          disabled={!ready}
          onPress={() => {
            if (!aliveRef.current || !ready) return;
            onComplete(missedRef.current);
          }}
          color={ready ? theme.colors.green : theme.colors.muted}
          edge={ready ? BUTTON_EDGE : theme.colors.border}
        />
      </View>
    </MotionFrame>
  );
}
