import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  answersMatch,
  clozeTranslationHint,
  splitSentenceAtAnswer,
  type FlashcardWord,
  type MatchPair,
} from "@word-map/shared";
import { speakWord } from "../../speech";
import { useTheme } from "../../theme";
import { cues } from "./cues";
import { shufflePairs } from "./lesson-queue";
import { useMotionEnabled } from "./motion";
import { primaryTranslation } from "./words";

const SWIPE_THRESHOLD = 110;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BRING_FORWARD_MS = 360;

/** Carta de trás sobe pra frente (mesmo pose do peek: scale 0.96 / +14). */
export function ReviewBringForward({
  stepKey,
  children,
}: {
  stepKey: string;
  children: ReactNode;
}) {
  const motion = useMotionEnabled();
  const progress = useSharedValue(motion ? 0 : 1);

  useEffect(() => {
    if (!motion) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: BRING_FORWARD_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [motion, progress, stepKey]);

  const style = useAnimatedStyle(() => ({
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "stretch" as const,
    opacity: 0.72 + progress.value * 0.28,
    transform: [
      { scale: 0.96 + progress.value * 0.04 },
      { translateY: 14 * (1 - progress.value) },
    ],
  }));

  return <Reanimated.View style={style}>{children}</Reanimated.View>;
}

export function ReviewCardShell({
  children,
  footer,
  style,
}: {
  children: ReactNode;
  footer?: ReactNode;
  style?: object;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.shell.surface, borderColor: theme.shell.line },
        style,
      ]}
    >
      <View style={styles.cardBody}>{children}</View>
      {footer}
    </View>
  );
}

export function ReviewSwipeRecall({
  word,
  front,
  interactive,
  onFlip,
  onSwiped,
}: {
  word: FlashcardWord;
  front: boolean;
  interactive: boolean;
  onFlip: () => void;
  onSwiped: (knew: boolean) => void;
}) {
  const theme = useTheme();
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const flipAngle = useRef(new Animated.Value(0)).current;
  const [faceFront, setFaceFront] = useState(front);
  const faceFrontRef = useRef(front);
  const onSwipedRef = useRef(onSwiped);
  const flippingRef = useRef(false);
  onSwipedRef.current = onSwiped;

  useEffect(() => {
    dragX.setValue(0);
    dragY.setValue(0);
    flipAngle.setValue(0);
    faceFrontRef.current = true;
    setFaceFront(true);
    flippingRef.current = false;
  }, [dragX, dragY, flipAngle, word.id]);

  useEffect(() => {
    if (faceFrontRef.current === front) return;
    if (flippingRef.current) return;
    flippingRef.current = true;
    Animated.timing(flipAngle, {
      toValue: 90,
      duration: 140,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        flippingRef.current = false;
        return;
      }
      faceFrontRef.current = front;
      setFaceFront(front);
      flipAngle.setValue(-90);
      Animated.timing(flipAngle, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }).start(() => {
        flippingRef.current = false;
      });
    });
  }, [flipAngle, front]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          interactive && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          dragX.stopAnimation();
          dragY.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          dragX.setValue(gesture.dx);
          dragY.setValue(gesture.dy * 0.2);
        },
        onPanResponderRelease: (_, gesture) => {
          const goRight = gesture.dx > SWIPE_THRESHOLD || gesture.vx > 1.1;
          const goLeft = gesture.dx < -SWIPE_THRESHOLD || gesture.vx < -1.1;
          if (goRight || goLeft) {
            Animated.timing(dragX, {
              toValue: (goRight ? 1 : -1) * SCREEN_WIDTH * 1.25,
              duration: 200,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (finished) onSwipedRef.current(goRight);
            });
            return;
          }
          Animated.parallel([
            Animated.spring(dragX, { toValue: 0, useNativeDriver: true, bounciness: 6 }),
            Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 6 }),
          ]).start();
        },
      }),
    [dragX, dragY, interactive]
  );

  const rotate = dragX.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ["-12deg", "0deg", "12deg"],
    extrapolate: "clamp",
  });
  const knowOpacity = dragX.interpolate({
    inputRange: [20, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const againOpacity = dragX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -20],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const flipRotate = flipAngle.interpolate({
    inputRange: [-90, 0, 90],
    outputRange: ["-90deg", "0deg", "90deg"],
  });

  const translation = primaryTranslation(word);

  return (
    <Animated.View
      {...(interactive ? pan.panHandlers : {})}
      style={[
        styles.card,
        {
          backgroundColor: theme.shell.surface,
          borderColor: theme.shell.line,
          zIndex: interactive ? 2 : 1,
        },
        interactive
          ? {
              transform: [
                { translateX: dragX },
                { translateY: dragY },
                { rotate },
                { perspective: 1200 },
                { rotateY: flipRotate },
              ],
            }
          : { transform: [{ scale: 0.96 }, { translateY: 14 }] },
      ]}
    >
      {interactive ? (
        <>
          <Animated.View style={[styles.stamp, styles.stampKnow, { opacity: knowOpacity }]}>
            <Text style={[styles.stampText, { color: theme.colors.green }]}>SABIA</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampAgain, { opacity: againOpacity }]}>
            <Text style={[styles.stampText, { color: "#FF4B6A" }]}>NÃO LEMBRO</Text>
          </Animated.View>
        </>
      ) : null}

      <Pressable style={styles.cardInner} onPress={interactive ? onFlip : undefined}>
        <View style={styles.cardBody}>
          <Text style={[styles.meta, { fontFamily: theme.fonts.medium, color: theme.shell.muted }]}>
            {faceFront ? "toque para ver a tradução" : "toque para ver a palavra"}
          </Text>
          <Text style={[styles.word, { fontFamily: theme.fonts.bold, color: theme.shell.foreground }]}>
            {faceFront ? word.name : translation || "—"}
          </Text>
          {!faceFront && word.grammaticalClass ? (
            <Text
              style={[
                styles.meta,
                { fontFamily: theme.fonts.regular, color: theme.shell.muted, marginTop: 10, marginBottom: 0 },
              ]}
            >
              {word.grammaticalClass}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {interactive ? (
        <View style={styles.cardActions}>
          <Pressable
            accessibilityLabel="Ouvir palavra"
            hitSlop={8}
            onPress={() => speakWord(word.name)}
            style={[styles.iconBtn, { backgroundColor: "rgba(255,255,255,0.08)" }]}
          >
            <Ionicons name="volume-medium" size={22} color={theme.colors.green} />
          </Pressable>
          <Pressable
            accessibilityLabel="Virar cartão"
            hitSlop={8}
            onPress={onFlip}
            style={[styles.iconBtn, { backgroundColor: "rgba(255,255,255,0.08)" }]}
          >
            <Ionicons name="sync" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}
    </Animated.View>
  );
}

export function ReviewListen({
  word,
  options,
  onAnswer,
}: {
  word: FlashcardWord;
  options: string[];
  onAnswer: (correct: boolean, typed: string) => void;
}) {
  const theme = useTheme();
  const [picked, setPicked] = useState<string | null>(null);
  const correct = primaryTranslation(word).toLowerCase();

  useEffect(() => {
    setPicked(null);
    speakWord(word.name);
  }, [word.id, word.name]);

  const choose = (option: string) => {
    if (picked) return;
    const isCorrect = option.trim().toLowerCase() === correct;
    setPicked(option);
    if (isCorrect) cues.correct();
    else cues.wrong();
    setTimeout(() => onAnswer(isCorrect, option), isCorrect ? 420 : 650);
  };

  return (
    <ReviewCardShell
      footer={
        <View style={styles.cardActions}>
          <Pressable
            accessibilityLabel="Ouvir de novo"
            onPress={() => speakWord(word.name)}
            style={[styles.iconBtn, { backgroundColor: "rgba(255,255,255,0.08)" }]}
          >
            <Ionicons name="volume-medium" size={22} color={theme.colors.green} />
          </Pressable>
        </View>
      }
    >
      <Text style={[styles.meta, { fontFamily: theme.fonts.medium, color: theme.shell.muted }]}>
        Adivinhe a tradução
      </Text>
      <Text style={[styles.promptWord, { fontFamily: theme.fonts.bold, color: theme.shell.foreground }]}>
        {word.name}
      </Text>
      <View style={styles.options}>
        {options.map((option) => {
          const isPicked = picked === option;
          const isRight = option.trim().toLowerCase() === correct;
          const showRight = picked !== null && isRight;
          const showWrong = isPicked && !isRight;
          return (
            <Pressable
              key={option}
              disabled={picked !== null}
              onPress={() => choose(option)}
              style={[
                styles.option,
                {
                  borderColor: showRight
                    ? theme.colors.green
                    : showWrong
                      ? "#FF4B6A"
                      : theme.shell.line,
                  backgroundColor: showRight
                    ? "rgba(36,200,117,0.14)"
                    : showWrong
                      ? "rgba(255,75,106,0.12)"
                      : "rgba(255,255,255,0.04)",
                },
              ]}
            >
              <Text
                style={{
                  color: theme.shell.foreground,
                  fontFamily: theme.fonts.semibold,
                  fontSize: 16,
                  textAlign: "center",
                }}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ReviewCardShell>
  );
}

export function ReviewGuessWord({
  word,
  options,
  onAnswer,
}: {
  word: FlashcardWord;
  options: string[];
  onAnswer: (correct: boolean, typed: string) => void;
}) {
  const theme = useTheme();
  const [picked, setPicked] = useState<string | null>(null);
  const prompt = primaryTranslation(word) || word.name;
  const correct = word.name.toLowerCase();

  useEffect(() => {
    setPicked(null);
  }, [word.id]);

  const choose = (option: string) => {
    if (picked) return;
    const isCorrect = option.trim().toLowerCase() === correct;
    setPicked(option);
    if (isCorrect) cues.correct();
    else cues.wrong();
    setTimeout(() => onAnswer(isCorrect, option), isCorrect ? 420 : 650);
  };

  return (
    <ReviewCardShell>
      <Text style={[styles.meta, { fontFamily: theme.fonts.medium, color: theme.shell.muted }]}>
        Adivinhe a palavra
      </Text>
      <Text style={[styles.promptWord, { fontFamily: theme.fonts.bold, color: theme.shell.foreground }]}>
        {prompt}
      </Text>
      <View style={styles.options}>
        {options.map((option) => {
          const isPicked = picked === option;
          const isRight = option.trim().toLowerCase() === correct;
          const showRight = picked !== null && isRight;
          const showWrong = isPicked && !isRight;
          return (
            <Pressable
              key={option}
              disabled={picked !== null}
              onPress={() => choose(option)}
              style={[
                styles.option,
                {
                  borderColor: showRight
                    ? theme.colors.green
                    : showWrong
                      ? "#FF4B6A"
                      : theme.shell.line,
                  backgroundColor: showRight
                    ? "rgba(36,200,117,0.14)"
                    : showWrong
                      ? "rgba(255,75,106,0.12)"
                      : "rgba(255,255,255,0.04)",
                },
              ]}
            >
              <Text
                style={{
                  color: theme.shell.foreground,
                  fontFamily: theme.fonts.semibold,
                  fontSize: 16,
                  textAlign: "center",
                }}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ReviewCardShell>
  );
}

export function ReviewCloze({
  word,
  sentence,
  answer,
  onAnswer,
}: {
  word: FlashcardWord;
  sentence: string;
  answer: string;
  onAnswer: (correct: boolean, typed: string) => void;
}) {
  const theme = useTheme();
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState<boolean | null>(null);
  const typedRef = useRef("");
  const hint = clozeTranslationHint(word.translations, answer);
  const parts = splitSentenceAtAnswer(sentence, answer);
  const initial = answer.trim().slice(0, 2);
  const blankLabel = picked === null ? ` ${initial}··· ` : ` ${answer} `;

  useEffect(() => {
    setValue("");
    setPicked(null);
    typedRef.current = "";
  }, [word.id, sentence, answer]);

  const finish = (correct: boolean) => {
    if (picked !== null) return;
    typedRef.current = value;
    setPicked(correct);
    if (correct) {
      cues.correct();
      setTimeout(() => onAnswer(true, typedRef.current), 420);
      return;
    }
    cues.wrong();
  };

  return (
    <ReviewCardShell
      footer={
        picked === null ? (
          <View style={{ gap: 10 }}>
            <Pressable onPress={() => finish(false)} style={{ alignItems: "center", paddingVertical: 4 }}>
              <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 14 }}>
                Não sei
              </Text>
            </Pressable>
            <Pressable
              disabled={!value.trim()}
              onPress={() => finish(answersMatch(value, answer))}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: value.trim() ? theme.colors.green : "rgba(255,255,255,0.12)",
                  opacity: value.trim() ? 1 : 0.55,
                },
              ]}
            >
              <Text style={{ color: value.trim() ? "#111" : "#fff", fontFamily: theme.fonts.bold }}>
                Verificar
              </Text>
            </Pressable>
          </View>
        ) : picked === false ? (
          <View style={{ gap: 12 }}>
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ color: "#FF4B6A", fontFamily: theme.fonts.bold, fontSize: 15 }}>
                Resposta correta
              </Text>
              <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 20 }}>
                {answer}
              </Text>
            </View>
            <Pressable
              onPress={() => onAnswer(false, typedRef.current)}
              style={[styles.primaryBtn, { backgroundColor: "#FF4B6A" }]}
            >
              <Text style={{ color: "#fff", fontFamily: theme.fonts.bold }}>Continuar</Text>
            </Pressable>
          </View>
        ) : null
      }
    >
      <Text style={[styles.meta, { fontFamily: theme.fonts.medium, color: theme.shell.muted }]}>
        Complete a frase
      </Text>
      <Text
        style={{
          marginTop: 8,
          textAlign: "center",
          color: theme.shell.foreground,
          fontFamily: theme.fonts.bold,
          fontSize: 22,
          lineHeight: 32,
        }}
      >
        {parts.map((part, index) =>
          part.type === "text" ? (
            <Text key={index}>{part.value}</Text>
          ) : (
            <Text
              key={index}
              style={{ color: picked === false ? "#FF4B6A" : theme.colors.green }}
            >
              {blankLabel}
            </Text>
          )
        )}
      </Text>
      {hint ? (
        <Text
          style={{
            marginTop: 12,
            color: theme.shell.muted,
            fontFamily: theme.fonts.regular,
            fontSize: 14,
            textAlign: "center",
          }}
        >
          {hint}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={setValue}
        editable={picked === null}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        onSubmitEditing={() => finish(answersMatch(value, answer))}
        style={[
          styles.input,
          {
            borderColor:
              picked === true ? theme.colors.green : picked === false ? "#FF4B6A" : theme.shell.line,
            color: theme.shell.foreground,
            fontFamily: theme.fonts.bold,
          },
        ]}
      />
    </ReviewCardShell>
  );
}

export function ReviewMatch({
  pairs,
  onPair,
  onComplete,
}: {
  pairs: MatchPair[];
  onPair: (word: FlashcardWord, correct: boolean, typed?: string) => void;
  onComplete: (missed: FlashcardWord[]) => void;
}) {
  const theme = useTheme();
  const [translations] = useState(() => shufflePairs(pairs));
  const [words] = useState(() => shufflePairs(pairs));
  const [selectedTranslation, setSelectedTranslation] = useState<number | null>(null);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [wrongIds, setWrongIds] = useState<number[]>([]);
  const scoredRef = useRef(new Set<number>());
  const missedRef = useRef<FlashcardWord[]>([]);
  const ready = matched.length === pairs.length;

  const mark = (word: FlashcardWord, correct: boolean, typed?: string) => {
    if (scoredRef.current.has(word.id)) return;
    scoredRef.current.add(word.id);
    if (!correct) missedRef.current = [...missedRef.current, word];
    onPair(word, correct, typed);
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
      mark(pair.word, true);
      return;
    }
    setWrongIds([translationId, wordId]);
    cues.wrong();
    const other = pairs.find((item) => item.word.id === wordId);
    mark(pair.word, false, other?.word.name);
    setTimeout(() => {
      setSelectedTranslation(null);
      setSelectedWord(null);
      setWrongIds([]);
    }, 450);
  };

  const tile = (id: number, label: string, selected: boolean, onPress: () => void) => {
    const done = matched.includes(id);
    const wrong = wrongIds.includes(id);
    return (
      <Pressable
        key={`${id}-${label}`}
        disabled={done}
        onPress={onPress}
        style={[
          styles.matchTile,
          {
            borderColor: wrong
              ? "#FF4B6A"
              : done || selected
                ? theme.colors.green
                : theme.shell.line,
            backgroundColor: done
              ? "rgba(36,200,117,0.14)"
              : selected
                ? "rgba(255,255,255,0.08)"
                : "rgba(255,255,255,0.03)",
          },
        ]}
      >
        <Text
          numberOfLines={3}
          style={{
            color: theme.shell.foreground,
            fontFamily: theme.fonts.semibold,
            fontSize: 14,
            textAlign: "center",
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <ReviewCardShell
      footer={
        <Pressable
          disabled={!ready}
          onPress={() => ready && onComplete(missedRef.current)}
          style={[
            styles.primaryBtn,
            {
              backgroundColor: ready ? theme.colors.green : "rgba(255,255,255,0.12)",
              opacity: ready ? 1 : 0.55,
              marginTop: 8,
            },
          ]}
        >
          <Text style={{ color: ready ? "#111" : "#fff", fontFamily: theme.fonts.bold }}>Continuar</Text>
        </Pressable>
      }
    >
      <Text style={[styles.meta, { fontFamily: theme.fonts.medium, color: theme.shell.muted }]}>
        Combine os pares
      </Text>
      <View style={styles.matchRow}>
        <View style={styles.matchCol}>
          {translations.map((pair) =>
            tile(
              pair.word.id,
              pair.translation.trim() || primaryTranslation(pair.word) || pair.word.name,
              selectedTranslation === pair.word.id,
              () => {
                if (matched.includes(pair.word.id)) return;
                cues.tap();
                setSelectedTranslation(pair.word.id);
                setWrongIds([]);
                if (selectedWord !== null) resolve(pair.word.id, selectedWord);
              }
            )
          )}
        </View>
        <View style={styles.matchCol}>
          {words.map((pair) =>
            tile(pair.word.id, pair.word.name, selectedWord === pair.word.id, () => {
              if (matched.includes(pair.word.id)) return;
              cues.tap();
              setSelectedWord(pair.word.id);
              setWrongIds([]);
              if (selectedTranslation !== null) resolve(selectedTranslation, pair.word.id);
            })
          )}
        </View>
      </View>
    </ReviewCardShell>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignSelf: "stretch",
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    justifyContent: "space-between",
  },
  cardInner: { flex: 1 },
  cardBody: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  meta: { fontSize: 13, textAlign: "center", marginBottom: 16 },
  word: { fontSize: 40, textAlign: "center", lineHeight: 46 },
  promptWord: { fontSize: 30, textAlign: "center", lineHeight: 36, marginBottom: 18 },
  cardActions: { flexDirection: "row", justifyContent: "center", gap: 14 },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  stamp: {
    position: "absolute",
    top: 22,
    zIndex: 3,
    borderWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stampKnow: { right: 18, borderColor: "#24c875", transform: [{ rotate: "12deg" }] },
  stampAgain: { left: 18, borderColor: "#FF4B6A", transform: [{ rotate: "-12deg" }] },
  stampText: { fontSize: 16, fontWeight: "800", letterSpacing: 1 },
  options: { width: "100%", gap: 10 },
  option: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: {
    marginTop: 22,
    width: "100%",
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.04)",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  matchRow: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  matchCol: { flex: 1, gap: 10 },
  matchTile: {
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
});
