
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

// --- 1. BASE DE DATOS: ESQUEMA COMPLETO ---
const initDB = async () => {
  try {
    // Pedidos activos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        agent_code TEXT,
        client_name TEXT,
        product_code TEXT,
        product_name TEXT,
        quantity NUMERIC DEFAULT 0,
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inventario físico acumulado
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        product_code TEXT PRIMARY KEY,
        stock_qty NUMERIC DEFAULT 0,
        last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Histórico para Estadísticas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_stats (
        id SERIAL PRIMARY KEY,
        log_date DATE DEFAULT CURRENT_DATE,
        total_units NUMERIC,
        client_count INTEGER,
        UNIQUE(log_date)
      )
    `);

    console.log('✅ PostgreSQL: Esquema de 3 tablas listo.');
  } catch (err) {
    console.error('❌ Error DB:', err);
  }
};
initDB();

// --- 2. SSE (TIEMPO REAL) ---
let clients = [];
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  clients.push(res);
  req.on('close', () => { clients = clients.filter(c => c !== res); });
});

const notify = (data) => clients.forEach(c => c.write(`data: ${JSON.stringify(data)}\n\n`));

// --- 3. ENDPOINTS ---

// Dashboard Principal
app.get('/api/data', async (req, res) => {
  try {
    const query = `
      SELECT o.*, COALESCE(i.stock_qty, 0) as stock_real
      FROM orders o
      LEFT JOIN inventory i ON o.product_code = i.product_code
      ORDER BY o.agent_code, o.product_name
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Datos Estadísticos
app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM daily_stats ORDER BY log_date DESC LIMIT 30');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Escáner
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Make Webhook
app.post('/api/webhook', async (req, res) => {
  const { zonas } = req.body;
  try {
    await pool.query('BEGIN');
    await pool.query('DELETE FROM orders');
    
    let totalUnits = 0;
    const clientSet = new Set();

    for (const z of zonas) {
      clientSet.add(z.codigo_agente);
      if (z.productos) {
        for (const p of z.productos) {
          totalUnits += Number(p.cantidad);
          await pool.query(
            'INSERT INTO orders (agent_code, client_name, product_code, product_name, quantity) VALUES ($1, $2, $3, $4, $5)',
            [z.codigo_agente, z.nombre_agente, String(p.codigo).toUpperCase(), p.nombre || 'Producto', p.cantidad]
          );
        }
      }
    }

    // Actualizar histórico diario
    await pool.query(`
      INSERT INTO daily_stats (log_date, total_units, client_count)
      VALUES (CURRENT_DATE, $1, $2)
      ON CONFLICT (log_date) DO UPDATE SET 
        total_units = EXCLUDED.total_units,
        client_count = EXCLUDED.client_count
    `, [totalUnits, clientSet.size]);

    await pool.query('COMMIT');
    notify({ type: 'update' });
    res.json({ status: 'orders_and_stats_updated' });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🔥 Servidor corriendo en puerto ${PORT}`));
