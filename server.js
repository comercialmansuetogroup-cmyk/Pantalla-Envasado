
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

// MAPPING DE UNIFICACIÓN (Solo para visualización)
const AGENT_TO_CLIENT_MAP = {
  '24': 'FILIPPO',
  '26': 'PINGÜINO',
  '23': 'LA PALMA',
  '15': 'TENERIFE NORTE',
  '10': 'GRAN CANARIA',
  '14': 'GRAN CANARIA',
  '5': 'GRAN CANARIA',
  '0': 'GRAN CANARIA'
};

const initDB = async () => {
  try {
    // Tabla de Pedidos (Pura, sin agrupaciones forzadas)
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
    console.log('✅ Postgres Engine V7: Tablas Robustas Listas');
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

// WEBHOOK: RECIBE REGISTROS PUROS
app.post('/api/webhook', async (req, res) => {
  const { zonas } = req.body;
  if (!zonas || !Array.isArray(zonas)) return res.status(400).send('Formato inválido');

  try {
    await pool.query('BEGIN');
    
    // IMPORTANTE: Ya no borramos todo al inicio. 
    // Si quieres limpiar el día, podrías llamar a un endpoint /api/reset
    
    for (const zona of zonas) {
      const agentCode = String(zona.codigo_agente || '0');
      const agentName = zona.nombre_agente || 'DESCONOCIDO';

      if (zona.productos && Array.isArray(zona.productos)) {
        for (const p of zona.productos) {
          const pCode = String(p.codigo).toUpperCase();
          const pName = zona.nombre || 'PRODUCTO';
          const qty = Number(p.cantidad) || 0;

          // Insertar registro puro
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
    res.status(500).json({ error: err.message });
  }
});

// GET DATA: EL CEREBRO DE LA AGRUPACIÓN
app.get('/api/data', async (req, res) => {
  try {
    // Esta consulta agrupa por el mapeo de agentes (0,10,14,5 -> Gran Canaria)
    // y suma las cantidades de los registros puros.
    const query = `
      WITH mapped_orders AS (
        SELECT 
          CASE 
            WHEN agent_code IN ('0', '5', '10', '14') THEN 'GRAN CANARIA'
            WHEN agent_code = '24' THEN 'FILIPPO'
            WHEN agent_code = '26' THEN 'PINGÜINO'
            WHEN agent_code = '23' THEN 'LA PALMA'
            WHEN agent_code = '15' THEN 'TENERIFE NORTE'
            ELSE agent_name 
          END as display_client_name,
          agent_code,
          product_code,
          product_name,
          quantity
        FROM orders
        WHERE received_at >= CURRENT_DATE -- Opcional: solo ver hoy
      )
      SELECT 
        display_client_name as name,
        string_agg(DISTINCT agent_code, ', ') as code,
        json_agg(json_build_object(
          'codigo', product_code,
          'nombre', product_name,
          'cantidad', total_qty,
          'stock', COALESCE(stock_qty, 0)
        )) as products
      FROM (
        SELECT 
          display_client_name,
          agent_code,
          product_code,
          product_name,
          SUM(quantity) as total_qty
        FROM mapped_orders
        GROUP BY display_client_name, agent_code, product_code, product_name
      ) sub
      LEFT JOIN inventory i ON sub.product_code = i.product_code
      GROUP BY display_client_name
      ORDER BY 
        CASE WHEN display_client_name = 'GRAN CANARIA' THEN 0 ELSE 1 END,
        display_client_name ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Limpiar pedidos (Para empezar el turno de cero)
app.post('/api/reset', async (req, res) => {
  try {
    await pool.query('DELETE FROM orders');
    notify({ type: 'update' });
    res.json({ status: 'reset ok' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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

app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM daily_stats ORDER BY log_date DESC LIMIT 30');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use(express.static(__dirname));

app.listen(PORT, () => console.log(`🚀 Engine V7 (Pure Records) Operativo en ${PORT}`));
