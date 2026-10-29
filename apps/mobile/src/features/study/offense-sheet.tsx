import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { STUDY_GOAL_PRESETS } from "@word-map/shared";
import { useSession } from "../../session";
import type { StudyToday } from "../../study";
import { useTheme } from "../../theme";

const ACCENT = "#ff9600";
const FLAME = "#ff9600";
const RING = 132;
const STROKE = 10;
const RADIUS = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSeeStats: () => void;
};

export function OffenseSheet({ visible, onClose, onSeeStats }: Props) {
  const theme = useTheme();
  const { request } = useSession();
  const [today, setToday] = useState<StudyToday | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const next = await request<StudyToday>("/study/today");
      setToday(next);
      setError(null);
    } catch {
      setToday(null);
    }
  }, [request]);

  useEffect(() => {
    if (!visible) {
      setEditingGoal(false);
      setError(null);
      return;
    }
    void reload();
  }, [reload, visible]);

  const saveGoal = async (minutes: number) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await request("/users/settings", {
        method: "PUT",
        body: JSON.stringify({ dailyGoalMinutes: minutes }),
      });
      const next = await request<StudyToday>("/study/today");
      setToday(next);
      setEditingGoal(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar a meta.");
    } finally {
      setSaving(false);
    }
  };

  const minutesDone = Math.floor((today?.seconds ?? 0) / 60);
  const goal = today?.goalMinutes ?? 5;
  const remainingMin = Math.max(0, Math.ceil((today?.remainingSeconds ?? goal * 60) / 60));
  const progress = Math.min(1, (today?.seconds ?? 0) / Math.max(1, goal * 60));
  const title = today?.completed
    ? "Meta de hoje concluída"
    : remainingMin <= 0
      ? "Meta de hoje concluída"
      : `Faltam ${remainingMin} min hoje`;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          accessibilityLabel="Fechar"
          onPress={onClose}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.45)" }}
        />
        <View
          style={{
            backgroundColor: theme.shell.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 18,
            paddingBottom: 28,
            borderWidth: 1,
            borderColor: theme.shell.line,
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 44,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.shell.line,
              marginBottom: 18,
            }}
          />

          <View style={{ alignItems: "center" }}>
            <View style={{ width: RING, height: RING, alignItems: "center", justifyContent: "center" }}>
              <Svg width={RING} height={RING} style={{ position: "absolute" }}>
                <Circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={RADIUS}
                  stroke={theme.shell.line}
                  strokeWidth={STROKE}
                  fill="none"
                />
                <Circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={RADIUS}
                  stroke={ACCENT}
                  strokeWidth={STROKE}
                  fill="none"
                  strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                  strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
                />
              </Svg>
              <Ionicons
                name="flame"
                size={42}
                color={progress > 0 || today?.completed ? FLAME : theme.shell.muted}
              />
            </View>

            <Text
              style={{
                marginTop: 18,
                color: theme.shell.foreground,
                fontFamily: theme.fonts.bold,
                fontSize: 26,
                textAlign: "center",
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                marginTop: 8,
                color: theme.shell.muted,
                fontFamily: theme.fonts.medium,
                fontSize: 15,
                textAlign: "center",
              }}
            >
              {minutesDone} de {goal} min · leitura e prática contam
            </Text>
          </View>

          <View
            style={{
              marginTop: 28,
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: 4,
            }}
          >
            {(today?.week ?? []).map((item) => (
              <View key={item.day} style={{ alignItems: "center", gap: 8, width: 36 }}>
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: item.completed
                      ? ACCENT
                      : item.isToday
                        ? "transparent"
                        : theme.shell.line,
                    borderWidth: item.isToday && !item.completed ? 3 : 0,
                    borderColor: ACCENT,
                  }}
                />
                <Text
                  style={{
                    color: item.isToday ? theme.shell.foreground : theme.shell.muted,
                    fontFamily: item.isToday ? theme.fonts.bold : theme.fonts.medium,
                    fontSize: 12,
                  }}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          {error ? (
            <Text
              style={{
                marginTop: 16,
                color: theme.shell.dangerOnDark,
                fontFamily: theme.fonts.semibold,
                fontSize: 13,
                textAlign: "center",
              }}
            >
              {error}
            </Text>
          ) : null}

          {editingGoal ? (
            <View style={{ marginTop: 24, gap: 10 }}>
              <Text
                style={{
                  color: theme.shell.foreground,
                  fontFamily: theme.fonts.bold,
                  fontSize: 15,
                  textAlign: "center",
                }}
              >
                Meta diária
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                {STUDY_GOAL_PRESETS.map((minutes) => {
                  const active = goal === minutes;
                  return (
                    <Pressable
                      key={minutes}
                      disabled={saving}
                      onPress={() => void saveGoal(minutes)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 999,
                        backgroundColor: active ? ACCENT : theme.shell.chip,
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? "#fff" : theme.shell.foreground,
                          fontFamily: theme.fonts.bold,
                          fontSize: 13,
                        }}
                      >
                        {minutes} min
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable onPress={() => setEditingGoal(false)} style={{ paddingVertical: 8 }}>
                <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.semibold, textAlign: "center" }}>
                  Cancelar
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ marginTop: 28, gap: 6 }}>
              <Pressable onPress={() => setEditingGoal(true)} style={{ paddingVertical: 12 }}>
                <Text style={{ color: ACCENT, fontFamily: theme.fonts.bold, fontSize: 16, textAlign: "center" }}>
                  Alterar meta diária
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onClose();
                  onSeeStats();
                }}
                style={{ paddingVertical: 12 }}
              >
                <Text style={{ color: ACCENT, fontFamily: theme.fonts.bold, fontSize: 16, textAlign: "center" }}>
                  Ver todas as estatísticas
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
