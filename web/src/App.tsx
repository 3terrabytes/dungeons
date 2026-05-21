import { useEffect } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import { api, ApiError } from "./lib/api";
import { useSession } from "./lib/store";
import { TopNav } from "./components/TopNav";
import { Login } from "./pages/Login";
import { Dungeon } from "./pages/Dungeon";
import { Combat } from "./pages/Combat";
import { Shop } from "./pages/Shop";
import { Inventory } from "./pages/Inventory";
import { Leaderboard } from "./pages/Leaderboard";
import { Friends } from "./pages/Friends";
import { Profile } from "./pages/Profile";
import type { PublicUser } from "@dungeons/shared";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useSession((s) => s.user);
  const loading = useSession((s) => s.loading);
  const loc = useLocation();
  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return <>{children}</>;
}

export function App() {
  const setUser = useSession((s) => s.setUser);
  const setLoading = useSession((s) => s.setLoading);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { user } = await api.get<{ user: PublicUser }>("/api/auth/me");
        if (!cancelled) setUser(user);
      } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 401) {
          console.error(e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser, setLoading]);

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dungeon" replace />} />
          <Route
            path="/dungeon"
            element={
              <RequireAuth>
                <Dungeon />
              </RequireAuth>
            }
          />
          <Route
            path="/combat/:nodeId"
            element={
              <RequireAuth>
                <Combat />
              </RequireAuth>
            }
          />
          <Route
            path="/shop"
            element={
              <RequireAuth>
                <Shop />
              </RequireAuth>
            }
          />
          <Route
            path="/inventory"
            element={
              <RequireAuth>
                <Inventory />
              </RequireAuth>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <RequireAuth>
                <Leaderboard />
              </RequireAuth>
            }
          />
          <Route
            path="/friends"
            element={
              <RequireAuth>
                <Friends />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="/profile/:username"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/dungeon" replace />} />
        </Routes>
      </main>
    </div>
  );
}
