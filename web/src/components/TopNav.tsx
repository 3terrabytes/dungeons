import { NavLink, useNavigate } from "react-router-dom";
import { useSession } from "../lib/store";
import { api } from "../lib/api";

const tabs = [
  { to: "/dungeon", label: "Dungeon" },
  { to: "/shop", label: "Shop" },
  { to: "/inventory", label: "Inventory" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/friends", label: "Friends" },
  { to: "/profile", label: "Profile" },
];

export function TopNav() {
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const navigate = useNavigate();

  async function logout() {
    await api.post("/api/auth/logout");
    setUser(null);
    navigate("/login");
  }

  if (!user) return null;

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <div className="font-semibold tracking-tight text-lg">Dungeons</div>
        <nav className="flex gap-1 flex-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800/60"
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400">Lv</span>
          <span className="font-semibold">{user.level}</span>
          <span className="text-amber-400 font-semibold">{user.gold}g</span>
          <span className="text-slate-300">{user.username}</span>
          <button onClick={logout} className="text-slate-400 hover:text-white text-xs">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
