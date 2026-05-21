import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ENV } from "./env.js";
import { runMigrations } from "./db/migrate.js";
import { attachSession, requireAuth } from "./auth/session.js";
import { authRouter } from "./auth/routes.js";
import { runRouter } from "./game/run.js";
import { fightRouter } from "./game/combat.js";
import { shopRouter } from "./shop/routes.js";
import { friendsRouter } from "./social/friends.js";
import { leaderboardRouter, profileRouter } from "./social/leaderboard.js";
import { inventoryRouter } from "./game/inventory.js";

async function main() {
  await runMigrations();
  const app = express();
  app.use(express.json({ limit: "64kb" }));
  app.use(cookieParser());
  app.use(
    cors({
      origin: ENV.WEB_ORIGIN,
      credentials: true,
    })
  );
  app.use(attachSession);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRouter);

  app.use("/api/run", requireAuth, runRouter);
  app.use("/api/fight", requireAuth, fightRouter);
  app.use("/api/shop", requireAuth, shopRouter);
  app.use("/api/inventory", requireAuth, inventoryRouter);
  app.use("/api/friends", requireAuth, friendsRouter);
  app.use("/api/leaderboard", leaderboardRouter);
  app.use("/api/profile", profileRouter);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[error]", err);
    res.status(err.status || 500).json({ error: err.message || "internal" });
  });

  app.listen(ENV.PORT, () => {
    console.log(`[api] listening on :${ENV.PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
