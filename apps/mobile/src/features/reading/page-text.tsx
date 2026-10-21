import { useRef, type ComponentRef, type ReactNode } from "react";
import { Text, type GestureResponderEvent } from "react-native";
import { normalizeToken, splitTokenEdges } from "@word-map/shared";
import { useTheme } from "../../theme";

export type WordAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function ReadingPageText({
  text,
  width,
  fontSize,
  vaultWords,
  selectedClean,
  selectedOccurrence,
  onSelectWord,
}: {
  text: string;
  width: number;
  fontSize: number;
  vaultWords: Set<string>;
  selectedClean: string | null;
  selectedOccurrence: number | null;
  onSelectWord: (clean: string, occurrence: number, anchor: WordAnchor) => void;
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

  if (!text.trim()) {
    return <Text style={baseStyle}>Este capítulo está vazio.</Text>;
  }

  const nodes: ReactNode[] = [];
  const seen = new Map<string, number>();
  const pattern = /\S+/g;
  let last = 0;
  let tokenKey = 0;
  let match: RegExpExecArray | null = pattern.exec(text);
  while (match) {
    const start = match.index;
    if (start > last) nodes.push(text.slice(last, start));
    const surface = match[0];
    const clean = normalizeToken(surface);
    const inVault = vaultWords.has(clean);
    const clickable = Boolean(clean) && (inVault || (surface.trim().length > 2 && clean.length >= 3));
    if (clickable && clean) {
      const occurrence = seen.get(clean) ?? 0;
      seen.set(clean, occurrence + 1);
      nodes.push(
        <WordToken
          key={`word-${tokenKey}`}
          surface={surface}
          inVault={inVault}
          selected={selectedClean === clean && selectedOccurrence === occurrence}
          similar={
            selectedClean === clean &&
            selectedOccurrence != null &&
            selectedOccurrence !== occurrence
          }
          onPress={(anchor) => onSelectWord(clean, occurrence, anchor)}
        />
      );
    } else {
      nodes.push(surface);
    }
    tokenKey += 1;
    last = start + surface.length;
    match = pattern.exec(text);
  }
  if (last < text.length) nodes.push(text.slice(last));

  return (
    <Text selectable={false} style={baseStyle}>
      {nodes}
    </Text>
  );
}

function WordToken({
  surface,
  selected,
  similar,
  inVault,
  onPress,
}: {
  surface: string;
  selected: boolean;
  similar: boolean;
  inVault: boolean;
  onPress: (anchor: WordAnchor) => void;
}) {
  const theme = useTheme();
  const coreRef = useRef<ComponentRef<typeof Text>>(null);
  const { leading, core, trailing } = splitTokenEdges(surface);
  const marked = inVault || similar || selected;

  return (
    <Text
      suppressHighlighting
      onPress={(event: GestureResponderEvent) => {
        const { pageX, pageY } = event.nativeEvent;
        const fallback = { x: pageX - 4, y: pageY - 10, width: 8, height: 20 };
        const node = coreRef.current;
        if (!node) {
          onPress(fallback);
          return;
        }
        node.measureInWindow((x, y, width, height) => {
          const measuredWord = width > 0 && height > 0 && height < 56 && width < 280;
          onPress(measuredWord ? { x, y, width, height } : fallback);
        });
      }}
    >
      {leading}
      <Text
        ref={coreRef}
        style={{
          color: selected ? "#ffffff" : inVault ? "#7ddea8" : theme.colors.foreground,
          backgroundColor: selected
            ? "#24c875"
            : similar
              ? "rgba(36,200,117,0.15)"
              : inVault
                ? "rgba(36,200,117,0.25)"
                : "transparent",
          borderRadius: 3,
          paddingHorizontal: marked ? 3 : 0,
        }}
      >
        {core}
      </Text>
      {trailing}
    </Text>
  );
}
