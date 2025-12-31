
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8080;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// MIGRACIÓN DEFINITIVA V11
const initDB = async () => {
  try {
    // Asegurar tabla base
    await pool.query(`
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

    // Corregir columnas si el usuario viene de versiones antiguas
    await pool.query(`
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='client_name') THEN
          ALTER TABLE orders RENAME COLUMN client_name TO agent_name;
        END IF;
      END $$;
    `);

    console.log('✅ Base de Datos V11: Lista');
  } catch (err) { console.error('❌ Error DB:', err); }
};
initDB();

let clients = [];
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  clients.push(res);
  req.on('close', () => clients = clients.filter(c => c !== res));
});
const notify = () => clients.forEach(c => c.write(`data: update\n\n`));

app.post('/api/webhook', async (req, res) => {
  const { zonas } = req.body;
  if (!zonas) return res.status(400).send('No data');
  try {
    await pool.query('BEGIN');
    for (const z of zonas) {
      const code = String(z.codigo_agente || '0');
      const name = z.nombre_agente || 'DESCONOCIDO';
      if (z.productos) {
        for (const p of z.productos) {
          await pool.query(
            `INSERT INTO orders (agent_code, agent_name, product_code, product_name, quantity) 
             VALUES ($1, $2, $3, $4, $5)`,
            [code, name, String(p.codigo).toUpperCase(), z.nombre || 'PRODUCTO', Number(p.cantidad) || 0]
          );
        }
      }
    }
    await pool.query('COMMIT');
    notify();
    res.json({ ok: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/data', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.agent_code, 
        o.agent_name, 
        o.product_code, 
        o.product_name, 
        SUM(o.quantity) as total_qty,
        COALESCE(i.stock_qty, 0) as stock
      FROM orders o
      LEFT JOIN inventory i ON o.product_code = i.product_code
      GROUP BY o.agent_code, o.agent_name, o.product_code, o.product_name, i.stock_qty
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reset', async (req, res) => {
  await pool.query('DELETE FROM orders');
  notify();
  res.json({ ok: true });
});

app.use(express.static(__dirname));
app.listen(PORT, () => console.log(`🚀 Servidor V11 en puerto ${PORT}`));
