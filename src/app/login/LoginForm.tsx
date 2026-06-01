"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const initialInvite = (searchParams.get("invite") || "").toUpperCase();
  const initialMode: Mode =
    searchParams.get("mode") === "signup" || initialInvite ? "signup" : "signin";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState(initialInvite);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const supabase = createClient();

    if (mode === "signup" && !inviteCode.trim()) {
      setError("An invite code is required to join the test.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(redirectTo);
        router.refresh();
      } else {
        const code = inviteCode.trim().toUpperCase();

        // Pre-check so we can show a friendly message before attempting signup.
        const { data: available } = await supabase.rpc(
          "invite_code_available",
          { p_code: code },
        );
        if (!available) {
          setError("That invite code is invalid or has been used up.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split("@")[0],
              username: email.split("@")[0],
              invite_code: code,
            },
          },
        });
        if (error) throw error;
        // If email confirmation is disabled, a session exists immediately.
        if (data.session) {
          router.push(redirectTo);
          router.refresh();
        } else {
          setNotice(
            "Check your email to confirm your account, then sign in to begin your delve.",
          );
          setMode("signin");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      // The signup-gating trigger surfaces as a generic GoTrue database error.
      if (mode === "signup" && /database error/i.test(message)) {
        setError(
          "We couldn't create your account — your invite code may be invalid or already used.",
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dd-panel rounded-2xl p-8">
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl text-parchment">
          {mode === "signin" ? "Welcome back, adventurer" : "Forge your legend"}
        </h1>
        <p className="mt-1 text-sm text-parchment/60">
          {mode === "signin"
            ? "Sign in to rejoin your party."
            : "Delve Dungeons is invite-only during testing. Enter your code to join."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <>
            <Field
              label="Invite code"
              type="text"
              value={inviteCode}
              onChange={(v) => setInviteCode(v.toUpperCase())}
              placeholder="ABCD2345"
              autoComplete="off"
              required
            />
            <Field
              label="Display name"
              type="text"
              value={displayName}
              onChange={setDisplayName}
              placeholder="Tasha the Bold"
              autoComplete="nickname"
            />
          </>
        )}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
          minLength={6}
        />

        {error && (
          <p className="rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg border border-moss/40 bg-moss/10 px-3 py-2 text-sm text-green-200">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-ember to-ember-bright py-3 font-medium text-ink shadow-lg shadow-ember/30 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Casting…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-parchment/60">
        {mode === "signin" ? "New to the realm?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="font-medium text-arcane-bright underline-offset-2 hover:underline"
        >
          {mode === "signin" ? "Create one" : "Sign in"}
        </button>
      </p>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  minLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className="w-full rounded-xl border border-gold/20 bg-black/30 px-4 py-3 text-parchment placeholder:text-parchment/30 outline-none transition focus:border-arcane focus:ring-2 focus:ring-arcane/30"
      />
    </label>
  );
}
