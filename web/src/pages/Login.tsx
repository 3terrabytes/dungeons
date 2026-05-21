import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useSession } from "../lib/store";
import type { PublicUser } from "@dungeons/shared";

export function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const setUser = useSession((s) => s.setUser);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body =
        mode === "signin" ? { email, password } : { email, username, password };
      const { user } = await api.post<{ user: PublicUser }>(
        `/api/auth/${mode === "signin" ? "login" : "signup"}`,
        body
      );
      setUser(user);
      navigate("/dungeon");
    } catch (e) {
      if (e instanceof ApiError) {
        setError(humanError(e.body?.error));
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <div className="mb-4">
          <div className="text-2xl font-semibold">Dungeons</div>
          <div className="text-sm text-slate-400">
            {mode === "signin" ? "Welcome back." : "Forge a new champion."}
          </div>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs text-slate-400">
            Email
            <input
              className="input mt-1"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {mode === "signup" && (
            <label className="text-xs text-slate-400">
              Username (letters, numbers, underscore)
              <input
                className="input mt-1"
                type="text"
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
          )}
          <label className="text-xs text-slate-400">
            Password
            <input
              className="input mt-1"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <div className="text-sm text-red-400">{error}</div>}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          className="mt-3 text-xs text-slate-400 hover:text-white"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
        >
          {mode === "signin"
            ? "Need an account? Sign up."
            : "Already have one? Sign in."}
        </button>
      </div>
    </div>
  );
}

function humanError(code?: string): string {
  switch (code) {
    case "invalid_credentials":
      return "Email or password is incorrect.";
    case "email_or_username_taken":
      return "Email or username already taken.";
    case "invalid_input":
      return "Please check your inputs.";
    default:
      return code ? `Error: ${code}` : "Something went wrong.";
  }
}
