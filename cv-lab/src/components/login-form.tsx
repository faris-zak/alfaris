"use client";
import { useState } from "react";
import { ArrowRight, LockKey } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ error }: { error?: string }) {
  const [email, setEmail] = useState(""); const [status, setStatus] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setStatus("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/auth/confirm` } });
      setStatus(authError ? authError.message : "Secure sign-in link sent. Check your email.");
    } catch { setStatus("Owner sign-in is not configured yet."); } finally { setBusy(false); }
  }
  return <main className="login-shell">
    <section className="login-panel" aria-labelledby="login-title">
      <div className="brand-lockup"><span>AFM</span><div><strong>ATS CV LAB</strong><small>OWNER CONSOLE</small></div></div>
      <LockKey size={36} weight="thin" aria-hidden="true" />
      <p className="eyebrow">PRIVATE WORKSPACE / ZERO PUBLIC ACCESS</p>
      <h1 id="login-title">Your evidence stays under mission control.</h1>
      <p>Sign in with the pre-authorized owner email. No account creation, saved job descriptions, or public workspace links.</p>
      <form onSubmit={submit}><label htmlFor="email">Owner email</label><input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="owner@example.com" /><button disabled={busy}>{busy ? "Sending…" : "Send secure link"}<ArrowRight size={18} /></button></form>
      {(status || error) && <p className="form-status" role="status">{status || "That sign-in link expired. Request a new one."}</p>}
    </section>
  </main>;
}
