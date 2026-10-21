import { Platform } from "react-native";
import Constants from "expo-constants";

type PermissionResult = { granted: boolean; canAskAgain?: boolean };
type ResultEvent = {
  isFinal?: boolean;
  results?: Array<{ transcript?: string }>;
};
type ErrorEvent = { error?: string; message?: string };
type Unsubscribe = { remove: () => void };

type SpeechModule = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<PermissionResult>;
  start: (options: {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
  }) => void;
  stop: () => void;
  abort: () => void;
  addListener: (
    event: "result" | "error" | "end" | "start",
    listener: (event: ResultEvent & ErrorEvent) => void
  ) => Unsubscribe;
};

export type SpeechSessionHandlers = {
  onPartial: (transcript: string) => void;
  onFinal: (transcript: string) => void;
  onError: (message: string) => void;
};

const IDLE_MS = 7000;
const SILENCE_MS = 2800;

let cachedModule: SpeechModule | null | undefined;

function hasNativeSpeechModule(): boolean {
  try {
    // Optional: returns null instead of throwing when the native binary is missing (Expo Go).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require("expo-modules-core") as {
      requireOptionalNativeModule?: (name: string) => unknown;
    };
    if (typeof requireOptionalNativeModule !== "function") return false;
    return requireOptionalNativeModule("ExpoSpeechRecognition") != null;
  } catch {
    return false;
  }
}

function loadModule(): SpeechModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (Platform.OS === "web") {
    cachedModule = null;
    return null;
  }
  // Expo Go never ships custom native modules — skip require entirely to avoid redbox.
  if (Constants.appOwnership === "expo") {
    cachedModule = null;
    return null;
  }
  if (!hasNativeSpeechModule()) {
    cachedModule = null;
    return null;
  }
  try {
    // Safe only after the optional native probe above.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-speech-recognition") as {
      ExpoSpeechRecognitionModule?: SpeechModule;
    };
    const api = mod.ExpoSpeechRecognitionModule;
    if (!api || typeof api.start !== "function") {
      cachedModule = null;
      return null;
    }
    cachedModule = api;
    return api;
  } catch {
    cachedModule = null;
    return null;
  }
}

export function isSpeechRecognitionAvailable(): boolean {
  const api = loadModule();
  if (!api) return false;
  try {
    return Boolean(api.isRecognitionAvailable());
  } catch {
    return false;
  }
}

export async function requestSpeechPermission(): Promise<PermissionResult> {
  const api = loadModule();
  if (!api) return { granted: false, canAskAgain: false };
  try {
    return await api.requestPermissionsAsync();
  } catch {
    return { granted: false, canAskAgain: false };
  }
}

export type SpeechSession = {
  stop: () => void;
  abort: () => void;
};

export function startSpeechSession(handlers: SpeechSessionHandlers): SpeechSession | null {
  const api = loadModule();
  if (!api) return null;

  let lastTranscript = "";
  let sawPartial = false;
  let closed = false;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  const unsubs: Unsubscribe[] = [];

  const clearTimers = () => {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  };

  const finish = (transcript: string) => {
    if (closed) return;
    closed = true;
    clearTimers();
    try {
      api.stop();
    } catch {
      /* ignore */
    }
    for (const sub of unsubs) {
      try {
        sub.remove();
      } catch {
        /* ignore */
      }
    }
    handlers.onFinal(transcript);
  };

  const armSilence = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => finish(lastTranscript), SILENCE_MS);
  };

  idleTimer = setTimeout(() => {
    if (!sawPartial) finish("");
  }, IDLE_MS);

  unsubs.push(
    api.addListener("result", (event) => {
      const transcript = event.results?.[0]?.transcript?.trim() ?? "";
      lastTranscript = transcript;
      if (!transcript) return;
      sawPartial = true;
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
      if (event.isFinal) {
        finish(transcript);
        return;
      }
      handlers.onPartial(transcript);
      armSilence();
    })
  );

  unsubs.push(
    api.addListener("error", (event) => {
      if (closed) return;
      const code = event.error ?? "";
      if (code === "no-speech" || code === "speech-timeout" || code === "aborted") {
        finish(lastTranscript);
        return;
      }
      const message = event.message || event.error || "Falha no reconhecimento";
      closed = true;
      clearTimers();
      for (const sub of unsubs) {
        try {
          sub.remove();
        } catch {
          /* ignore */
        }
      }
      handlers.onError(String(message));
    })
  );

  unsubs.push(
    api.addListener("end", () => {
      finish(lastTranscript);
    })
  );

  try {
    api.start({
      lang: "en-US",
      interimResults: true,
      continuous: false,
    });
  } catch (error) {
    closed = true;
    clearTimers();
    handlers.onError(error instanceof Error ? error.message : "Não foi possível iniciar o microfone");
    return null;
  }

  return {
    stop: () => finish(lastTranscript),
    abort: () => {
      if (closed) return;
      closed = true;
      clearTimers();
      try {
        api.abort();
      } catch {
        try {
          api.stop();
        } catch {
          /* ignore */
        }
      }
      for (const sub of unsubs) {
        try {
          sub.remove();
        } catch {
          /* ignore */
        }
      }
    },
  };
}
