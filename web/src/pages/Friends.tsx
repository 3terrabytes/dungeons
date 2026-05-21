import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";

interface Friend {
  id: string;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing" | null;
  user: { id: string; username: string; level: number };
}

interface SearchUser {
  id: string;
  username: string;
  level: number;
}

export function Friends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await api.get<{ friends: Friend[] }>("/api/friends");
    setFriends(r.friends);
  }
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await api.get<{ users: SearchUser[] }>(
          `/api/friends/search?q=${encodeURIComponent(query)}`
        );
        if (!cancelled) setResults(r.users);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  async function sendRequest(username: string) {
    setBusy(true);
    setMsg(null);
    try {
      await api.post("/api/friends/request", { username });
      setMsg(`Friend request sent to ${username}.`);
      await load();
    } catch (e) {
      setMsg(e instanceof ApiError ? humanError(e.body?.error) : "Could not send request.");
    } finally {
      setBusy(false);
    }
  }
  async function accept(id: string) {
    setBusy(true);
    try {
      await api.post("/api/friends/accept", { id });
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function decline(id: string) {
    setBusy(true);
    try {
      await api.post("/api/friends/decline", { id });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const incoming = friends.filter((f) => f.status === "pending" && f.direction === "incoming");
  const outgoing = friends.filter((f) => f.status === "pending" && f.direction === "outgoing");
  const accepted = friends.filter((f) => f.status === "accepted");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card">
        <h2 className="font-semibold mb-2">Find friends</h2>
        <input
          className="input"
          placeholder="Search by username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {msg && <div className="text-xs text-slate-300 mt-2">{msg}</div>}
        <ul className="mt-3 divide-y divide-slate-800">
          {results.map((u) => (
            <li key={u.id} className="py-2 flex items-center gap-2">
              <Link to={`/profile/${u.username}`} className="flex-1 hover:underline">
                <span className="font-medium">{u.username}</span>
                <span className="text-xs text-slate-400 ml-2">Lv {u.level}</span>
              </Link>
              <button
                className="btn"
                disabled={busy}
                onClick={() => sendRequest(u.username)}
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h2 className="font-semibold mb-2">Requests</h2>
        {incoming.length === 0 && outgoing.length === 0 && (
          <div className="text-sm text-slate-400">No pending requests.</div>
        )}
        {incoming.length > 0 && (
          <>
            <div className="text-xs uppercase tracking-wide text-slate-400 mt-1">Incoming</div>
            <ul className="divide-y divide-slate-800">
              {incoming.map((f) => (
                <li key={f.id} className="py-2 flex items-center gap-2">
                  <span className="flex-1">{f.user.username}</span>
                  <button className="btn-primary" onClick={() => accept(f.id)} disabled={busy}>
                    Accept
                  </button>
                  <button className="btn" onClick={() => decline(f.id)} disabled={busy}>
                    Decline
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {outgoing.length > 0 && (
          <>
            <div className="text-xs uppercase tracking-wide text-slate-400 mt-3">Outgoing</div>
            <ul className="divide-y divide-slate-800">
              {outgoing.map((f) => (
                <li key={f.id} className="py-2 flex items-center gap-2">
                  <span className="flex-1">{f.user.username}</span>
                  <span className="text-xs text-slate-500">Pending</span>
                  <button className="btn" onClick={() => decline(f.id)} disabled={busy}>
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="card md:col-span-2">
        <h2 className="font-semibold mb-2">Friends ({accepted.length})</h2>
        {accepted.length === 0 ? (
          <div className="text-sm text-slate-400">No friends yet. Search above to add some.</div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {accepted.map((f) => (
              <li key={f.id} className="py-2 flex items-center gap-2">
                <Link to={`/profile/${f.user.username}`} className="flex-1 hover:underline">
                  <span className="font-medium">{f.user.username}</span>
                  <span className="text-xs text-slate-400 ml-2">Lv {f.user.level}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function humanError(code?: string): string {
  switch (code) {
    case "user_not_found":
      return "No user with that username.";
    case "already_exists":
      return "You already have a request or friendship with that user.";
    case "cannot_befriend_self":
      return "You can't friend yourself.";
    default:
      return code ? `Error: ${code}` : "Something went wrong.";
  }
}
