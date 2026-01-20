
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
          quantity NUMERIC DEFAULT 0,
          received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (agent_code, product_code)
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
  } catch (err) { console.error('❌ [DB] Init Error:', err.message); }
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
    return res.status(400).json({ error: 'Invalid JSON Structure' });
  }

  if (!process.env.DATABASE_URL) {
    notifyClients('TEST');
    return res.json({ ok: true, mode: 'memory_only' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let processedCount = 0;
    let lastCode = null;
    
    for (const z of zonas) {
      // 1. Mapeo Agente
      const agentCode = String(z.codigo_agente ?? '0').trim(); 
      const agentName = String(z.nombre_agente || z.nombre_comercial || z.nombre || 'DESCONOCIDO').toUpperCase();
      
      if (z.productos && Array.isArray(z.productos)) {
        for (const p of z.productos) {
          
          const prodCode = String(p.codigo || p.codigo_producto || '').trim().toUpperCase();
          if (!prodCode || prodCode === 'UNKNOWN') continue;

          // 2. MAPEO DIRECTO Y SENCILLO DEL NOMBRE
          // Prioridad absoluta a 'nombre_producto' tal cual viene del JSON
          let prodName = p.nombre_producto || p.nombre || '';
          prodName = String(prodName).trim();
          
          // Si por alguna razón viene vacío, usamos el código, pero en mayúsculas
          if (!prodName) prodName = prodCode;
          else prodName = prodName.toUpperCase();

          const qty = Number(p.cantidad || p.cantidad_producto || 0);
          const stockFisico = p.stock_fisico !== undefined ? Number(p.stock_fisico) : NaN;

          lastCode = prodCode;

          if (qty > 0) {
            // 3. UPSERT SIN CONDICIONALES COMPLEJOS
            // Si hay conflicto (ya existe), actualizamos el nombre SÍ o SÍ con el nuevo dato (EXCLUDED.product_name)
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
    console.log(`✅ [WEBHOOK] Processed ${processedCount} operations.`);
    notifyClients(lastCode, 'order');
    res.json({ ok: true, processed: processedCount });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [WEBHOOK ERROR]', err); 
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ... resto de endpoints iguales (scan, data, reset, history) ...
app.post('/api/scan', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer DASHBOARD_V3_KEY_2025') return res.status(401).json({error:'Auth'});
  const { codigo, cantidad } = req.body;
  if(!codigo) return res.status(400).json({error:'Falta codigo'});
  const client = await pool.connect();
  try {
    const qty = Number(cantidad) || 1;
    const code = String(codigo).toUpperCase().trim();
    await client.query(`
      INSERT INTO inventory (product_code, stock_qty)
      VALUES ($1, $2)
      ON CONFLICT (product_code)
      DO UPDATE SET stock_qty = inventory.stock_qty + $2
    `, [code, qty]);
    notifyClients(code, 'scan');
    res.json({ok:true, stock_updated: code});
  } catch(e) { res.status(500).json({error: e.message}); } finally { client.release(); }
});

app.get('/api/data', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json([]);
  res.setHeader('Cache-Control', 'no-store');
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
    res.json(result.rows.map(r => ({ ...r, yesterday_qty: 0 })));
  } catch (err) { res.status(500).json({ error: 'DB Query Failed' }); }
});

app.post('/api/reset', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json({ ok: true });
  const client = await pool.connect();
  try {
    await client.query('TRUNCATE TABLE orders, inventory RESTART IDENTITY CASCADE');
    notifyClients('RESET');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({error: err.message}); } finally { client.release(); }
});

app.get('/api/history', async (req, res) => res.json([]));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
