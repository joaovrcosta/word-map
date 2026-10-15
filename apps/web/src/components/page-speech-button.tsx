"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { splitSentences } from "@/lib/reading-pages";
import {
  SPEECH_RATE,
  locateSentenceStarts,
  paintSpokenWord,
  timedWords,
  wordAtChar,
  wordAtElapsed,
  type SpokenRange,
} from "@/lib/spoken-word";

type SpeechListener = (range: SpokenRange | null) => void;

type SpeechStatus = "idle" | "playing" | "paused";

export function usePageSpeech(text: string, onPageEnd?: () => boolean) {
  const sentences = useMemo(
    () => splitSentences(text).map((sentence) => sentence.trim()).filter(Boolean),
    [text]
  );
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const statusRef = useRef<SpeechStatus>("idle");
  const indexRef = useRef(0);
  const wordIndexRef = useRef(0);
  const tokenRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const clockRef = useRef<number | null>(null);
  const listenersRef = useRef(new Set<SpeechListener>());
  const onPageEndRef = useRef(onPageEnd);
  const resumeOnTextChangeRef = useRef(false);
  const playFromRef = useRef<(index: number, fromWord?: number) => void>(() => {});
  onPageEndRef.current = onPageEnd;

  const setSpeechStatus = (next: SpeechStatus) => {
    statusRef.current = next;
    setStatus(next);
  };

  const clearTimer = () => {
    if (timerRef.current == null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const clearClock = () => {
    if (clockRef.current == null) return;
    window.clearInterval(clockRef.current);
    clockRef.current = null;
  };

  const publish = useCallback((range: SpokenRange | null) => {
    listenersRef.current.forEach((listener) => listener(range));
  }, []);

  const halt = useCallback(() => {
    tokenRef.current += 1;
    clearTimer();
    clearClock();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    const resume = resumeOnTextChangeRef.current;
    resumeOnTextChangeRef.current = false;
    halt();
    indexRef.current = 0;
    wordIndexRef.current = 0;
    if (resume) {
      playFromRef.current(0, 0);
      return () => halt();
    }
    setSpeechStatus("idle");
    publish(null);
    return () => halt();
  }, [text, halt, publish]);

  const speakAt = useCallback(
    (index: number, token: number, fromWord = 0) => {
      if (token !== tokenRef.current) return;
      if (!("speechSynthesis" in window)) return;
      if (index >= sentences.length) {
        if (statusRef.current === "playing" && onPageEndRef.current?.()) {
          resumeOnTextChangeRef.current = true;
          return;
        }
        indexRef.current = 0;
        wordIndexRef.current = 0;
        setSpeechStatus("idle");
        publish(null);
        return;
      }

      indexRef.current = index;
      const sentence = sentences[index];
      const words = timedWords(sentence);
      const startWord = Math.max(0, fromWord);
      if (startWord >= words.length) {
        speakAt(index + 1, token, 0);
        return;
      }

      const slice = words.slice(startWord);
      const cut = slice[0]?.start ?? 0;
      const origin = locateSentenceStarts(text, sentences)[index] ?? 0;
      const show = (word: (typeof words)[number] | null) => {
        if (!word) return;
        const at = words.indexOf(word);
        if (at >= 0) wordIndexRef.current = at;
        publish({ start: origin + word.start, end: origin + word.end });
      };
      show(slice[0] ?? null);

      let boundarySeen = false;
      const startedAt = performance.now();
      clearClock();
      clockRef.current = window.setInterval(() => {
        if (token !== tokenRef.current || boundarySeen) {
          clearClock();
          return;
        }
        show(wordAtElapsed(slice, performance.now() - startedAt));
      }, 80);

      const utterance = new SpeechSynthesisUtterance(sentence.slice(cut));
      utterance.lang = "en-US";
      utterance.rate = SPEECH_RATE;
      utterance.onboundary = (event) => {
        if (token !== tokenRef.current) return;
        if (event.name && event.name !== "word") return;
        boundarySeen = true;
        clearClock();
        show(wordAtChar(words, cut + (event.charIndex ?? 0)));
      };
      utterance.onend = () => {
        if (token !== tokenRef.current) return;
        clearClock();
        if (statusRef.current !== "playing") return;
        wordIndexRef.current = 0;
        speakAt(index + 1, token, 0);
      };
      utterance.onerror = () => {
        if (token !== tokenRef.current) return;
        clearClock();
        if (statusRef.current === "playing") setSpeechStatus("paused");
      };
      window.speechSynthesis.speak(utterance);
    },
    [publish, sentences, text]
  );

  const playFrom = useCallback(
    (index: number, fromWord = 0) => {
      if (!("speechSynthesis" in window) || sentences.length === 0) return;
      const token = ++tokenRef.current;
      clearTimer();
      window.speechSynthesis.cancel();
      setSpeechStatus("playing");
      timerRef.current = window.setTimeout(() => {
        if (token !== tokenRef.current) return;
        speakAt(index, token, fromWord);
      }, 60);
    },
    [sentences.length, speakAt]
  );
  playFromRef.current = playFrom;

  const toggle = useCallback(() => {
    if (statusRef.current === "playing") {
      setSpeechStatus("paused");
      halt();
      return;
    }
    if (statusRef.current !== "paused") wordIndexRef.current = 0;
    playFrom(
      statusRef.current === "paused" ? indexRef.current : 0,
      wordIndexRef.current
    );
  }, [halt, playFrom]);

  const jump = useCallback(
    (delta: number) => {
      if (sentences.length === 0) return;
      const base = statusRef.current === "idle" ? 0 : indexRef.current;
      const next = Math.min(sentences.length - 1, Math.max(0, base + delta));
      indexRef.current = next;
      wordIndexRef.current = 0;
      if (statusRef.current === "playing" || statusRef.current === "idle") {
        playFrom(next, 0);
        return;
      }
      setSpeechStatus("paused");
    },
    [playFrom, sentences.length]
  );

  const subscribe = useCallback((listener: SpeechListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  return {
    status,
    toggle,
    jump,
    canPlay: sentences.length > 0,
    subscribe,
  };
}

const controlClass =
  "inline-flex size-11 items-center justify-center rounded-full text-white transition-transform hover:scale-105 disabled:text-white/30 disabled:opacity-100";

export function PageSpeechControls({
  status,
  canPlay,
  onToggle,
  onNextPart,
  onPreviousPart,
  canNext,
  canPrevious,
}: {
  status: SpeechStatus;
  canPlay: boolean;
  onToggle: () => void;
  onNextPart: () => void;
  onPreviousPart: () => void;
  canNext: boolean;
  canPrevious: boolean;
}) {
  if (!canPlay) return null;

  return (
    <div className="flex items-center justify-center gap-7">
      <button
        type="button"
        onClick={onPreviousPart}
        disabled={!canPrevious}
        aria-label="Parte anterior"
        className={controlClass}
      >
        <ChevronLeft className="size-6" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={onToggle}
        aria-label={status === "playing" ? "Pausar leitura" : "Ouvir esta página"}
        className="inline-flex size-12 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105"
      >
        {status === "playing" ? (
          <Pause className="size-7 fill-current" />
        ) : (
          <Play className="size-8 fill-current" />
        )}
      </button>
      <button
        type="button"
        onClick={onNextPart}
        disabled={!canNext}
        aria-label="Próxima parte"
        className={controlClass}
      >
        <ChevronRight className="size-6" strokeWidth={1.75} />
      </button>
    </div>
  );
}

export function PageSpeechButton({ text }: { text: string }) {
  const speech = usePageSpeech(text);
  return (
    <PageSpeechControls
      status={speech.status}
      canPlay={speech.canPlay}
      onToggle={speech.toggle}
      onNextPart={() => speech.jump(1)}
      onPreviousPart={() => speech.jump(-1)}
      canNext
      canPrevious
    />
  );
}
