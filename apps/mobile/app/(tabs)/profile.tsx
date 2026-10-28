import { useCallback, useMemo, useState } from "react";
import { type Href, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { grammarClassLabel, STUDY_GOAL_PRESETS } from "@word-map/shared";
import { Modal, Pressable, Text, View } from "react-native";
import { type RankingBoard } from "../../src/ranking";
import { useSession } from "../../src/session";
import type { StudyToday } from "../../src/study";
import { useTheme } from "../../src/theme";
import { type UserStats } from "../../src/user-stats";
import { ErrorText, Loading, Muted, Screen } from "../../src/ui";

const confidenceLabels: Record<number, string> = {
  1: "Iniciante",
  2: "Básico",
  3: "Intermediário",
  4: "Avançado",
};

const barColors = ["#24c875", "#1cb0f6", "#ff9600", "#ce82ff", "#ff9600", "#ff4b4b"];

type ActivityFilter = "all" | "reading" | "practice";

function percentLabel(count: number, total: number) {
  if (!total) return "0%";
  return `${((count / total) * 100).toFixed(1)}%`;
}

function minutesLabel(seconds: number) {
  return `${Math.floor(Math.max(0, seconds) / 60)}m`;
}

function todayHeading(date = new Date()) {
  const day = date.getDate();
  const month = date
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .toLowerCase();
  return `Hoje · ${day} de ${month}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function ProgressBar({
  percent,
  color,
  height = 4,
}: {
  percent: number;
  color: string;
  height?: number;
}) {
  const theme = useTheme();
  const width = `${Math.min(Math.max(percent, 0), 100)}%` as const;
  return (
    <View
      style={{
        height,
        borderRadius: 999,
        overflow: "hidden",
        backgroundColor: theme.shell.line,
      }}
    >
      <View style={{ height: "100%", width, borderRadius: 999, backgroundColor: color }} />
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 22 }}>
      {children}
    </Text>
  );
}

function HeaderIcon({
  name,
  label,
  onPress,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={24} color={theme.shell.foreground} />
    </Pressable>
  );
}

function StatColumn({
  value,
  label,
  icon,
  last = false,
}: {
  value: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        paddingVertical: 4,
        borderRightWidth: last ? 0 : 1,
        borderRightColor: theme.shell.line,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 26 }}>
          {value}
        </Text>
        {icon ? <Ionicons name={icon} size={16} color={theme.shell.muted} /> : null}
      </View>
      <Text
        style={{
          marginTop: 6,
          color: theme.shell.muted,
          fontFamily: theme.fonts.medium,
          fontSize: 12,
          textAlign: "center",
          lineHeight: 16,
          paddingHorizontal: 6,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function WeekChart({ study }: { study: StudyToday }) {
  const theme = useTheme();
  const todayProgress = Math.min(1, study.seconds / Math.max(1, study.goalMinutes * 60));

  return (
    <View style={{ marginTop: 18 }}>
      <View style={{ height: 88, justifyContent: "flex-end" }}>
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 8,
            borderTopWidth: 1,
            borderStyle: "dashed",
            borderColor: "#ff9600",
          }}
        />
        <Text
          style={{
            position: "absolute",
            right: 0,
            top: -2,
            color: "#ff9600",
            fontFamily: theme.fonts.semibold,
            fontSize: 11,
          }}
        >
          Meta
        </Text>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 72 }}>
          {study.week.map((day) => {
            const ratio = day.isToday ? todayProgress : day.completed ? 1 : 0.08;
            const height = Math.max(6, Math.round(ratio * 64));
            return (
              <View key={day.day} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
                <View
                  style={{
                    width: "70%",
                    maxWidth: 28,
                    height,
                    borderRadius: 8,
                    backgroundColor: day.isToday || day.completed ? theme.colors.green : theme.shell.line,
                    opacity: day.isToday || day.completed ? 1 : 0.55,
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>
      <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
        {study.week.map((day) => (
          <Text
            key={`${day.day}-label`}
            style={{
              flex: 1,
              textAlign: "center",
              color: day.isToday ? theme.shell.foreground : theme.shell.muted,
              fontFamily: day.isToday ? theme.fonts.bold : theme.fonts.medium,
              fontSize: 11,
            }}
          >
            {day.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, signOut, request } = useSession();
  const displayName = user?.name?.trim() || "Você";
  const [stats, setStats] = useState<UserStats | null>(null);
  const [board, setBoard] = useState<RankingBoard | null>(null);
  const [study, setStudy] = useState<StudyToday | null>(null);
  const [savingGoal, setSavingGoal] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([
        request<UserStats>("/users/stats"),
        request<RankingBoard>("/ranking?period=lifetime").catch(() => null),
        request<StudyToday>("/study/today").catch(() => null),
      ])
        .then(([statsData, ranking, studyData]) => {
          if (cancelled) return;
          setStats(statsData);
          setBoard(ranking);
          setStudy(studyData);
          setError(null);
        })
        .catch(() => {
          if (!cancelled) setError("Não foi possível carregar suas estatísticas.");
        })
        .finally(() => {
          if (!cancelled) setLoaded(true);
        });
      return () => {
        cancelled = true;
      };
    }, [request])
  );

  const saveGoal = async (minutes: number) => {
    setSavingGoal(true);
    try {
      await request("/users/settings", {
        method: "PUT",
        body: JSON.stringify({ dailyGoalMinutes: minutes }),
      });
      const next = await request<StudyToday>("/study/today");
      setStudy(next);
      setEditingGoal(false);
    } catch {
      setError("Não foi possível salvar a meta diária.");
    } finally {
      setSavingGoal(false);
    }
  };

  const confidence = useMemo(
    () => [...(stats?.wordsByConfidence ?? [])].sort((a, b) => a.confidence - b.confidence),
    [stats]
  );
  const maxConfidence = Math.max(1, ...confidence.map((item) => item.count));
  const classes = useMemo(
    () => [...(stats?.wordsByGrammaticalClass ?? [])].sort((a, b) => b.count - a.count),
    [stats]
  );
  const levelLabel = useMemo(() => {
    if (!confidence.length) return "Nível —";
    const top = [...confidence].sort((a, b) => b.count - a.count)[0];
    return `Nível ${confidenceLabels[top?.confidence ?? 1] ?? "—"}`;
  }, [confidence]);

  const readingSeconds = study?.readingSeconds ?? 0;
  const practiceSeconds = study?.practiceSeconds ?? 0;
  const totalSeconds = study?.seconds ?? 0;
  const filteredSeconds =
    activityFilter === "reading"
      ? readingSeconds
      : activityFilter === "practice"
        ? practiceSeconds
        : totalSeconds;
  const goalMinutes = study?.goalMinutes ?? 5;
  const goalProgress = (totalSeconds / Math.max(1, goalMinutes * 60)) * 100;

  if (!loaded && !stats) return <Loading />;

  return (
    <Screen scroll>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <HeaderIcon
          name="settings-outline"
          label="Configurações"
          onPress={() => {
            setEditingGoal(false);
            setSettingsOpen(true);
          }}
        />
        <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 20 }}>
          Perfil
        </Text>
        <HeaderIcon
          name="person-add-outline"
          label="Ranking"
          onPress={() => router.push("/ranking" as Href)}
        />
      </View>

      <View style={{ marginTop: 22, alignItems: "center" }}>
        <View
          style={{
            width: 92,
            height: 92,
            borderRadius: 46,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.shell.tones.lilac,
          }}
        >
          <Text style={{ color: theme.shell.onPastel, fontFamily: theme.fonts.bold, fontSize: 30 }}>
            {initials(displayName)}
          </Text>
        </View>
        <Text
          style={{
            marginTop: 14,
            color: theme.shell.foreground,
            fontFamily: theme.fonts.bold,
            fontSize: 28,
            textAlign: "center",
          }}
        >
          {displayName}
        </Text>
        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: theme.shell.chip,
            }}
          >
            <Text style={{ color: theme.shell.chipText, fontFamily: theme.fonts.semibold, fontSize: 13 }}>
              {user?.username ? `@${user.username}` : "Membro"}
            </Text>
          </View>
          <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 14 }}>
            {levelLabel}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 22, height: 1, backgroundColor: theme.shell.line }} />

      {error && !stats ? <ErrorText>{error}</ErrorText> : null}

      {study ? (
        <View
          style={{
            marginTop: 18,
            borderRadius: 18,
            backgroundColor: theme.shell.surface,
            borderWidth: 1,
            borderColor: theme.shell.line,
            overflow: "hidden",
          }}
        >
          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="timer-outline" size={20} color={theme.shell.muted} />
            <Text style={{ flex: 1, color: theme.shell.foreground, fontFamily: theme.fonts.semibold, fontSize: 15 }}>
              Meta diária
            </Text>
            <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 14 }}>
              {minutesLabel(totalSeconds)} / {goalMinutes}m
            </Text>
            <Pressable
              onPress={() => router.push("/ranking" as Href)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: theme.shell.chip,
              }}
            >
              <Ionicons name="trophy-outline" size={14} color={theme.shell.foreground} />
              <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 12 }}>
                {board?.me.points != null ? `${board.me.points} XP` : "Ranking"}
              </Text>
            </Pressable>
          </View>
          <ProgressBar percent={goalProgress} color={study.completed ? theme.colors.green : "#ff9600"} />
        </View>
      ) : null}

      {stats ? (
        <>
          <View style={{ marginTop: 28 }}>
            <SectionTitle>Suas estatísticas</SectionTitle>
            <View
              style={{
                marginTop: 14,
                borderRadius: 18,
                backgroundColor: theme.shell.surface,
                borderWidth: 1,
                borderColor: theme.shell.line,
                paddingVertical: 18,
                paddingHorizontal: 6,
                flexDirection: "row",
              }}
            >
              <StatColumn value={minutesLabel(totalSeconds)} label={"Tempo de\naprendizagem"} />
              <StatColumn value={String(stats.totalWords)} label={"Palavras\naprendidas"} />
              <StatColumn
                value={String(study?.currentStreak ?? 0)}
                label={"Sequência\nde metas"}
                icon="water-outline"
                last
              />
            </View>
          </View>

          <View style={{ marginTop: 28 }}>
            <SectionTitle>Atividade de aprendizagem</SectionTitle>
            <View
              style={{
                marginTop: 14,
                flexDirection: "row",
                padding: 4,
                borderRadius: 999,
                backgroundColor: theme.shell.chip,
                gap: 4,
              }}
            >
              {(
                [
                  { id: "all", label: "Tudo" },
                  { id: "reading", label: "Leitura" },
                  { id: "practice", label: "Prática" },
                ] as const
              ).map((tab) => {
                const active = activityFilter === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setActivityFilter(tab.id)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 999,
                      alignItems: "center",
                      backgroundColor: active ? theme.shell.chipActive : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: active ? theme.shell.chipActiveText : theme.shell.chipText,
                        fontFamily: theme.fonts.semibold,
                        fontSize: 14,
                      }}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View
              style={{
                marginTop: 14,
                borderRadius: 18,
                backgroundColor: theme.shell.surface,
                borderWidth: 1,
                borderColor: theme.shell.line,
                padding: 16,
              }}
            >
              <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 13 }}>
                {todayHeading()}
              </Text>
              <View style={{ marginTop: 14, flexDirection: "row", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 36 }}>
                    {minutesLabel(filteredSeconds)}
                  </Text>
                  <Text style={{ marginTop: 2, color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 13 }}>
                    Tempo de aprendizagem
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 36 }}>
                    {stats.recentActivity}
                  </Text>
                  <Text style={{ marginTop: 2, color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 13 }}>
                    Atividade (30d)
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="book-outline" size={16} color={theme.shell.muted} />
                  <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 13 }}>
                    {minutesLabel(readingSeconds)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="flash-outline" size={16} color={theme.shell.muted} />
                  <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 13 }}>
                    {minutesLabel(practiceSeconds)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="ellipse-outline" size={14} color={theme.shell.muted} />
                  <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 13 }}>
                    Meta {goalMinutes}m
                  </Text>
                </View>
              </View>

              {study ? <WeekChart study={study} /> : null}
            </View>
          </View>

          <View style={{ marginTop: 28 }}>
            <SectionTitle>Nível de confiança</SectionTitle>
            <Muted>Distribuição das palavras por nível de aprendizado.</Muted>
            <View style={{ marginTop: 14, gap: 14 }}>
              {confidence.length === 0 ? (
                <Muted>Adicione palavras para ver esta análise.</Muted>
              ) : (
                confidence.map((item) => (
                  <View key={item.confidence}>
                    <View style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                      <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 14 }}>
                        {confidenceLabels[item.confidence] ?? `Nível ${item.confidence}`}
                      </Text>
                      <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.bold, fontSize: 12 }}>
                        {item.count} ({percentLabel(item.count, stats.totalWords)})
                      </Text>
                    </View>
                    <ProgressBar
                      percent={(item.count / maxConfidence) * 100}
                      color={theme.colors.green}
                      height={10}
                    />
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={{ marginTop: 28 }}>
            <SectionTitle>Classe gramatical</SectionTitle>
            <Muted>Distribuição por tipo de palavra.</Muted>
            <View style={{ marginTop: 14, gap: 14 }}>
              {classes.length === 0 ? (
                <Muted>Ainda não há classes gramaticais para mostrar.</Muted>
              ) : (
                classes.map((item, index) => {
                  const share = stats.totalWords ? (item.count / stats.totalWords) * 100 : 0;
                  return (
                    <View key={item.grammaticalClass}>
                      <View style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                        <Text style={{ flex: 1, color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 14 }}>
                          {grammarClassLabel(item.grammaticalClass)}
                        </Text>
                        <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.bold, fontSize: 12 }}>
                          {item.count} ({percentLabel(item.count, stats.totalWords)})
                        </Text>
                      </View>
                      <ProgressBar
                        percent={share}
                        color={barColors[index % barColors.length] ?? theme.colors.green}
                        height={10}
                      />
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {stats.wordsByCategory.length > 0 ? (
            <View style={{ marginTop: 28 }}>
              <SectionTitle>Categorias</SectionTitle>
              <Muted>Palavras organizadas por categoria.</Muted>
              <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {stats.wordsByCategory.map((item) => (
                  <View
                    key={item.category}
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: theme.shell.chip,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.shell.chipText,
                        fontFamily: theme.fonts.medium,
                        fontSize: 13,
                      }}
                    >
                      {item.category} ({item.count})
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      <Modal
        animationType="slide"
        transparent
        visible={settingsOpen}
        onRequestClose={() => setSettingsOpen(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable
            accessibilityLabel="Fechar"
            onPress={() => setSettingsOpen(false)}
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
            <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 20 }}>
              Configurações
            </Text>

            {editingGoal ? (
              <View style={{ marginTop: 18, gap: 10 }}>
                <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 14 }}>
                  Meta diária
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {STUDY_GOAL_PRESETS.map((minutes) => {
                    const active = goalMinutes === minutes;
                    return (
                      <Pressable
                        key={minutes}
                        disabled={savingGoal}
                        onPress={() => void saveGoal(minutes)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 999,
                          backgroundColor: active ? theme.colors.green : theme.shell.chip,
                          opacity: savingGoal ? 0.6 : 1,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.shell.foreground,
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
                <Pressable onPress={() => setEditingGoal(false)} style={{ paddingVertical: 10 }}>
                  <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.semibold, textAlign: "center" }}>
                    Voltar
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ marginTop: 12 }}>
                <Pressable onPress={() => setEditingGoal(true)} style={{ paddingVertical: 14 }}>
                  <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.semibold, fontSize: 16 }}>
                    Alterar meta diária
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setSettingsOpen(false);
                    router.push("/ranking" as Href);
                  }}
                  style={{ paddingVertical: 14 }}
                >
                  <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.semibold, fontSize: 16 }}>
                    Ver ranking
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setSettingsOpen(false);
                    void signOut();
                  }}
                  style={{ paddingVertical: 14 }}
                >
                  <Text style={{ color: theme.shell.dangerOnDark, fontFamily: theme.fonts.semibold, fontSize: 16 }}>
                    Sair
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
