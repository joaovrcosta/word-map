"use client";

import { createContext, useContext } from "react";
import type { SessionUser } from "./api";

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={user}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const user = useContext(SessionContext);
  if (!user) throw new Error("Sessão indisponível");
  return user;
}
