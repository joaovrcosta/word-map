import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import type { ReadingFontSize, ReadingPreferences, ReadingThemeMode } from "@word-map/shared";
import { AppBottomSheet, SHEET_CARD } from "../../bottom-sheet";
import { listEnglishVoices, type ReadingVoiceOption } from "../../speech";
import { useTheme } from "../../theme";
import { useReaderTheme } from "./reader-theme";

const ACCENT = "#7B6CFF";
/** Locais — evita depender de runtime exports novos do shared no Metro. */
const FONT_SIZES: ReadingFontSize[] = [18, 22, 26];
const SPEECH_RATE_MIN = 0.6;
const SPEECH_RATE_MAX = 1.3;
const SPEECH_RATE_STEP = 0.05;
const FONT_LABELS: Record<ReadingFontSize, string> = {
  18: "Pequeno",
  22: "Médio",
  26: "Grande",
};

type Props = {
  visible: boolean;
  onClose: () => void;
  prefs: ReadingPreferences;
  onChange: (partial: Partial<ReadingPreferences>) => void;
  onSpeechSettingsCommit?: () => void;
};

export function TextSettingsSheet({
  visible,
  onClose,
  prefs,
  onChange,
  onSpeechSettingsCommit,
}: Props) {
  const theme = useTheme();
  const reader = useReaderTheme();
  const [voices, setVoices] = useState<ReadingVoiceOption[]>([]);
  const [rateDraft, setRateDraft] = useState(prefs.speechRate);
  const [voicesOpen, setVoicesOpen] = useState(false);
  const voiceDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setVoicesOpen(false);
      return;
    }
    setRateDraft(prefs.speechRate);
    let cancelled = false;
    void listEnglishVoices().then((next) => {
      if (!cancelled) setVoices(next);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, prefs.speechRate]);

  useEffect(() => {
    return () => {
      if (voiceDebounce.current) clearTimeout(voiceDebounce.current);
    };
  }, []);

  const selectedVoiceLabel = useMemo(() => {
    if (!prefs.voiceId) return "Automática";
    const match = voices.find((voice) => voice.identifier === prefs.voiceId);
    return match ? formatVoiceLabel(match) : "Automática";
  }, [prefs.voiceId, voices]);

  const commitVoice = (voiceId: string | null) => {
    onChange({ voiceId });
    setVoicesOpen(false);
    if (voiceDebounce.current) clearTimeout(voiceDebounce.current);
    voiceDebounce.current = setTimeout(() => {
      onSpeechSettingsCommit?.();
    }, 150);
  };

  const themes: Array<{ mode: ReadingThemeMode; label: string }> = [
    { mode: "auto", label: "Automático" },
    { mode: "light", label: "Claro" },
    { mode: "dark", label: "Escuro" },
  ];

  return (
    <AppBottomSheet visible={visible} onClose={onClose} title="Leitura" maxHeight="86%">
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={{ color: "#FFFFFF", fontFamily: theme.fonts.bold, fontSize: 16, marginBottom: 12 }}>
              Tema
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 28 }}>
              {themes.map((item) => {
                const selected = prefs.theme === item.mode;
                return (
                  <Pressable
                    key={item.mode}
                    onPress={() => onChange({ theme: item.mode })}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={{ alignItems: "center", gap: 8 }}
                  >
                    <ThemeSwatch mode={item.mode} selected={selected} />
                    <Text
                      style={{
                        color: selected ? ACCENT : reader.menu.muted,
                        fontFamily: theme.fonts.semibold,
                        fontSize: 13,
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ color: reader.foreground, fontFamily: theme.fonts.bold, fontSize: 16, marginBottom: 10 }}>
              Voz
            </Text>
            <Pressable
              onPress={() => setVoicesOpen((open) => !open)}
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.shell.line,
                backgroundColor: SHEET_CARD,
                paddingHorizontal: 14,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: voicesOpen ? 8 : 24,
              }}
            >
              <Text style={{ color: reader.foreground, fontFamily: theme.fonts.medium, fontSize: 15, flex: 1 }}>
                {selectedVoiceLabel}
              </Text>
              <Ionicons
                name={voicesOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={reader.menu.muted}
              />
            </Pressable>
            {voicesOpen ? (
              <View
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: reader.menu.cardBorder,
                  marginBottom: 24,
                  overflow: "hidden",
                }}
              >
                <VoiceRow
                  label="Automática"
                  selected={!prefs.voiceId}
                  onPress={() => commitVoice(null)}
                  foreground={reader.foreground}
                  muted={reader.menu.muted}
                  fonts={theme.fonts}
                />
                {voices.map((voice) => (
                  <VoiceRow
                    key={voice.identifier}
                    label={formatVoiceLabel(voice)}
                    selected={prefs.voiceId === voice.identifier}
                    onPress={() => commitVoice(voice.identifier)}
                    foreground={reader.foreground}
                    muted={reader.menu.muted}
                    fonts={theme.fonts}
                  />
                ))}
              </View>
            ) : null}

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ color: reader.foreground, fontFamily: theme.fonts.bold, fontSize: 16 }}>
                Velocidade de reprodução
              </Text>
              <Text style={{ color: reader.menu.muted, fontFamily: theme.fonts.semibold, fontSize: 14 }}>
                {rateDraft.toFixed(2)}×
              </Text>
            </View>
            <Slider
              style={{ width: "100%", height: 36, marginBottom: 24 }}
              minimumValue={SPEECH_RATE_MIN}
              maximumValue={SPEECH_RATE_MAX}
              step={SPEECH_RATE_STEP}
              value={rateDraft}
              onValueChange={setRateDraft}
              onSlidingComplete={(value) => {
                onChange({ speechRate: value });
                onSpeechSettingsCommit?.();
              }}
              minimumTrackTintColor={ACCENT}
              maximumTrackTintColor={reader.menu.cardBorder}
              thumbTintColor={ACCENT}
            />

            <Text style={{ color: reader.foreground, fontFamily: theme.fonts.bold, fontSize: 16, marginBottom: 10 }}>
              Tamanho da fonte
            </Text>
            <View
              style={{
                flexDirection: "row",
                borderRadius: 14,
                backgroundColor: reader.menu.chip,
                padding: 4,
                marginBottom: 24,
              }}
            >
              {FONT_SIZES.map((size) => {
                const selected = prefs.fontSize === size;
                return (
                  <Pressable
                    key={size}
                    onPress={() => onChange({ fontSize: size })}
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      paddingVertical: 12,
                      alignItems: "center",
                      backgroundColor: selected ? ACCENT : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? "#FFFFFF" : reader.foreground,
                        fontFamily: theme.fonts.semibold,
                        fontSize: 14,
                      }}
                    >
                      {FONT_LABELS[size]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 8,
              }}
            >
              <Text style={{ flex: 1, color: reader.foreground, fontFamily: theme.fonts.medium, fontSize: 15 }}>
                Salvar palavras automaticamente
              </Text>
              <Switch
                value={prefs.autoSaveWords}
                onValueChange={(autoSaveWords) => onChange({ autoSaveWords })}
                trackColor={{ false: reader.menu.cardBorder, true: ACCENT }}
                thumbColor="#FFFFFF"
              />
            </View>
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={{
              marginTop: 18,
              alignSelf: "center",
              paddingHorizontal: 28,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: ACCENT, fontFamily: theme.fonts.bold, fontSize: 16 }}>Fechar</Text>
          </Pressable>
    </AppBottomSheet>
  );
}

function ThemeSwatch({ mode, selected }: { mode: ReadingThemeMode; selected: boolean }) {
  return (
    <View
      style={{
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: selected ? 3 : 1,
        borderColor: selected ? ACCENT : "#9A9A9A",
        overflow: "hidden",
        backgroundColor: mode === "dark" ? "#111111" : "#FFFFFF",
      }}
    >
      {mode === "auto" ? (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />
          <View style={{ flex: 1, backgroundColor: "#111111" }} />
        </View>
      ) : null}
    </View>
  );
}

function VoiceRow({
  label,
  selected,
  onPress,
  foreground,
  muted,
  fonts,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  foreground: string;
  muted: string;
  fonts: { medium: string; semibold: string };
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: selected ? "rgba(123,108,255,0.12)" : "transparent",
      }}
    >
      <Text style={{ flex: 1, color: foreground, fontFamily: fonts.medium, fontSize: 14 }}>{label}</Text>
      {selected ? <Ionicons name="checkmark" size={18} color={ACCENT} /> : null}
      {!selected ? <Text style={{ color: muted, fontSize: 12 }}> </Text> : null}
    </Pressable>
  );
}

function formatVoiceLabel(voice: ReadingVoiceOption) {
  const region = voice.language.includes("-")
    ? voice.language.split("-")[1]?.toUpperCase()
    : voice.language.toUpperCase();
  return region ? `${voice.name} (${region})` : voice.name;
}
