import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { AppBottomSheet, SHEET_CARD } from "../../bottom-sheet";
import { useTheme } from "../../theme";
import { countLabel } from "../../types";
import {
  LearningProgressRing,
  RING_GREEN,
  type LearningRingParts,
} from "../vaults/learning-progress";
import { VaultDeckThumb } from "../vaults/deck-thumb";
import type { PracticeXpState } from "../study/practice-xp";

const LEVEL_RING = 22;
const LEVEL_STROKE = 2.5;
const LEVEL_RADIUS = (LEVEL_RING - LEVEL_STROKE) / 2;
const LEVEL_CIRC = 2 * Math.PI * LEVEL_RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type ReviewVaultOption = {
  id: number;
  name: string;
  wordCount: number;
  percent: number;
  parts: LearningRingParts;
};

type Props = {
  streak: number;
  xp: PracticeXpState;
  /** XP ganhos hoje (não o total). */
  dayXp: number;
  vaultId: number | null;
  vaults: ReviewVaultOption[];
  allWordCount: number;
  allPercent: number;
  allParts: LearningRingParts;
  onSelectVault: (vaultId: number | null) => void;
  onPressStreak?: () => void;
  pickerOpen?: boolean;
  onPickerOpenChange?: (open: boolean) => void;
};

export function ReviewTopBar({
  streak,
  xp,
  dayXp,
  vaultId,
  vaults,
  allWordCount,
  allPercent,
  allParts,
  onSelectVault,
  onPressStreak,
  pickerOpen: pickerOpenProp,
  onPickerOpenChange,
}: Props) {
  const theme = useTheme();
  const [pickerOpenInternal, setPickerOpenInternal] = useState(false);
  const [query, setQuery] = useState("");
  const pickerOpen = pickerOpenProp ?? pickerOpenInternal;
  const setPickerOpen = (open: boolean) => {
    onPickerOpenChange?.(open);
    if (pickerOpenProp === undefined) setPickerOpenInternal(open);
    if (!open) setQuery("");
  };
  const closePicker = () => setPickerOpen(false);
  const ringProgress = useSharedValue(Math.min(1, Math.max(0, xp.progress)));
  const prevLevelRef = useRef(xp.level);

  const selectedLabel = useMemo(() => {
    if (vaultId == null) return "Tudo";
    return vaults.find((vault) => vault.id === vaultId)?.name ?? "Vault";
  }, [vaultId, vaults]);

  const selectedParts = useMemo(() => {
    if (vaultId == null) return allParts;
    return vaults.find((vault) => vault.id === vaultId)?.parts ?? allParts;
  }, [vaultId, vaults, allParts]);

  const selectedPercent = useMemo(() => {
    if (vaultId == null) return allPercent;
    return vaults.find((vault) => vault.id === vaultId)?.percent ?? allPercent;
  }, [vaultId, vaults, allPercent]);

  const filteredVaults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return vaults;
    return vaults.filter((vault) => vault.name.toLowerCase().includes(needle));
  }, [query, vaults]);

  useEffect(() => {
    const next = Math.min(1, Math.max(0, xp.progress));
    const leveledUp = xp.level > prevLevelRef.current;
    prevLevelRef.current = xp.level;

    if (leveledUp) {
      ringProgress.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (!finished) return;
        ringProgress.value = 0;
        ringProgress.value = withTiming(next, { duration: 280, easing: Easing.out(Easing.cubic) });
      });
      return;
    }

    ringProgress.value = withTiming(next, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [ringProgress, xp.level, xp.progress]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: LEVEL_CIRC * (1 - ringProgress.value),
  }));

  const pick = (id: number | null) => {
    onSelectVault(id);
    setPickerOpen(false);
  };

  return (
    <>
      <View style={styles.row}>
        <Pressable
          onPress={onPressStreak}
          style={[styles.statsPill, { borderColor: RING_GREEN, backgroundColor: "#1C1C1E" }]}
        >
          <View style={styles.stat}>
            <Ionicons name="flame" size={16} color="#ff9600" />
            <Text style={[styles.statText, styles.streakValue, { fontFamily: theme.fonts.bold }]}>
              {streak}
            </Text>
          </View>

          <View style={styles.stat}>
            <Ionicons name="flash" size={15} color="#1cb0f6" />
            <Text style={[styles.statText, styles.xpValue, { fontFamily: theme.fonts.bold }]} numberOfLines={1}>
              {dayXp}
            </Text>
          </View>

          <View style={styles.stat}>
            <View style={styles.levelRing}>
              <Svg width={LEVEL_RING} height={LEVEL_RING} style={StyleSheet.absoluteFillObject}>
                <Circle
                  cx={LEVEL_RING / 2}
                  cy={LEVEL_RING / 2}
                  r={LEVEL_RADIUS}
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth={LEVEL_STROKE}
                  fill="none"
                />
                <AnimatedCircle
                  cx={LEVEL_RING / 2}
                  cy={LEVEL_RING / 2}
                  r={LEVEL_RADIUS}
                  stroke={RING_GREEN}
                  strokeWidth={LEVEL_STROKE}
                  fill="none"
                  strokeDasharray={`${LEVEL_CIRC} ${LEVEL_CIRC}`}
                  animatedProps={ringProps}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${LEVEL_RING / 2} ${LEVEL_RING / 2})`}
                />
              </Svg>
            </View>
            <Text style={[styles.statText, styles.levelValue, { fontFamily: theme.fonts.bold }]} numberOfLines={1}>
              Lvl {xp.level}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setPickerOpen(true)}
          style={[styles.vaultPill, { backgroundColor: "#2A2A2C" }]}
        >
          <LearningProgressRing
            parts={selectedParts}
            percent={selectedPercent}
            size={16}
            stroke={3}
            showLabel={false}
          />
          <Text
            numberOfLines={1}
            style={[styles.vaultLabel, { fontFamily: theme.fonts.semibold }]}
          >
            {selectedLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </View>

      <AppBottomSheet visible={pickerOpen} onClose={closePicker} title="Deck para revisar" maxHeight="78%">
        <View style={[styles.search, { backgroundColor: SHEET_CARD, borderColor: theme.shell.line }]}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.45)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar vault"
            placeholderTextColor="rgba(255,255,255,0.35)"
            autoCorrect={false}
            autoCapitalize="none"
            style={[styles.searchInput, { fontFamily: theme.fonts.medium, color: "#FFFFFF" }]}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          nestedScrollEnabled
        >
          {!query.trim() ? (
            <DeckRow
              vaultId={null}
              label="Tudo"
              subtitle={countLabel(allWordCount, "palavra", "palavras")}
              percent={allPercent}
              parts={allParts}
              selected={vaultId == null}
              onPress={() => pick(null)}
            />
          ) : null}
          {filteredVaults.map((vault) => (
            <DeckRow
              key={vault.id}
              vaultId={vault.id}
              label={vault.name}
              subtitle={countLabel(vault.wordCount, "palavra", "palavras")}
              percent={vault.percent}
              parts={vault.parts}
              selected={vaultId === vault.id}
              onPress={() => pick(vault.id)}
            />
          ))}
          {filteredVaults.length === 0 ? (
            <Text style={[styles.empty, { fontFamily: theme.fonts.medium }]}>
              Nenhum vault encontrado
            </Text>
          ) : null}
        </ScrollView>
      </AppBottomSheet>
    </>
  );
}

function DeckRow({
  vaultId,
  label,
  subtitle,
  percent,
  parts,
  selected,
  onPress,
}: {
  vaultId: number | null;
  label: string;
  subtitle: string;
  percent: number;
  parts: LearningRingParts;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.deckRow, selected ? { backgroundColor: "rgba(36,200,117,0.12)" } : null]}
    >
      <View style={styles.deckIcon}>
        <VaultDeckThumb vaultId={vaultId} size={52} />
      </View>
      <View style={styles.deckCopy}>
        <Text
          numberOfLines={1}
          style={{
            color: "#FFFFFF",
            fontFamily: selected ? theme.fonts.bold : theme.fonts.semibold,
            fontSize: 16,
          }}
        >
          {label}
        </Text>
        <Text style={{ marginTop: 2, color: "rgba(255,255,255,0.5)", fontFamily: theme.fonts.medium, fontSize: 13 }}>
          {subtitle}
        </Text>
      </View>
      <LearningProgressRing parts={parts} percent={percent} size={40} />
      {selected ? (
        <Ionicons name="checkmark-circle" size={18} color={RING_GREEN} style={{ marginLeft: 6 }} />
      ) : (
        <View style={{ width: 18, marginLeft: 6 }} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  statsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    flexGrow: 0,
    flexShrink: 0,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  streakValue: {
    minWidth: 18,
    textAlign: "left",
  },
  xpValue: {
    minWidth: 42,
    textAlign: "left",
  },
  levelValue: {
    minWidth: 58,
    flexShrink: 0,
    textAlign: "left",
  },
  levelRing: {
    width: LEVEL_RING,
    height: LEVEL_RING,
    flexShrink: 0,
  },
  vaultPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    flexShrink: 1,
    maxWidth: "46%",
    marginLeft: "auto",
  },
  vaultLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    flexShrink: 1,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  list: {
    maxHeight: 420,
  },
  deckRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginBottom: 2,
  },
  deckIcon: {
    width: 52,
    height: 52,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deckCopy: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  empty: {
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    paddingVertical: 28,
    fontSize: 14,
  },
});
