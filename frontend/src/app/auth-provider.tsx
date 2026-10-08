"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

type AuthState = { session: Session | null; ready: boolean; configured: boolean; error: string };
const AuthContext = createContext<AuthState>({ session: null, ready: false, configured: false, error: "" });

export function useAuth() { return useContext(AuthContext); }

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, ready: false, configured: false, error: "" });
  useEffect(() => {
    const client = getSupabase();
    if (!client) {
      // Defer the initial state update to the same asynchronous flow as auth.
      Promise.resolve().then(() => setState({ session: null, ready: true, configured: false, error: "" }));
      return;
    }
    let active = true;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ session, ready: true, configured: true, error: "" });
    });
    client.auth.getSession().catch(() => {
      if (active) setState({ session: null, ready: true, configured: true, error: "Sign-in could not initialize. Please reload." });
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
