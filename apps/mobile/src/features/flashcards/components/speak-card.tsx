import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  alignSpokenWords,
  speakPassScore,
  tokenizeSpeakText,
  type FlashcardWord,
  type SpeakAlignStatus,
} from "@word-map/shared";
import { speakWord } from "../../../speech";
import {
  isSpeechRecognitionAvailable,
  requestSpeechPermission,
  startSpeechSession,
  type SpeechSession,
} from "../../../speech-recognition";
import { shell, useTheme } from "../../../theme";
import { cues } from "../cues";
import { MotionFrame } from "../motion";
import { primaryTranslation } from "../words";
import { FeedbackBanner } from "./feedback-banner";

export function SpeakCard({
  word,
  sentence,
  onAnswer,
  onSkip,
}: {
  word: FlashcardWord;
  sentence: string;
  onAnswer: (correct: boolean, typed: string) => void;
  onSkip: () => void;
}) {
  const theme = useTheme();
  const available = isSpeechRecognitionAvailable();
  const target = sentence.trim() || word.name;
  const expectedTokens = tokenizeSpeakText(target);
  const translation = primaryTranslation(word);
  const [statuses, setStatuses] = useState<SpeakAlignStatus[]>(() =>
    expectedTokens.map(() => "pending")
  );
  const [listening, setListening] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ correct: boolean; transcript: string } | null>(null);
  const [popToken, setPopToken] = useState(0);
  const [shakeToken, setShakeToken] = useState(0);

  const sessionRef = useRef<SpeechSession | null>(null);
  const finalizedRef = useRef(false);
  const answeredRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    finalizedRef.current = false;
    answeredRef.current = false;
    setStatuses(expectedTokens.map(() => "pending"));
    setDone(null);
    setListening(false);
    setError(null);
    setPermissionDenied(false);
    return () => {
      aliveRef.current = false;
      sessionRef.current?.abort();
      sessionRef.current = null;
    };
  }, [word.id, target]);

  const tokenColor = (status: SpeakAlignStatus) => {
    if (status === "correct") return theme.colors.greenText;
    if (status === "wrong") return shell.dangerOnDark;
    return shell.foreground;
  };

  const finalizeOnce = (transcript: string) => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    setListening(false);
    sessionRef.current = null;
    const next = alignSpokenWords(target, transcript, { finalized: true });
    setStatuses(next);
    const correct = speakPassScore(next);
    if (correct) {
      cues.correct();
      setPopToken((current) => current + 1);
    } else {
      cues.wrong();
      setShakeToken((current) => current + 1);
    }
    setDone({ correct, transcript });
  };

  const startListening = async () => {
    if (!available || listening || done) return;
    setError(null);
    setPermissionDenied(false);
    const permission = await requestSpeechPermission();
    if (!permission.granted) {
      setPermissionDenied(true);
      return;
    }
    finalizedRef.current = false;
    setStatuses(expectedTokens.map(() => "pending"));
    setListening(true);
    const session = startSpeechSession({
      onPartial: (transcript) => {
        if (finalizedRef.current) return;
        const next = alignSpokenWords(target, transcript, { finalized: false });
        setStatuses(next);
        if (next.length > 0 && next.every((status) => status === "correct")) {
          sessionRef.current?.stop();
        }
      },
      onFinal: (transcript) => {
        finalizeOnce(transcript);
      },
      onError: (message) => {
        setListening(false);
        sessionRef.current = null;
        if (!finalizedRef.current) setError(message);
      },
    });
    if (!session) {
      setListening(false);
      setError("Microfone indisponível neste dispositivo. Use um app nativo (dev build).");
      return;
    }
    sessionRef.current = session;
  };

  const toggleMic = () => {
    if (!available) {
      setError("Microfone indisponível neste dispositivo. Use um app nativo (dev build).");
      return;
    }
    if (listening) sessionRef.current?.stop();
    else void startListening();
  };

  return (
    <View style={{ flex: 1, backgroundColor: shell.background }}>
      <MotionFrame
        popToken={popToken}
        shakeToken={shakeToken}
        burst={popToken}
        style={{ flex: 1, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 16 }}
      >
        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: shell.chip,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ color: shell.foreground, fontFamily: theme.fonts.bold, fontSize: 12, letterSpacing: 0.5 }}>
            FALE ESTA FRASE
          </Text>
        </View>

        <Text
          style={{
            marginTop: 18,
            color: shell.muted,
            fontFamily: theme.fonts.medium,
            fontSize: 15,
          }}
        >
          Fale esta frase:
        </Text>

        <View
          style={{
            marginTop: 16,
            width: "100%",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {expectedTokens.map((token, index) => {
            const status = statuses[index] ?? "pending";
            return (
              <Text
                key={`${token}-${index}`}
                style={{
                  color: tokenColor(status),
                  fontFamily: theme.fonts.bold,
                  fontSize: expectedTokens.length > 4 ? 28 : 34,
                  lineHeight: expectedTokens.length > 4 ? 36 : 42,
                  opacity: status === "pending" ? 0.92 : 1,
                }}
              >
                {token}
              </Text>
            );
          })}
        </View>

        {translation ? (
          <Text
            style={{
              marginTop: 12,
              color: shell.muted,
              fontFamily: theme.fonts.regular,
              fontSize: 16,
            }}
          >
            “{translation}”
          </Text>
        ) : null}

        {permissionDenied ? (
          <View style={{ marginTop: 20, gap: 8 }}>
            <Text style={{ color: shell.dangerOnDark, fontFamily: theme.fonts.regular }}>
              Permissão de microfone negada.
            </Text>
            <Pressable onPress={() => void Linking.openSettings()}>
              <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.bold }}>Abrir configurações</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? (
          <Text
            style={{
              marginTop: 16,
              color: shell.dangerOnDark,
              fontFamily: theme.fonts.regular,
              fontSize: 14,
            }}
          >
            {error}
          </Text>
        ) : null}

        <View style={{ flex: 1 }} />

        {!done ? (
          <View style={{ width: "100%", gap: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 12 }}>
              <Pressable
                onPress={() => speakWord(target)}
                style={{ alignItems: "center", gap: 6, minWidth: 72 }}
                accessibilityLabel="Ouvir a frase"
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: shell.chip,
                  }}
                >
                  <Ionicons name="volume-high" size={22} color={theme.colors.greenText} />
                </View>
                <Text style={{ color: shell.muted, fontFamily: theme.fonts.medium, fontSize: 12 }}>Repetir</Text>
              </Pressable>
              <Pressable
                onPress={onSkip}
                style={{ alignItems: "center", gap: 6, minWidth: 72 }}
                accessibilityLabel="Pular"
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: shell.chip,
                  }}
                >
                  <Ionicons name="play-forward" size={22} color={theme.colors.greenText} />
                </View>
                <Text style={{ color: shell.muted, fontFamily: theme.fonts.medium, fontSize: 12 }}>Pular</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={toggleMic}
              accessibilityLabel={listening ? "Parar gravação" : "Falar"}
              style={{
                height: 64,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: listening ? theme.colors.destructive : theme.colors.green,
              }}
            >
              <Ionicons name={listening ? "stop" : "mic"} size={28} color="#ffffff" />
            </Pressable>
            <Text
              style={{
                textAlign: "center",
                color: shell.muted,
                fontFamily: theme.fonts.medium,
                fontSize: 13,
              }}
            >
              {listening ? "Ouvindo…" : available ? "Toque no microfone e fale" : "Microfone precisa do app nativo"}
            </Text>
          </View>
        ) : null}
      </MotionFrame>

      {done ? (
        <FeedbackBanner
          correct={done.correct}
          answer={target}
          onContinue={() => {
            if (!aliveRef.current || answeredRef.current) return;
            answeredRef.current = true;
            onAnswer(done.correct, done.transcript);
          }}
        />
      ) : null}
    </View>
  );
}
