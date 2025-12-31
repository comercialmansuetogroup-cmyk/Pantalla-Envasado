
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// --- 1. ESQUEMA DE BASE DE DATOS PROFESIONAL ---
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        agent_code TEXT,
        client_name TEXT,
        product_code TEXT,
        product_name TEXT,
        quantity NUMERIC DEFAULT 0,
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS inventory (
        product_code TEXT PRIMARY KEY,
        stock_qty NUMERIC DEFAULT 0,
        last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS daily_stats (
        id SERIAL PRIMARY KEY,
        log_date DATE UNIQUE DEFAULT CURRENT_DATE,
        total_units NUMERIC DEFAULT 0,
        client_count INTEGER DEFAULT 0
      );
    `);
    console.log('✅ Base de datos sincronizada.');
  } catch (err) {
    console.error('❌ Error DB:', err);
  }
};
initDB();

// --- 2. TIEMPO REAL (SSE) ---
let clients = [];
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  clients.push(res);
  req.on('close', () => clients = clients.filter(c => c !== res));
});
const notify = (data) => clients.forEach(c => c.write(`data: ${JSON.stringify(data)}\n\n`));

// --- 3. ENDPOINTS API ---

// Obtener datos agrupados por cliente (Lógica en SQL)
app.get('/api/data', async (req, res) => {
  try {
    const query = `
      SELECT 
        o.agent_code, 
        o.client_name,
        json_agg(json_build_object(
          'codigo', o.product_code,
          'nombre', o.product_name,
          'cantidad', o.quantity,
          'stock', COALESCE(i.stock_qty, 0)
        ) ORDER BY o.product_name) as products
      FROM orders o
      LEFT JOIN inventory i ON o.product_code = i.product_code
      GROUP BY o.agent_code, o.client_name
      ORDER BY o.agent_code ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM daily_stats ORDER BY log_date DESC LIMIT 30');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint del Escáner (Suma al inventario persistente)
app.post('/api/scan', async (req, res) => {
  const { codigo, cantidad } = req.body;
  try {
    await pool.query(`
      INSERT INTO inventory (product_code, stock_qty) 
      VALUES ($1, $2)
      ON CONFLICT (product_code) DO UPDATE SET stock_qty = inventory.stock_qty + EXCLUDED.stock_qty
    `, [String(codigo).toUpperCase(), Number(cantidad)]);
    notify({ type: 'update', updatedCode: codigo });
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook de Make (Actualiza pedidos y estadísticas)
app.post('/api/webhook', async (req, res) => {
  const { zonas } = req.body;
  try {
    await pool.query('BEGIN');
    await pool.query('DELETE FROM orders');
    
    let dailyTotal = 0;
    const agents = new Set();

    for (const z of zonas) {
      agents.add(z.codigo_agente);
      if (z.productos) {
        for (const p of z.productos) {
          dailyTotal += Number(p.cantidad);
          await pool.query(
            'INSERT INTO orders (agent_code, client_name, product_code, product_name, quantity) VALUES ($1, $2, $3, $4, $5)',
            [z.codigo_agente, z.nombre_agente, String(p.codigo).toUpperCase(), p.nombre || 'Producto', p.cantidad]
          );
        }
      }
    }

    await pool.query(`
      INSERT INTO daily_stats (log_date, total_units, client_count)
      VALUES (CURRENT_DATE, $1, $2)
      ON CONFLICT (log_date) DO UPDATE SET 
        total_units = EXCLUDED.total_units,
        client_count = EXCLUDED.client_count
    `, [dailyTotal, agents.size]);

    await pool.query('COMMIT');
    notify({ type: 'update' });
    res.json({ status: 'sincronizado' });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
