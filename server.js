
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
      console.log('✅ [DB] System Ready.');
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

app.post('/api/webhook', async (req, res) => {
  // 1. SEGURIDAD: Validación estricta del Token
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer DASHBOARD_V3_KEY_2025') {
    console.warn('⛔ [SECURITY] Intento de acceso no autorizado al Webhook');
    return res.status(401).json({ error: 'Unauthorized: Invalid Token' });
  }

  const { zonas } = req.body;
  
  // 2. VALIDACIÓN JSON
  if (!zonas || !Array.isArray(zonas)) {
    console.error('❌ [WEBHOOK] Invalid Body Format');
    return res.status(400).json({ error: 'Invalid JSON format' });
  }

  if (!process.env.DATABASE_URL) {
    notifyClients('TEST-CODE');
    return res.json({ ok: true, mode: 'no-db' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let lastCode = null;
    let countUpsert = 0;
    
    // Iteramos por cada objeto "zona" que envía Make.
    for (const z of zonas) {
      
      const agentCode = String(z.codigo_agente ?? '0').trim(); 
      const agentName = String(z.nombre_agente || 'DESCONOCIDO').toUpperCase();
      
      // CRÍTICO: El nombre del producto viene en z.nombre según tu estructura JSON
      const prodName = String(z.nombre || 'PRODUCTO').trim().toUpperCase();
      
      // Lista para rastrear productos en este paquete
      const incomingProductCodes = [];

      if (z.productos && Array.isArray(z.productos)) {
        for (const p of z.productos) {
          
          let prodCode = String(p.codigo || '').trim().toUpperCase();
          const qty = Math.floor(Number(p.cantidad) || 0);
          const stockFisico = Number(p.stock_fisico); // Capturamos stock si viene

          // LÓGICA DE RECUPERACIÓN DE CÓDIGO
          // Si el código viene vacío (típico en Make), usamos el NOMBRE como identificador único.
          if (prodCode === '' || prodCode === 'UNKNOWN') {
             prodCode = prodName; 
          }
          
          lastCode = prodCode;
          incomingProductCodes.push(prodCode);

          if (qty >= 0) {
            
            // A. ACTUALIZAR PEDIDOS (Upsert)
            const updateResult = await client.query(
               `UPDATE orders 
                SET quantity = $1, product_name = $2, agent_name = $5
                WHERE agent_code = $3 
                  AND product_code = $4 
                  AND received_at::DATE = CURRENT_DATE`,
               [qty, prodName, agentCode, prodCode, agentName]
            );

            if (updateResult.rowCount === 0 && qty > 0) {
              await client.query(
                `INSERT INTO orders (agent_code, agent_name, product_code, product_name, quantity) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [agentCode, agentName, prodCode, prodName, qty]
              );
            }

            // B. ACTUALIZAR STOCK (Si viene en el JSON)
            if (!isNaN(stockFisico)) {
               await client.query(
                 `INSERT INTO inventory (product_code, stock_qty) 
                  VALUES ($1, $2)
                  ON CONFLICT (product_code) 
                  DO UPDATE SET stock_qty = $2`,
                 [prodCode, stockFisico]
               );
            }

            countUpsert++;
          }
        }
      }

      // 3. CLEANUP: ELIMINAR LÍNEAS HUÉRFANAS
      if (incomingProductCodes.length > 0) {
          const placeholders = incomingProductCodes.map((_, i) => `$${i + 2}`).join(',');
          await client.query(
            `DELETE FROM orders 
             WHERE agent_code = $1 
               AND received_at::DATE = CURRENT_DATE
               AND product_code NOT IN (${placeholders})`,
            [agentCode, ...incomingProductCodes]
          );
      }
    }

    await client.query('COMMIT');
    console.log(`✅ [SYNC] Processed. Ops: ${countUpsert}`);
    
    notifyClients(lastCode, 'order');
    res.json({ ok: true, processed: countUpsert });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [ERROR]', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Endpoint Scan (Pistola)
app.post('/api/scan', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer DASHBOARD_V3_KEY_2025') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { codigo, cantidad } = req.body;
  if (!codigo || !cantidad) return res.status(400).json({ error: 'Data missing' });

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

    notifyClients(codeStr, 'scan');
    res.json({ ok: true, updated: codeStr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/data', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json([]);
  
  res.setHeader('Cache-Control', 'no-store, no-cache');
  
  try {
    const result = await pool.query(`
      WITH RankedDates AS (
        SELECT DISTINCT received_at::DATE as r_date
        FROM orders
        ORDER BY r_date DESC
        LIMIT 2
      ),
      TargetDates AS (
        SELECT 
          (SELECT r_date FROM RankedDates OFFSET 0 LIMIT 1) as date_today,
          (SELECT r_date FROM RankedDates OFFSET 1 LIMIT 1) as date_yesterday
      )
      SELECT 
        o.agent_code, 
        o.agent_name, 
        o.product_code, 
        o.product_name, 
        SUM(CASE WHEN o.received_at::DATE = (SELECT date_today FROM TargetDates) THEN o.quantity ELSE 0 END) as total_qty,
        SUM(CASE WHEN o.received_at::DATE = (SELECT date_yesterday FROM TargetDates) THEN o.quantity ELSE 0 END) as yesterday_qty,
        COALESCE(MAX(i.stock_qty), 0) as global_stock
      FROM orders o
      LEFT JOIN inventory i ON o.product_code = i.product_code
      WHERE o.received_at::DATE IN (SELECT r_date FROM RankedDates)
      GROUP BY o.agent_code, o.agent_name, o.product_code, o.product_name
      ORDER BY o.agent_code ASC
    `);
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'DB Query Failed' });
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
  }

  try {
    const result = await pool.query(`
      SELECT 
        DATE_TRUNC($1, received_at) as date_period,
        SUM(quantity) as total_qty
      FROM orders 
      WHERE received_at >= NOW() - $2::INTERVAL
      GROUP BY date_period
      ORDER BY date_period ASC
      LIMIT $3
    `, [truncType, interval, limit]);
    
    const formatted = result.rows.map(row => {
      const d = new Date(row.date_period);
      let label = d.toLocaleDateString();
      if (period === 'week') label = `S${Math.ceil((d.getDate() + 6 - d.getDay()) / 7)}`;
      if (period === 'month') label = d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
      return { date: label, fullDate: row.date_period, produccion: Number(row.total_qty) };
    });
    res.json(formatted);
  } catch (err) { res.status(500).json([]); }
});

app.post('/api/reset', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json({ ok: true });
  const client = await pool.connect();
  try {
    await client.query('TRUNCATE TABLE orders, inventory RESTART IDENTITY CASCADE');
    notifyClients('RESET');
    res.json({ ok: true });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  } finally {
    client.release();
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
