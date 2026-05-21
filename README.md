# Dungeon Crawler

A 2D top-down pixel-art roguelite dungeon crawler that runs in the browser.
Built with **Phaser 3 + TypeScript + Vite** on the client, and **Node/Express + Postgres** on the server for account sign-in and meta-progression.

## Features (MVP)

- Procedurally generated dungeon floors (rooms + corridors)
- Real-time combat: melee (space) and ranged (click-to-shoot)
- Three enemy types: melee grunts, ranged shooters, and a floor boss with attack patterns
- XP orbs and gold coins with magnet pull
- Auto level-up with stat scaling
- Between-floor shop: weapons, armor, boots, potions, permanent boosts
- Layered sprite equipment (weapon/armor/hat visibly change the avatar)
- Account sign-in; gold and permanent boosts persist server-side

## Repository Layout

```
.
├── client/   # Phaser game (static site)
├── server/   # Express API (web service)
└── render.yaml
```

## Local Development

Requires Node 20+ and a local Postgres (or use Docker — see below).

```bash
# 1. Install
npm install

# 2. Configure server env (server/.env)
cp server/.env.example server/.env
# Edit DATABASE_URL and JWT_SECRET

# 3. Run migrations (auto-runs on server start, or manually)
npm run migrate -w server

# 4. Start both apps
npm run dev
# Client:  http://localhost:5173
# Server:  http://localhost:3000
```

### Docker Postgres

```bash
docker run --name dungeon-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=dungeon -p 5432:5432 -d postgres:16
# DATABASE_URL=postgres://postgres:dev@localhost:5432/dungeon
```

## Controls

| Key | Action |
|---|---|
| WASD / Arrows | Move |
| Mouse | Aim |
| Left Click | Ranged attack |
| Space | Melee attack |
| Q | Use health potion |
| E | Interact / enter shop |
| Esc | Pause / inventory |

## Deploying to Render

1. Push this repo to GitHub.
2. In the Render dashboard: **New +** → **Blueprint** → connect your GitHub repo.
3. Render reads `render.yaml` and provisions:
   - `dungeon-db` (Postgres, free tier)
   - `dungeon-api` (Node web service, free tier)
   - `dungeon-crawler` (static site, free tier)
4. After the first deploy, update the `CLIENT_ORIGIN` env var on `dungeon-api` and the `VITE_API_URL` env var on `dungeon-crawler` if the auto-generated URLs differ from the defaults in `render.yaml`.

**Free tier note:** The API web service sleeps after 15 minutes of inactivity. First request after sleep takes ~30s — the login screen handles this with a friendly retry.

## Tech Stack

| Layer | Tech |
|---|---|
| Game | Phaser 3 |
| Build | Vite |
| Language | TypeScript |
| Server | Express |
| DB | Postgres |
| Auth | bcrypt + JWT (httpOnly cookie) |
| Host | Render (static site + web service + managed Postgres) |

## License

MIT
