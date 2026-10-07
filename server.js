const express = require('express');
const { createServer } = require('http');
const { Pool } = require('pg');
const { WebSocketServer, WebSocket } = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = createServer(app);
const port = Number(process.env.PORT || 10000);
const boardId = 'projeto-helios';
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'seed.json'), 'utf8'));

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não configurada. Crie o serviço pelo Blueprint do Render.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000
});

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public'), { etag: true, maxAge: '5m' }));

const wss = new WebSocketServer({ server, path: '/ws' });
function broadcast(tasks) {
  const message = JSON.stringify({ type: 'board', tasks });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  }
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS helios_boards (
      id TEXT PRIMARY KEY,
      tasks JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    `INSERT INTO helios_boards (id, tasks)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [boardId, JSON.stringify(seed)]
  );
}

app.get('/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true }); }
  catch { res.status(503).json({ ok: false }); }
});

app.get('/api/board', async (_req, res, next) => {
  try {
    const result = await pool.query('SELECT tasks, updated_at FROM helios_boards WHERE id = $1', [boardId]);
    res.set('Cache-Control', 'no-store');
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

app.put('/api/board', async (req, res, next) => {
  try {
    const tasks = req.body && req.body.tasks;
    if (!Array.isArray(tasks) || tasks.length > 2000) {
      return res.status(400).json({ error: 'Lista de atividades inválida.' });
    }
    const result = await pool.query(
      `UPDATE helios_boards
       SET tasks = $2::jsonb, updated_at = NOW()
       WHERE id = $1
       RETURNING tasks, updated_at`,
      [boardId, JSON.stringify(tasks)]
    );
    const board = result.rows[0];
    broadcast(board.tasks);
    res.json(board);
  } catch (error) { next(error); }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

wss.on('connection', async ws => {
  try {
    const result = await pool.query('SELECT tasks FROM helios_boards WHERE id = $1', [boardId]);
    ws.send(JSON.stringify({ type: 'board', tasks: result.rows[0].tasks }));
  } catch (error) { console.error(error); }
});

initializeDatabase()
  .then(() => server.listen(port, '0.0.0.0', () => console.log(`Projeto Helios ativo na porta ${port}`)))
  .catch(error => { console.error('Falha ao iniciar:', error); process.exit(1); });

process.on('SIGTERM', async () => {
  server.close(async () => { await pool.end(); process.exit(0); });
});
