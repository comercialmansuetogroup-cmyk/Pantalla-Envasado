
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

if (express.static.mime && express.static.mime.define) {
    express.static.mime.define({'application/javascript': ['ts', 'tsx']});
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

const initDB = async () => {
  try {
    // 1. Crear tablas básicas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        agent_code TEXT,
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

    // 2. MIGRACIÓN CRÍTICA: Asegurar que existe agent_name o usar client_name como fallback
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='agent_name') THEN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='client_name') THEN
            ALTER TABLE orders RENAME COLUMN client_name TO agent_name;
          ELSE
            ALTER TABLE orders ADD COLUMN agent_name TEXT;
          END IF;
        END IF;
      END $$;
    `);

    console.log('✅ Postgres Engine V9: Sistema de Migración Activo');
  } catch (err) { console.error('❌ DB Error:', err); }
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
const notify = (data) => clients.forEach(c => c.write(`data: ${JSON.stringify(data)}\n\n`));

app.post('/api/webhook', async (req, res) => {
  const { zonas } = req.body;
  if (!zonas || !Array.isArray(zonas)) return res.status(400).send('Formato inválido');

  try {
    await pool.query('BEGIN');
    for (const zona of zonas) {
      const agentCode = String(zona.codigo_agente || '0');
      const agentName = zona.nombre_agente || 'DESCONOCIDO';

      if (zona.productos && Array.isArray(zona.productos)) {
        for (const p of zona.productos) {
          const pCode = String(p.codigo).toUpperCase();
          const pName = zona.nombre || 'PRODUCTO';
          const qty = Number(p.cantidad) || 0;

          await pool.query(
            `INSERT INTO orders (agent_code, agent_name, product_code, product_name, quantity) 
             VALUES ($1, $2, $3, $4, $5)`,
            [agentCode, agentName, pCode, pName, qty]
          );
        }
      }
    }
    await pool.query('COMMIT');
    notify({ type: 'update' });
    res.json({ status: 'success' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("WEBHOOK ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/data', async (req, res) => {
  try {
    const query = `
      SELECT 
        name,
        string_agg(DISTINCT agent_code, ', ') as code,
        json_agg(json_build_object(
          'codigo', product_code,
          'nombre', product_name,
          'cantidad', total_qty,
          'stock', stock_val
        ) ORDER BY product_name) as products
      FROM (
        SELECT 
          CASE 
            WHEN agent_code IN ('0', '5', '10', '14') THEN 'GRAN CANARIA'
            WHEN agent_code = '24' THEN 'FILIPPO'
            WHEN agent_code = '26' THEN 'PINGÜINO'
            WHEN agent_code = '23' THEN 'LA PALMA'
            WHEN agent_code = '15' THEN 'TENERIFE NORTE'
            ELSE COALESCE(agent_name, 'AGENTE ' || agent_code)
          END as name,
          agent_code,
          product_code,
          MAX(product_name) as product_name,
          SUM(quantity) as total_qty,
          COALESCE(MAX(i.stock_qty), 0) as stock_val
        FROM orders o
        LEFT JOIN inventory i ON o.product_code = i.product_code
        GROUP BY 1, 2, 3
      ) sub
      GROUP BY name
      ORDER BY 
        CASE WHEN name = 'GRAN CANARIA' THEN 0 ELSE 1 END,
        name ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows || []);
  } catch (err) { 
    console.error("SQL ERROR:", err);
    res.status(500).json({ error: err.message }); 
  }
});

app.post('/api/reset', async (req, res) => {
  try {
    await pool.query('DELETE FROM orders');
    notify({ type: 'update' });
    res.json({ status: 'ok' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use(express.static(__dirname));
app.listen(PORT, () => console.log(`🚀 Server V9 Ready on ${PORT}`));
