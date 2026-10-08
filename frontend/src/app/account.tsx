"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "./auth-provider";

export default function Account() {
  const { session, ready, configured, error: authError } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = getSupabase();
    if (!client || busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    setBusy(true); setError(""); setMessage("");
    try {
      const result = mode === "signup" ? await client.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/account` } }) : await client.auth.signInWithPassword({ email, password });
      if (result.error) {
        setError(mode === "signin" ? "Sign-in failed. Check your email and password, confirm your email if required, then try again." : "We couldn't create the account. Check your email and password, or try signing in if you already have an account.");
        return;
      }
      form.reset();
      if (mode === "signup" && !result.data.session) setMessage("Check your email for a confirmation link, then return here to sign in. If you already have an account, sign in instead.");
    } catch { setError("We couldn't reach the sign-in service. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    const client = getSupabase();
    if (!client || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) setError("We couldn't sign you out. Please try again.");
      else setMessage("Signed out on this device.");
    } catch { setError("We couldn't sign you out. Please try again."); }
    finally { setBusy(false); }
  }

  return <div className="garage-shell"><header className="topbar"><Link href="/" className="brand" aria-label="Motorva home"><span className="brand-mark">M</span>MOTORVA<span className="brand-dot">.</span></Link><Link href="/" className="account-link">Back to garage</Link></header>
    <main className="account-main"><p className="eyebrow">BUILT AROUND YOUR DRIVE</p><h1>{session ? "Your account." : "Your garage starts here."}</h1>
      {!ready ? <p role="status" className="form-intro">Checking your sign-in…</p> : !configured ? <p className="storage-error" role="alert">Account sign-in has not been configured yet. Your browser garage is still available.</p> : session ? <section className="account-panel"><h2>You’re signed in</h2><p className="account-email">{session.user.email}</p><p className="form-intro">Open your account garage to save vehicles, services, and reminders. You can import your existing browser garage there.</p><div className="form-actions"><Link href="/" className="button-primary">Open garage</Link><button className="button-secondary" onClick={() => void signOut()} disabled={busy}>Sign out</button></div></section> : <section className="account-panel">
        <div className="account-tabs" aria-label="Choose account action"><button className={mode === "signin" ? "button-primary" : "button-secondary"} type="button" aria-pressed={mode === "signin"} disabled={busy} onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>Sign in</button><button className={mode === "signup" ? "button-primary" : "button-secondary"} type="button" aria-pressed={mode === "signup"} disabled={busy} onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>Create account</button></div>
        <h2>{mode === "signup" ? "Create your Motorva account" : "Welcome back"}</h2><p className="form-intro">{mode === "signup" ? "Use your email and a password with at least 12 characters." : "Sign in with your Motorva email and password."}</p>
        <form key={mode} onSubmit={submit}><div className="form-grid"><label className="full-width">Email<input name="email" type="email" autoComplete="email" maxLength={254} required disabled={busy} /></label><label className="full-width">Password<input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 12 : 1} maxLength={128} required disabled={busy} /></label></div><p className="save-note">Your guest garage stays in this browser. Import it into your account after signing in.</p><button type="submit" className="button-primary" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create my account" : "Sign in to Motorva"}</button></form>
      </section>}
      {(error || authError) && <p className="form-error" role="alert">{error || authError}</p>}<p className="announcement" role="status">{message}</p>
    </main></div>;
}
