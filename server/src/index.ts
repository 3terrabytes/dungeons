import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import savesRouter from './routes/saves.js';
import { runMigrations } from './db.js';

const PORT = Number(process.env.PORT ?? 3000);
const ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
app.set('trust proxy', 1); // Render is behind a proxy
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => { res.json({ ok: true }); });

app.use('/api/auth', authRouter);
app.use('/api', profileRouter);
app.use('/api', savesRouter);

// Generic error handler — keeps stack traces out of responses
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

async function start(): Promise<void> {
  try {
    await runMigrations();
  } catch (e) {
    console.error('[db] migration failed', e);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`[server] listening on :${PORT}, allowing origin ${ORIGIN}`);
  });
}

void start();
