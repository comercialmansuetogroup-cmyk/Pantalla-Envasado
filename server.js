
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
    console.log('⚠️ [SYSTEM] Running without Database Connection (Memory Mode - Data will not persist)');
    return;
  }
  try {
    const client = await pool.connect();
    try {
      console.log('🔄 [DB] Syncing Tables...');
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
      console.log('✅ [DB] Connected & Synced Successfully');
    } finally {
      client.release();
    }
  } catch (err) { console.error('❌ [DB] Connection Error:', err.message); }
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

const notifyClients = (updatedCode, type = 'update') => {
  clients.forEach(c => c.res.write(`data: ${JSON.stringify({type, code: updatedCode})}\n\n`));
};

// --- API ENDPOINTS ---

// 1. WEBHOOK: Entrada de NUEVOS PEDIDOS (Make)
app.post('/api/webhook', async (req, res) => {
  const { zonas } = req.body;
  
  if (!zonas || !Array.isArray(zonas)) {
    console.error('❌ [WEBHOOK] Invalid Body:', req.body);
    return res.status(400).json({ error: 'Invalid data format' });
  }

  if (!process.env.DATABASE_URL) {
    notifyClients('TEST-CODE');
    return res.json({ ok: true, mode: 'no-db' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let lastCode = null;
    let count = 0;
    let updatedCount = 0;

    for (const z of zonas) {
      const code = String(z.codigo_agente || '0').trim();
      const name = z.nombre_agente || 'DESCONOCIDO';
      const topLevelProductName = z.nombre || 'PRODUCTO';

      if (z.productos && Array.isArray(z.productos)) {
        for (const p of z.productos) {
          lastCode = String(p.codigo).toUpperCase().trim();
          const qty = Number(p.cantidad) || 0;
          const finalProductName = p.nombre || topLevelProductName;

          if (qty > 0) {
            const checkRes = await client.query(
              `SELECT id FROM orders 
               WHERE agent_code = $1 
               AND product_code = $2 
               AND received_at::DATE = CURRENT_DATE`,
              [code, lastCode]
            );

            if (checkRes.rows.length > 0) {
              await client.query(
                `UPDATE orders 
                 SET quantity = $1, product_name = $2, agent_name = $3
                 WHERE id = $4`,
                [qty, finalProductName, name, checkRes.rows[0].id]
              );
              updatedCount++;
            } else {
              await client.query(
                `INSERT INTO orders (agent_code, agent_name, product_code, product_name, quantity) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [code, name, lastCode, finalProductName, qty]
              );
              count++;
            }
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log(`✅ [WEBHOOK] Procesado. Insertados: ${count}, Actualizados: ${updatedCount}.`);
    notifyClients(lastCode, 'order');
    res.json({ ok: true, inserted: count, updated: updatedCount });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [WEBHOOK] Transaction Failed:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 2. SCAN: Entrada de PRODUCCIÓN (App Envasado)
app.post('/api/scan', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer DASHBOARD_V3_KEY_2025') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { codigo, cantidad } = req.body;
  if (!codigo || !cantidad) {
    return res.status(400).json({ error: 'Faltan datos: codigo o cantidad' });
  }

  if (!process.env.DATABASE_URL) {
    notifyClients(codigo, 'scan');
    return res.json({ ok: true, mode: 'no-db', message: 'Simulado' });
  }

  const client = await pool.connect();
  try {
    const qtyNum = Number(cantidad);
    const codeStr = String(codigo).toUpperCase().trim();

    await client.query(
      `INSERT INTO inventory (product_code, stock_qty) 
       VALUES ($1, $2)
       ON CONFLICT (product_code) 
       DO UPDATE SET stock_qty = inventory.stock_qty + $2`,
      [codeStr, qtyNum]
    );

    console.log(`✅ [SCAN] Stock Updated: ${codeStr} +${qtyNum}`);
    notifyClients(codeStr, 'scan');
    
    res.json({ ok: true, updated: codeStr, qty: qtyNum });
  } catch (err) {
    console.error('❌ [SCAN] DB Error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 3. GET DATA: Modificado para devolver TOTAL HOY y TOTAL AYER
app.get('/api/data', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json([]);
  try {
    // Obtenemos datos de HOY y de AYER en la misma consulta usando CASE WHEN
    const result = await pool.query(`
      SELECT 
        o.agent_code, 
        o.agent_name, 
        o.product_code, 
        o.product_name, 
        SUM(CASE WHEN o.received_at::DATE = CURRENT_DATE THEN o.quantity ELSE 0 END) as total_qty,
        SUM(CASE WHEN o.received_at::DATE = CURRENT_DATE - INTERVAL '1 day' THEN o.quantity ELSE 0 END) as yesterday_qty,
        COALESCE(MAX(i.stock_qty), 0) as global_stock
      FROM orders o
      LEFT JOIN inventory i ON o.product_code = i.product_code
      WHERE o.received_at::DATE >= CURRENT_DATE - INTERVAL '1 day'
      GROUP BY o.agent_code, o.agent_name, o.product_code, o.product_name
      ORDER BY o.agent_code ASC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('❌ [DATA] Error fetching:', err.message);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.get('/api/history', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json([]);
  const { period } = req.query; 
  let truncType = 'week', limit = 4, interval = '1 month';

  switch (period) {
    case 'week': truncType = 'week'; limit = 5; interval = '2 month'; break;
    case 'month': truncType = 'month'; limit = 12; interval = '1 year'; break;
    case 'quarter': truncType = 'quarter'; limit = 5; interval = '2 year'; break;
    case 'year': truncType = 'year'; limit = 5; interval = '5 year'; break;
    default: truncType = 'week'; limit = 5; interval = '2 month';
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
    
    const formatted = result.rows.map(row => {
      const d = new Date(row.date_period);
      let label = '';
      if (period === 'week') {
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
      return { date: label, fullDate: row.date_period, produccion: Number(row.total_qty) };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'History query failed' });
  }
});

app.post('/api/reset', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json({ ok: true });
  try {
    await pool.query('DELETE FROM orders; DELETE FROM inventory;');
    notifyClients('RESET');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
