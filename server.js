
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar MIME types para archivos TSX
if (express.static.mime && express.static.mime.define) {
    express.static.mime.define({'application/javascript': ['ts', 'tsx']});
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// MIDDLEWARES CRÍTICOS
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

const CLIENT_MAPPING = {
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
    console.log('✅ Postgres Engine V6: Tablas Listas');
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
    await pool.query('DELETE FROM orders');
    
    let totalUnidades = 0;
    const agentesActivos = new Set();

    for (const zona of zonas) {
      const agentCode = String(zona.codigo_agente || '0');
      const clientName = CLIENT_MAPPING[agentCode] || zona.nombre_agente || `ZONA ${agentCode}`;
      agentesActivos.add(clientName);

      if (zona.productos && Array.isArray(zona.productos)) {
        for (const p of zona.productos) {
          const qty = Number(p.cantidad) || 0;
          const pName = p.nombre || zona.nombre || 'PRODUCTO';
          totalUnidades += qty;
          
          await pool.query(
            `INSERT INTO orders (agent_code, client_name, product_code, product_name, quantity) 
             VALUES ($1, $2, $3, $4, $5)`,
            [agentCode, clientName, String(p.codigo).toUpperCase(), pName, qty]
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
    `, [totalUnidades, agentesActivos.size]);

    await pool.query('COMMIT');
    notify({ type: 'update' });
    res.json({ status: 'success', total: totalUnidades });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/data', async (req, res) => {
  try {
    const query = `
      SELECT 
        o.client_name as name,
        o.agent_code as code,
        json_agg(json_build_object(
          'codigo', o.product_code,
          'nombre', o.product_name,
          'cantidad', o.quantity,
          'stock', COALESCE(i.stock_qty, 0)
        ) ORDER BY o.product_name) as products
      FROM orders o
      LEFT JOIN inventory i ON o.product_code = i.product_code
      GROUP BY o.client_name, o.agent_code
      ORDER BY 
        CASE WHEN o.client_name = 'GRAN CANARIA' THEN 0 ELSE 1 END,
        o.client_name ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM daily_stats ORDER BY log_date DESC LIMIT 30');
    res.json(result.rows);
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

// SERVIR ARCHIVOS ESTÁTICOS - ESTO ARREGLA EL "CANNOT GET /"
app.use(express.static(__dirname));

app.listen(PORT, () => console.log(`🚀 Engine V6 Operativo en puerto ${PORT}`));
