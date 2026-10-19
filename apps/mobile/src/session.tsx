import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { apiRequest, type MobileUser } from "./api";

const TOKEN_KEY = "wordmap-token";

function webStorage(): Storage | null {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return null;
  return localStorage;
}

async function readToken() {
  const storage = webStorage();
  if (storage) return storage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function writeToken(token: string) {
  const storage = webStorage();
  if (storage) {
    storage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function clearToken() {
  const storage = webStorage();
  if (storage) {
    storage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

type Session = {
  ready: boolean;
  user: MobileUser | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MobileUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await readToken();
        if (!stored || cancelled) return;
        const result = await apiRequest<{ user: MobileUser | null }>("/auth/me", {
          token: stored,
        });
        if (cancelled) return;
        if (!result.user) {
          await clearToken();
          return;
        }
        setToken(stored);
        setUser(result.user);
      } catch {
        await clearToken();
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<{
      success: boolean;
      error?: string;
      token?: string;
      user?: MobileUser;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!result.success || !result.token || !result.user) {
      return result.error || "Não foi possível entrar";
    }
    await writeToken(result.token);
    setToken(result.token);
    setUser(result.user);
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ ready, user: token ? user : null, signIn, signOut }),
    [ready, token, user, signIn, signOut]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession precisa ficar dentro de SessionProvider");
  }
  return session;
}
