"use client";

import Link from "next/link";
import { LockKeyhole, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";

export function PasswordRecoveryForm({ token }: { token?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    setMessage("");
    const action = token ? "reset-password" : "request-reset";
    const body = token
      ? { action, token, password: data.get("password") }
      : { action, email: data.get("email") };
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const responseText = await response.text();
      let result: { error?: string; message?: string; resetUrl?: string } = {};
      if (responseText) {
        try {
          result = JSON.parse(responseText) as typeof result;
        } catch {
          throw new Error("The server returned an invalid response. Please try again.");
        }
      }
      if (!response.ok) throw new Error(result.error ?? "Unable to continue.");
      setMessage(
        result.message ?? "If that email has an account, a reset link is ready.",
      );
      if (token) form.reset();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell">
      <video
        className="auth-background"
        src="/backgrounds/login.mp4"
        muted
        loop
        playsInline
        preload="metadata"
        tabIndex={-1}
        aria-hidden="true"
      />
      <div className="auth-video-shade" aria-hidden="true" />
      <header className="auth-header">
        <Link href="/" className="auth-brand">
          touchline<span>.</span>
        </Link>
      </header>
      <section className="auth-card" aria-labelledby="recovery-title">
        <h1 id="recovery-title">
          {token ? "Set a new password" : "Recover your password"}
          <span>.</span>
        </h1>
        <p className="auth-description">
          {token
            ? "Choose a new password for your Touchline account."
            : "Enter your email and we’ll help you get back into your account."}
        </p>
        <form onSubmit={submit}>
          {!token ? (
            <div className="auth-field">
              <label htmlFor="recovery-email">Email address</label>
              <div className="auth-input-wrap">
                <Mail size={17} aria-hidden="true" />
                <input
                  id="recovery-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  maxLength={254}
                  required
                  disabled={busy}
                />
              </div>
            </div>
          ) : (
            <div className="auth-field">
              <label htmlFor="recovery-password">New password</label>
              <div className="auth-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  id="recovery-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 12 characters"
                  minLength={12}
                  maxLength={128}
                  required
                  disabled={busy}
                />
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}
          {message && <p className="auth-success">{message}</p>}
          <button className="auth-submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : token
                ? "Update password →"
                : "Send recovery link →"}
          </button>
        </form>
        <p className="auth-session-note">
          <Link href="/login">Back to log in</Link>
        </p>
      </section>
    </main>
  );
}
