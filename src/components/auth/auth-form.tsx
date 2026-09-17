"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
  UserRoundPlus,
  Apple,
  Gamepad2,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

export function AuthForm() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (preference.matches) videoRef.current?.pause();
      else void videoRef.current?.play().catch(() => {});
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          email: data.get("email"),
          password: data.get("password"),
          remember,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "Unable to sign in. Please try again.",
        );
      router.replace("/");
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to connect. Please try again.",
      );
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell">
      <video
        ref={videoRef}
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
      <section className="auth-card" aria-labelledby="auth-title">
        <h1 id="auth-title">
          {mode === "login" ? "Welcome back" : "Join the game"}
          <span>.</span>
        </h1>
        <p className="auth-description">
          {mode === "login"
            ? "Sign in to follow every match, every moment."
            : "Create your account. Never miss a moment."}
        </p>
        <div className="auth-tabs" aria-label="Account options">
          <button
            type="button"
            disabled={busy}
            aria-pressed={mode === "login"}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            <UserRound size={15} aria-hidden="true" /> Log in
          </button>
          <button
            type="button"
            disabled={busy}
            aria-pressed={mode === "signup"}
            onClick={() => {
              setMode("signup");
              setError("");
            }}
          >
            <UserRoundPlus size={15} aria-hidden="true" /> Create account
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="auth-field">
            <label htmlFor="auth-email">Email address</label>
            <div className="auth-input-wrap">
              <Mail size={17} aria-hidden="true" />
              <input
                id="auth-email"
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
          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <div className="auth-input-wrap">
              <LockKeyhole size={17} aria-hidden="true" />
              <input
                id="auth-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                minLength={12}
                maxLength={128}
                required
                disabled={busy}
                aria-describedby="password-hint"
              />
              <button
                type="button"
                className="auth-eye"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
          <p
            id="password-hint"
            className={mode === "signup" ? "auth-hint" : "sr-only"}
          >
            At least 12 characters.
          </p>
          <div className="auth-options">
            <label className="auth-remember">
              <input
                type="checkbox"
                checked={remember}
                disabled={busy}
                onChange={(event) => setRemember(event.target.checked)}
              />{" "}
              Remember me
            </label>
            {mode === "login" && (
              <Link href="/password-recovery" className="auth-recovery">
                Forgot password?
              </Link>
            )}
          </div>
          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}
          <button className="auth-submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "signup"
                ? "Create account →"
                : "Log in →"}
          </button>
        </form>
        <div className="auth-divider">or continue with</div>
        <div className="auth-socials">
          <button
            type="button"
            aria-label="Continue with Google (unavailable)"
            aria-disabled="true"
            onClick={() =>
              setError(
                "Google sign-in is not available yet. Please use your email and password.",
              )
            }
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3z"
              />
              <path
                fill="#34A853"
                d="M12 22c2.7 0 5-1 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3.1v2.6A10 10 0 0 0 12 22z"
              />
              <path
                fill="#FBBC05"
                d="M6.4 13.8a6 6 0 0 1 0-3.6V7.6H3.1a10 10 0 0 0 0 8.8z"
              />
              <path
                fill="#EA4335"
                d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.5 9.5 0 0 0 12 2a10 10 0 0 0-8.9 5.6l3.3 2.6C7.2 7.8 9.4 6 12 6z"
              />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Continue with Apple (unavailable)"
            aria-disabled="true"
            onClick={() =>
              setError(
                "Apple sign-in is not available yet. Please use your email and password.",
              )
            }
          >
            <Apple fill="currentColor" size={19} />
          </button>
          <button
            type="button"
            aria-label="Continue with Xbox (unavailable)"
            aria-disabled="true"
            onClick={() =>
              setError(
                "Xbox sign-in is not available yet. Please use your email and password.",
              )
            }
          >
            <Gamepad2 color="#8bdf9e" size={19} />
          </button>
        </div>
        <p className="auth-session-note">
          {remember
            ? "Your session keeps you signed in for 30 days."
            : "You’ll stay signed in for this browser session."}
          <br />
          Social sign-in coming soon.
        </p>
      </section>
    </main>
  );
}
