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

type GoogleSignInResult =
  | { needsUsername: true; email: string; name: string }
  | { error: string }
  | null;

export type SignUpData = {
  name: string;
  email: string;
  password: string;
  username: string;
};

type Session = {
  ready: boolean;
  user: MobileUser | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (data: SignUpData) => Promise<string | null>;
  signInWithGoogle: (credential: string, username?: string) => Promise<GoogleSignInResult>;
  signOut: () => Promise<void>;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
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

  const signUp = useCallback(async (data: SignUpData) => {
    const email = data.email.trim();
    const password = data.password;
    const result = await apiRequest<{
      success: boolean;
      error?: string;
      token?: string;
      user?: MobileUser;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: data.name.trim(),
        email,
        password,
        username: data.username.trim().replace(/^@+/, ""),
      }),
    });
    if (!result.success) {
      return result.error || "Não foi possível criar a conta";
    }
    if (result.token && result.user) {
      await writeToken(result.token);
      setToken(result.token);
      setUser(result.user);
      return null;
    }
    // Conta criada sem token na resposta: entra com email/senha.
    const login = await apiRequest<{
      success: boolean;
      error?: string;
      token?: string;
      user?: MobileUser;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!login.success || !login.token || !login.user) {
      return login.error || "Conta criada. Faça login para continuar.";
    }
    await writeToken(login.token);
    setToken(login.token);
    setUser(login.user);
    return null;
  }, []);

  const signInWithGoogle = useCallback(async (credential: string, username?: string) => {
    const result = await apiRequest<{
      success: boolean;
      error?: string;
      token?: string;
      user?: MobileUser;
      needsUsername?: boolean;
      email?: string;
      name?: string;
    }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential, username }),
    });
    if (result.needsUsername) {
      return {
        needsUsername: true as const,
        email: result.email || "",
        name: result.name || "",
      };
    }
    if (!result.success || !result.token || !result.user) {
      return { error: result.error || "Não foi possível entrar com o Google" };
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

  const request = useCallback(
    <T,>(path: string, init: RequestInit = {}) =>
      apiRequest<T>(path, { ...init, token }),
    [token]
  );

  const value = useMemo(
    () => ({ ready, user: token ? user : null, signIn, signUp, signInWithGoogle, signOut, request }),
    [ready, token, user, signIn, signUp, signInWithGoogle, signOut, request]
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
