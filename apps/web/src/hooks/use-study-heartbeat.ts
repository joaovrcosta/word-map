"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  STUDY_HEARTBEAT_INTERVAL_MS,
  STUDY_HEARTBEAT_MAX_SECONDS,
  STUDY_IDLE_MS,
} from "@word-map/shared";
import { browserApi } from "@/lib/api/resources";
import type { StudyKind, StudyToday } from "@/lib/study";

type Options = {
  kind: StudyKind;
  enabled?: boolean;
  assumeInteractive?: boolean;
  onUpdate?: (today: StudyToday) => void;
};

export function useStudyHeartbeat({
  kind,
  enabled = true,
  assumeInteractive = false,
  onUpdate,
}: Options) {
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

    const flush = async (reason: "tick" | "hidden" | "unmount") => {
      if (!alive && reason !== "unmount") return;
      if (sending.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden" && reason === "tick") {
        return;
      }

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
        const today = await browserApi.studyHeartbeat({ kind, seconds });
        onUpdateRef.current?.(today);
      } catch {
        // Server wall-clock cap handles retries.
      } finally {
        sending.current = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        void flush("hidden");
        return;
      }
      lastSentAt.current = Date.now();
      lastInteractionAt.current = Date.now();
    };

    document.addEventListener("visibilitychange", onVisibility);
    const timer = setInterval(() => {
      void flush("tick");
    }, STUDY_HEARTBEAT_INTERVAL_MS);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      void flush("unmount");
    };
  }, [assumeInteractive, enabled, kind]);

  return { markInteraction };
}
