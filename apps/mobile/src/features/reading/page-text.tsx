import { useRef, type ComponentRef, type ReactNode, type RefObject } from "react";
import { Text, type GestureResponderEvent } from "react-native";
import { normalizeToken, splitTokenEdges } from "@word-map/shared";
import { useTheme } from "../../theme";

export const MAX_RANGE_WORDS = 6;
export const RANGE_LONG_PRESS_MS = 480;

export type WordAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PageWordToken = {
  index: number;
  surface: string;
  clean: string;
  occurrence: number;
  openable: boolean;
};

export function tokenizePageText(text: string, vaultWords: Set<string>): PageWordToken[] {
  const tokens: PageWordToken[] = [];
  const seen = new Map<string, number>();
  const pattern = /\S+/g;
  let match: RegExpExecArray | null = pattern.exec(text);
  let index = 0;
  while (match) {
    const surface = match[0];
    const clean = normalizeToken(surface);
    if (clean) {
      const occurrence = seen.get(clean) ?? 0;
      seen.set(clean, occurrence + 1);
      const inVault = vaultWords.has(clean);
      const openable = Boolean(clean);
      tokens.push({ index, surface, clean, occurrence, openable });
    }
    index += 1;
    match = pattern.exec(text);
  }
  return tokens;
}

/** Expande, reduz ou reinicia a seleção contígua (máx. `max`). */
export function nextRangeIndexes(current: number[], tapped: number, max = MAX_RANGE_WORDS): number[] {
  if (current.length === 0) return [tapped];
  const sorted = [...current].sort((a, b) => a - b);
  const min = sorted[0]!;
  const maxIndex = sorted[sorted.length - 1]!;

  if (sorted.includes(tapped)) {
    if (tapped === min || tapped === maxIndex) {
      const next = sorted.filter((item) => item !== tapped);
      return next.length ? next : [tapped];
    }
    return sorted;
  }

  if (tapped === maxIndex + 1 || tapped === min - 1) {
    const next = [...sorted, tapped].sort((a, b) => a - b);
    if (next.length > max) return sorted;
    for (let i = 1; i < next.length; i += 1) {
      if (next[i]! !== next[i - 1]! + 1) return sorted;
    }
    return next;
  }

  return [tapped];
}

export function spanFromIndexes(tokens: PageWordToken[], indexes: number[]) {
  const sorted = [...indexes].sort((a, b) => a - b);
  const parts = sorted
    .map((index) => tokens.find((token) => token.index === index)?.clean)
    .filter((value): value is string => Boolean(value));
  return parts.join(" ");
}

export function ReadingPageText({
  text,
  width,
  fontSize,
  vaultWords,
  selectedClean,
  selectedOccurrence,
  rangeIndexes,
  onSelectWord,
  onLongPressWord,
  onToggleRangeWord,
}: {
  text: string;
  width: number;
  fontSize: number;
  vaultWords: Set<string>;
  selectedClean: string | null;
  selectedOccurrence: number | null;
  rangeIndexes: number[] | null;
  onSelectWord: (clean: string, occurrence: number, anchor: WordAnchor) => void;
  onLongPressWord: (clean: string, occurrence: number, anchor: WordAnchor, tokenIndex: number) => void;
  onToggleRangeWord: (tokenIndex: number, clean: string, occurrence: number, anchor: WordAnchor) => void;
}) {
  const theme = useTheme();
  const lineHeight = Math.round(fontSize * 1.45);
  const baseStyle = {
    width,
    color: theme.colors.foreground,
    fontFamily: theme.fonts.regular,
    fontSize,
    lineHeight,
  };
  const rangeSet = rangeIndexes ? new Set(rangeIndexes) : null;
  const ranging = Boolean(rangeSet);

  if (!text.trim()) {
    return <Text style={baseStyle}>Este capítulo está vazio.</Text>;
  }

  type Parsed = {
    index: number;
    start: number;
    end: number;
    surface: string;
    clean: string;
    occurrence: number;
    inVault: boolean;
  };

  const parsed: Parsed[] = [];
  const seen = new Map<string, number>();
  const pattern = /\S+/g;
  let match: RegExpExecArray | null = pattern.exec(text);
  let tokenIndex = 0;
  while (match) {
    const surface = match[0];
    const clean = normalizeToken(surface);
    if (clean) {
      const occurrence = seen.get(clean) ?? 0;
      seen.set(clean, occurrence + 1);
      parsed.push({
        index: tokenIndex,
        start: match.index,
        end: match.index + surface.length,
        surface,
        clean,
        occurrence,
        inVault: vaultWords.has(clean),
      });
    }
    tokenIndex += 1;
    match = pattern.exec(text);
  }

  const selectedSet = new Set<number>();
  for (const item of parsed) {
    const inRange = rangeSet?.has(item.index) ?? false;
    const alone =
      !ranging && selectedClean === item.clean && selectedOccurrence === item.occurrence;
    if (inRange || alone) selectedSet.add(item.index);
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;
  parsed.forEach((item, order) => {
    if (item.start > cursor) nodes.push(text.slice(cursor, item.start));
    const selected = selectedSet.has(item.index);
    const next = parsed[order + 1];
    const nextSelected = Boolean(next && selectedSet.has(next.index));
    const prev = parsed[order - 1];
    const prevSelected = Boolean(prev && selectedSet.has(prev.index));
    const contiguous = selected && (prevSelected || nextSelected);
    const rangeRole: SelectRole = !selected
      ? null
      : contiguous
        ? prevSelected && nextSelected
          ? "middle"
          : prevSelected
            ? "end"
            : "start"
        : "solo";
    const bridge =
      selected && nextSelected && next ? text.slice(item.end, next.start) : "";
    nodes.push(
      <WordToken
        key={`word-${item.index}`}
        surface={item.surface}
        bridge={bridge}
        inVault={item.inVault}
        selected={selected}
        selectRole={rangeRole}
        similar={
          !ranging &&
          selectedClean === item.clean &&
          selectedOccurrence != null &&
          selectedOccurrence !== item.occurrence
        }
        delayLongPress={RANGE_LONG_PRESS_MS}
        onPress={(anchor) => {
          if (ranging) {
            onToggleRangeWord(item.index, item.clean, item.occurrence, anchor);
            return;
          }
          onSelectWord(item.clean, item.occurrence, anchor);
        }}
        onLongPress={(anchor) => {
          onLongPressWord(item.clean, item.occurrence, anchor, item.index);
        }}
      />
    );
    cursor = selected && nextSelected && next ? next.start : item.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));

  return (
    <Text selectable={false} style={baseStyle}>
      {nodes}
    </Text>
  );
}

type SelectRole = "solo" | "start" | "middle" | "end" | null;

function measureAnchor(
  event: GestureResponderEvent,
  coreRef: RefObject<ComponentRef<typeof Text> | null>,
  onReady: (anchor: WordAnchor) => void
) {
  const { pageX, pageY } = event.nativeEvent;
  const fallback = { x: pageX - 4, y: pageY - 10, width: 8, height: 20 };
  const node = coreRef.current;
  if (!node) {
    onReady(fallback);
    return;
  }
  node.measureInWindow((x, y, width, height) => {
    const measuredWord = width > 0 && height > 0 && height < 56 && width < 280;
    onReady(measuredWord ? { x, y, width, height } : fallback);
  });
}

function selectRadii(role: SelectRole): {
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomLeftRadius: number;
  borderBottomRightRadius: number;
} {
  const round = 10;
  if (role === "solo") {
    return {
      borderTopLeftRadius: round,
      borderTopRightRadius: round,
      borderBottomLeftRadius: round,
      borderBottomRightRadius: round,
    };
  }
  if (role === "start") {
    return {
      borderTopLeftRadius: round,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: round,
      borderBottomRightRadius: 0,
    };
  }
  if (role === "end") {
    return {
      borderTopLeftRadius: 0,
      borderTopRightRadius: round,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: round,
    };
  }
  return {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  };
}

function WordToken({
  surface,
  bridge = "",
  selected,
  selectRole,
  similar,
  inVault,
  delayLongPress,
  onPress,
  onLongPress,
}: {
  surface: string;
  bridge?: string;
  selected: boolean;
  selectRole: SelectRole;
  similar: boolean;
  inVault: boolean;
  delayLongPress: number;
  onPress: (anchor: WordAnchor) => void;
  onLongPress: (anchor: WordAnchor) => void;
}) {
  const theme = useTheme();
  const coreRef = useRef<ComponentRef<typeof Text>>(null);
  const longTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);
  const pressPoint = useRef({ pageX: 0, pageY: 0 });
  const { leading, core, trailing } = splitTokenEdges(surface);
  const marked = inVault || similar || selected;
  const radii = selectRadii(selected ? selectRole : marked ? "solo" : null);

  const clearLong = () => {
    if (longTimer.current) {
      clearTimeout(longTimer.current);
      longTimer.current = null;
    }
  };

  const anchorFromPoint = (onReady: (anchor: WordAnchor) => void) => {
    const { pageX, pageY } = pressPoint.current;
    const fallback = { x: pageX - 4, y: pageY - 10, width: 8, height: 20 };
    const node = coreRef.current;
    if (!node) {
      onReady(fallback);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      const measuredWord = width > 0 && height > 0 && height < 56 && width < 280;
      onReady(measuredWord ? { x, y, width, height } : fallback);
    });
  };

  return (
    <Text
      suppressHighlighting
      onPressIn={(event: GestureResponderEvent) => {
        longFired.current = false;
        clearLong();
        pressPoint.current = {
          pageX: event.nativeEvent.pageX,
          pageY: event.nativeEvent.pageY,
        };
        longTimer.current = setTimeout(() => {
          longFired.current = true;
          anchorFromPoint(onLongPress);
        }, delayLongPress);
      }}
      onPressOut={clearLong}
      onPress={(event: GestureResponderEvent) => {
        if (longFired.current) {
          longFired.current = false;
          return;
        }
        clearLong();
        pressPoint.current = {
          pageX: event.nativeEvent.pageX,
          pageY: event.nativeEvent.pageY,
        };
        measureAnchor(event, coreRef, onPress);
      }}
    >
      {leading}
      <Text
        ref={coreRef}
        style={{
          color: selected ? "#0b1f14" : inVault ? "#7ddea8" : theme.colors.foreground,
          backgroundColor: selected
            ? "#3dd68c"
            : similar
              ? "rgba(61,214,140,0.18)"
              : inVault
                ? "rgba(36,200,117,0.28)"
                : "transparent",
          overflow: "hidden",
          paddingHorizontal: marked ? 5 : 0,
          paddingVertical: selected ? 1 : 0,
          ...radii,
        }}
      >
        {core}
        {bridge}
      </Text>
      {trailing}
    </Text>
  );
}
