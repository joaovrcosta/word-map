import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus, type NativeEventSubscription } from "react-native";
import {
  STUDY_HEARTBEAT_INTERVAL_MS,
  STUDY_HEARTBEAT_MAX_SECONDS,
  STUDY_IDLE_MS,
} from "@word-map/shared";
import { useSession } from "../../session";
import type { StudyKind, StudyToday } from "../../study";

type Options = {
  kind: StudyKind;
  enabled?: boolean;
  /** Flashcards: pass true to treat as always-interactive while session is active. */
  assumeInteractive?: boolean;
  onUpdate?: (today: StudyToday) => void;
};

/**
 * Reports active study time. Only ticks while the app is foregrounded and
 * there was user interaction in the last STUDY_IDLE_MS (unless assumeInteractive).
 */
export function useStudyHeartbeat({
  kind,
  enabled = true,
  assumeInteractive = false,
  onUpdate,
}: Options) {
  const { request } = useSession();
  const lastSentAt = useRef(Date.now());
  const lastInteractionAt = useRef(Date.now());
  const sending = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const markInteraction = useCallback(() => {
    lastInteractionAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let alive = true;
    lastSentAt.current = Date.now();
    lastInteractionAt.current = Date.now();

    const flush = async (reason: "tick" | "background" | "unmount") => {
      if (!alive && reason !== "unmount") return;
      if (sending.current) return;

      const now = Date.now();
      const idle = !assumeInteractive && now - lastInteractionAt.current > STUDY_IDLE_MS;
      // Ao ficar ocioso, credita só até a última interação; descarta o tempo parado.
      const endMs = idle && reason === "tick" ? lastInteractionAt.current : now;
      const seconds = Math.min(
        STUDY_HEARTBEAT_MAX_SECONDS,
        Math.max(0, Math.floor((endMs - lastSentAt.current) / 1000))
      );
      lastSentAt.current = now;
      if (seconds < 1) return;

      sending.current = true;
      try {
        const today = await request<StudyToday>("/study/heartbeat", {
          method: "POST",
          body: JSON.stringify({ kind, seconds }),
        });
        onUpdateRef.current?.(today);
      } catch {
        // Server creditedUntil already caps wall-clock on retries.
      } finally {
        sending.current = false;
      }
    };

    const onAppState = (state: AppStateStatus) => {
      if (state === "active") {
        lastSentAt.current = Date.now();
        lastInteractionAt.current = Date.now();
        return;
      }
      void flush("background");
    };

    const sub: NativeEventSubscription = AppState.addEventListener("change", onAppState);
    const timer = setInterval(() => {
      void flush("tick");
    }, STUDY_HEARTBEAT_INTERVAL_MS);

    return () => {
      alive = false;
      clearInterval(timer);
      sub.remove();
      void flush("unmount");
    };
  }, [assumeInteractive, enabled, kind, request]);

  return { markInteraction };
}
