"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

type Message = { role: "user" | "assistant"; text: string };
export default function VehicleAssistant({ id, account }: { id: string; account: boolean }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const request = useCallback(async (method: string, signal: AbortSignal, text?: string) => {
    const client = getSupabase();
    const session = client ? (await client.auth.getSession()).data.session : null;
    if (!session) throw new Error("Sign in again to use the assistant.");
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!base) throw new Error("The backend isn't configured.");
    const response = await fetch(`${base.replace(/\/$/, "")}/api/vehicles/${encodeURIComponent(id)}/assistant`, {
      method, headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      ...(text === undefined ? {} : { body: JSON.stringify({ question: text }) }), signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.answer ?? "Couldn't load the conversation. Check that the backend is running, then reload.");
    return result;
  }, [id]);
  useEffect(() => {
    if (!account) return;
    const abort = new AbortController();
    let active = true;
    const timeout = setTimeout(() => abort.abort(), 45000);
    void request("GET", abort.signal).then(result => {
      if (!active) return;
      if (!Array.isArray(result) || !result.every(item => (item.role === "user" || item.role === "assistant") && typeof item.text === "string")) throw new Error("Couldn't read saved messages.");
      setMessages(result); setLoaded(true);
    }).catch(cause => { if (active) setError(abort.signal.aborted ? "Conversation loading timed out. Reload to try again." : cause instanceof Error ? cause.message : "Couldn't load the conversation."); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); abort.abort(); controller.current?.abort(); };
  }, [request, account]);
  async function perform(method: "POST" | "DELETE") {
    if (busy || !loaded) return;
    const text = question.trim();
    if (method === "POST" && !text) return;
    setBusy(true); setError("");
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 45000);
    try {
      const result = await request(method, abort.signal, method === "POST" ? text : undefined);
      if (method === "DELETE") setMessages([]);
      else {
        if (typeof result?.answer !== "string") throw new Error("The assistant returned an unreadable answer. Reload to check saved messages.");
        setMessages(previous => [...previous, { role: "user", text }, { role: "assistant", text: result.answer }]);
        setQuestion("");
      }
    } catch (cause) {
      setError(abort.signal.aborted ? "The request stopped or timed out. Reload to check whether a reply was saved before retrying." : cause instanceof Error ? cause.message : "The assistant couldn't answer.");
    } finally { clearTimeout(timeout); controller.current = null; setBusy(false); }
  }
  function ask(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void perform("POST"); }
  return <section className="service-section assistant-section" aria-labelledby="assistant-title">
    <p className="eyebrow">ASK MOTORVA</p><h2 id="assistant-title">Your vehicle assistant</h2>
    {!account ? <p className="form-intro"><Link href="/account">Sign in</Link> to ask about your saved vehicle.</p> : <>
      <p className="form-intro">Your conversation is saved to your account for this vehicle. Follow up whenever you return.</p>
      {!loaded && !error && <p role="status">Loading conversation…</p>}
      <div className="assistant-conversation" role="log" aria-label="Saved vehicle conversation" aria-live="polite">
        {messages.map((message, index) => <div className="assistant-answer" key={index}><p className="eyebrow">{message.role === "user" ? "YOU" : "MOTORVA AI"}</p><p>{message.text}</p></div>)}
      </div>
      <form onSubmit={ask}><label htmlFor={`question-${id}`}>Your question</label><textarea id={`question-${id}`} value={question} onChange={event => setQuestion(event.target.value)} maxLength={1000} required disabled={busy || !loaded} placeholder="What maintenance have I recorded for this car?" />
        <p className="field-hint">Your question, recent conversation, vehicle details, and service/reminder titles are sent to OpenAI. Photos and service notes are excluded. The latest four exchanges provide context; older messages remain saved here.</p>
        <div className="form-actions"><button type="submit" className="button-primary" disabled={busy || !loaded || !question.trim()}>{busy ? "Working…" : "Ask Motorva"}</button>{busy && <button type="button" className="button-secondary" onClick={() => controller.current?.abort()}>Cancel</button>}{messages.length > 0 && <button type="button" className="button-secondary" disabled={busy || !loaded} onClick={() => { if (window.confirm("Delete this vehicle’s saved conversation?")) void perform("DELETE"); }}>Clear conversation</button>}</div>
      </form>
      {error && <p role="alert" className="form-error">{error}</p>}
      <p className="field-hint">AI can make mistakes. Check your owner’s manual for exact intervals. This assistant cannot confirm whether your car is safe to drive.</p>
    </>}
  </section>;
}
