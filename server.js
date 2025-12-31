
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuración de conexión DB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Inicialización DB
const initDB = async () => {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ Running without Database Connection (Memory Mode)');
    return;
  }
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          agent_code TEXT,
          agent_name TEXT,
          product_code TEXT,
          product_name TEXT,
          quantity NUMERIC DEFAULT 0,
          received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS inventory (
          product_code TEXT PRIMARY KEY,
          stock_qty NUMERIC DEFAULT 0
        );
      `);
      console.log('✅ DB Connected & Synced');
    } finally {
      client.release();
    }
  } catch (err) { console.error('❌ DB Connection Error:', err.message); }
};
initDB();

// --- SSE SYSTEM ---
let clients = [];

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); 

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);

  res.write(': connected\n\n');

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
});

setInterval(() => {
  clients.forEach(c => c.res.write(': keepalive\n\n'));
}, 30000);

const notifyClients = (updatedCode) => {
  clients.forEach(c => c.res.write(`data: ${JSON.stringify({type:'update', code: updatedCode})}\n\n`));
};

// --- API ENDPOINTS ---

app.post('/api/webhook', async (req, res) => {
  const { zonas } = req.body;
  if (!zonas || !Array.isArray(zonas)) return res.status(400).json({ error: 'Invalid data format' });

  // Modo sin DB para pruebas
  if (!process.env.DATABASE_URL) {
    notifyClients('TEST-CODE');
    return res.json({ ok: true, mode: 'no-db' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let lastCode = null;
    for (const z of zonas) {
      const code = String(z.codigo_agente || '0');
      const name = z.nombre_agente || 'DESCONOCIDO';
      if (z.productos) {
        for (const p of z.productos) {
          lastCode = String(p.codigo).toUpperCase();
          await client.query(
            `INSERT INTO orders (agent_code, agent_name, product_code, product_name, quantity) 
             VALUES ($1, $2, $3, $4, $5)`,
            [code, name, lastCode, z.nombre || 'PRODUCTO', Number(p.cantidad) || 0]
          );
        }
      }
    }
    await client.query('COMMIT');
    notifyClients(lastCode);
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/data', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json([]);
  try {
    const result = await pool.query(`
      SELECT 
        o.agent_code, o.agent_name, o.product_code, o.product_name, 
        SUM(o.quantity) as total_qty, COALESCE(MAX(i.stock_qty), 0) as stock
      FROM orders o
      LEFT JOIN inventory i ON o.product_code = i.product_code
      GROUP BY o.agent_code, o.agent_name, o.product_code, o.product_name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database query failed', details: err.message });
  }
});

app.post('/api/reset', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json({ ok: true });
  try {
    await pool.query('DELETE FROM orders');
    notifyClients('RESET');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// IMPORTANTE: En producción servimos la carpeta dist construida por Vite
// En desarrollo, Vite se encarga del frontend en otro puerto
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
