
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

// NUEVO ENDPOINT: Histórico Agregado
app.get('/api/history', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json([]);
  const { period } = req.query; // week, month, quarter, year

  let truncType = 'week';
  let limit = 4;
  let interval = '1 month'; // fallback

  // Definir la lógica de agrupación SQL según el filtro
  switch (period) {
    case 'week':
      truncType = 'week';
      limit = 5; // Últimas 5 semanas
      interval = '2 month'; 
      break;
    case 'month':
      truncType = 'month';
      limit = 12; // Últimos 12 meses
      interval = '1 year';
      break;
    case 'quarter':
      truncType = 'quarter';
      limit = 5; // Últimos 5 trimestres
      interval = '2 year';
      break;
    case 'year':
      truncType = 'year';
      limit = 5; // Últimos 5 años
      interval = '5 year';
      break;
    default: // week por defecto
      truncType = 'week';
      limit = 5;
      interval = '2 month';
  }

  try {
    const query = `
      SELECT 
        DATE_TRUNC($1, received_at) as date_period,
        SUM(quantity) as total_qty
      FROM orders 
      WHERE received_at >= NOW() - $2::INTERVAL
      GROUP BY date_period
      ORDER BY date_period ASC
      LIMIT $3
    `;
    
    const result = await pool.query(query, [truncType, interval, limit]);
    
    // Formatear fechas para el frontend
    const formatted = result.rows.map(row => {
      const d = new Date(row.date_period);
      let label = '';
      
      if (period === 'week') {
         // Obtener número de semana
         const onejan = new Date(d.getFullYear(), 0, 1);
         const weekNum = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
         label = `S${weekNum}`;
      } else if (period === 'month') {
         label = d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
      } else if (period === 'quarter') {
         const q = Math.floor((d.getMonth() + 3) / 3);
         label = `Q${q} ${d.getFullYear().toString().substr(-2)}`;
      } else {
         label = d.getFullYear().toString();
      }

      return {
        date: label,
        fullDate: row.date_period,
        produccion: Number(row.total_qty)
      };
    });

    res.json(formatted);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'History query failed', details: err.message });
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
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
