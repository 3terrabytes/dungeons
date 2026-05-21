# Dungeons

A browser-based dungeon crawler. Sign in, choose your path through a branching map, fight enemies in real-time twitch combat, earn XP and gold, equip items across eight slots, buy gear in the shop, befriend other players, and climb the leaderboard.

## Stack

- **Web** — Vite + React + Tailwind + Zustand + React Router. Canvas-rendered combat.
- **API** — Node + Express + `pg` + `bcrypt` + `jose` (JWT) + `zod`. Server-authoritative gold/XP.
- **DB** — Neon Postgres (free tier works).
- **Deploy** — Render Blueprint (`render.yaml`) provisions two services.

Monorepo via npm workspaces: `shared/`, `api/`, `web/`.

## Quick start (local)

Requires Node 20+ and a Neon database (or any Postgres).

```bash
npm install
cp .env.example api/.env       # fill in DATABASE_URL and SESSION_SECRET
cp .env.example web/.env       # set VITE_API_BASE (default http://localhost:4000 works)
npm run migrate                # apply SQL migrations
npm run dev                    # boots api on :4000 and web on :5173
```

Visit http://localhost:5173 to play.

## Deploying

1. Create a Neon project and copy the **pooled** connection string.
2. Push this repo to GitHub.
3. In Render, click **New + → Blueprint** and pick the repo. Render reads `render.yaml`.
4. After both services exist:
   - On `dungeons-api`, set `DATABASE_URL` (Neon string) and `WEB_ORIGIN` (the URL Render gave `dungeons-web`).
   - On `dungeons-web`, set `VITE_API_BASE` (the URL Render gave `dungeons-api`).
5. Manual deploy both services. The API runs migrations on every boot (idempotent).

## Game loop

- **Dungeon** — top-down branching map (Slay-the-Spire style), 5 floors, boss at the top.
- **Combat** — real-time canvas fight. WASD to move, mouse to aim, left-click to attack.
- **Shop** — six rarity-weighted items, refreshes every 30 minutes or 50g.
- **Inventory** — equip one item per slot: Weapon, Off-hand, Armour, Helmet, Boots, Ring, Amulet, Banner.
- **Friends** — search by username, send requests, view friend profiles + loadouts.
- **Leaderboard** — global and friends-only, sorted by total XP.

## Anti-cheat

Combat is client-simulated for responsiveness, but rewards are server-authoritative. On fight start the server records the player's max DPS and the enemy HP. On fight end it rejects results that completed faster than physically possible. Gold and XP are computed from the enemy row on the server, never trusted from the client.

## Project layout

```
shared/   types + game content (items, moves, enemies, dungeons)
api/      Express + Postgres
web/      Vite + React
render.yaml
```
