"use client";

import { useState } from "react";
import { MailCheckIcon } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState(linkError ? "That sign-in link expired or was already used. Request a new one." : "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setState("error");
      setMessage(/rate|limit/i.test(error.message) ? "Too many sign-in emails right now. Try again in a few minutes." : error.message);
    } else {
      setState("sent");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="mt-8 rounded-2xl border border-flame/30 bg-flame/10 p-6 text-left">
        <MailCheckIcon className="size-5 text-flame" />
        <p className="mt-3 font-medium text-text">Check your inbox</p>
        <p className="mt-1 text-sm text-muted">
          We sent a sign-in link to <span className="text-text">{email}</span>. Open it on this device.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-3 text-left">
      <label htmlFor="email" className="text-xs font-medium text-muted">
        Email
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="block w-full rounded-xl border border-line bg-night-2 px-4 py-3 text-text outline-none placeholder:text-muted/60 focus:border-flame/50"
      />
      <button
        disabled={state === "sending"}
        className="h-12 w-full rounded-xl bg-flame font-medium text-night transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
      >
        {state === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
      <p aria-live="polite" className="min-h-5 text-sm text-flame-deep">
        {message}
      </p>
    </form>
  );
}
