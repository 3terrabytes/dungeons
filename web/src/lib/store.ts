import { create } from "zustand";
import type { PublicUser } from "@dungeons/shared";

interface Session {
  user: PublicUser | null;
  loading: boolean;
  setUser: (u: PublicUser | null) => void;
  setLoading: (b: boolean) => void;
}

export const useSession = create<Session>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
}));
