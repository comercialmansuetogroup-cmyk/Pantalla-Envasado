
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- BASE DE DATOS E INICIALIZACIÓN ---
const initDB = async () => {
  if (!process.env.DATABASE_URL) return;
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          agent_code TEXT NOT NULL,
          agent_name TEXT,
          product_code TEXT NOT NULL,
          product_name TEXT,
          quantity INTEGER DEFAULT 0,
          received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (agent_code, product_code)
        );
        
        CREATE TABLE IF NOT EXISTS inventory (
          product_code TEXT PRIMARY KEY,
          stock_qty NUMERIC DEFAULT 0
        );
      `);
      console.log('✅ [DB] Sistema inicializado y verificado.');
    } finally {
      client.release();
    }
  } catch (err) { console.error('❌ [DB] Error:', err.message); }
};
initDB();

// --- SSE (Real Time) ---
let clients = [];
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); 
  const clientId = Date.now();
  clients.push({ id: clientId, res });
  req.on('close', () => clients = clients.filter(c => c.id !== clientId));
});
setInterval(() => clients.forEach(c => c.res.write(': keepalive\n\n')), 30000);
const notifyClients = (code, type = 'update') => clients.forEach(c => c.res.write(`data: ${JSON.stringify({type, code})}\n\n`));

// --- WEBHOOK MAKE ---
app.post('/api/webhook', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer DASHBOARD_V3_KEY_2025') {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { zonas } = req.body;
  if (!zonas || !Array.isArray(zonas)) {
    return res.status(400).json({ error: 'Estructura JSON no válida' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let processedCount = 0;
    let lastCode = null;
    
    for (const z of zonas) {
      const agentCode = String(z.codigo_agente || '0').trim(); 
      const agentName = String(z.nombre_agente || z.nombre_comercial || 'DESCONOCIDO').toUpperCase();
      
      if (z.productos && Array.isArray(z.productos)) {
        for (const p of z.productos) {
          // 1. Mapeo de Identificadores
          const prodCode = String(p.codigo || '').trim().toUpperCase();
          const prodName = String(p.nombre_producto || '').trim().toUpperCase();
          
          if (!prodCode) continue;

          // 2. Lógica de Cantidad (TRUNCAR DECIMALES)
          // Convertimos a string para manejar comas (1,5 -> 1.5), luego a número, luego floor
          const rawQtyStr = String(p.cantidad || p.cantidad_producto || 0).replace(',', '.');
          const qty = Math.floor(Number(rawQtyStr) || 0);

          // 3. Stock físico (se mantiene decimal para precisión de inventario si fuera necesario, o se puede truncar igual)
          const rawStockStr = String(p.stock_fisico !== undefined ? p.stock_fisico : '').replace(',', '.');
          const stockFisico = rawStockStr === '' ? NaN : Number(rawStockStr);

          lastCode = prodCode;

          if (qty > 0) {
            // UPSERT en Postgres
            await client.query(`
              INSERT INTO orders (agent_code, agent_name, product_code, product_name, quantity)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (agent_code, product_code)
              DO UPDATE SET 
                quantity = orders.quantity + EXCLUDED.quantity,
                product_name = EXCLUDED.product_name, 
                received_at = CURRENT_TIMESTAMP
            `, [agentCode, agentName, prodCode, prodName, qty]);
            
            processedCount++;
          }

          if (!isNaN(stockFisico)) {
            await client.query(`
              INSERT INTO inventory (product_code, stock_qty)
              VALUES ($1, $2)
              ON CONFLICT (product_code)
              DO UPDATE SET stock_qty = EXCLUDED.stock_qty
            `, [prodCode, stockFisico]);
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Webhook: ${processedCount} unidades procesadas.`);
    notifyClients(lastCode, 'order');
    res.json({ ok: true, processed: processedCount });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error Webhook:', err); 
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
        o.agent_code, 
        o.agent_name, 
        o.product_code, 
        o.product_name, 
        o.quantity as total_qty,
        COALESCE(i.stock_qty, 0) as global_stock
      FROM orders o
      LEFT JOIN inventory i ON o.product_code = i.product_code
      WHERE o.quantity > 0
      ORDER BY o.agent_code ASC, o.product_name ASC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'DB Error' }); }
});

app.post('/api/reset', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('TRUNCATE TABLE orders, inventory RESTART IDENTITY CASCADE');
    notifyClients('RESET');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({error: err.message}); } finally { client.release(); }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
}

app.listen(PORT, () => console.log(`🚀 Servidor activo en puerto ${PORT}`));
