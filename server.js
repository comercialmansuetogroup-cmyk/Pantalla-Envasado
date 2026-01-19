
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
      // 1. MIGRACIÓN AUTOMÁTICA DE ESQUEMA (FIX ERROR 500)
      // Verificamos si existe la tabla 'orders' con la columna antigua 'id'.
      // Si existe, borramos las tablas para recrearlas con la estructura correcta (Composite Key).
      const checkOldSchema = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name='orders' AND column_name='id'"
      );
      
      if (checkOldSchema.rowCount > 0) {
        console.warn('⚠️ [DB] Esquema antiguo detectado. Ejecutando migración (DROP & RECREATE)...');
        await client.query('DROP TABLE IF EXISTS orders CASCADE');
        await client.query('DROP TABLE IF EXISTS inventory CASCADE');
      }

      // 2. CREACIÓN DE TABLAS (ESTRUCTURA CORRECTA)
      // orders: PK compuesta (agent_code, product_code) para permitir ON CONFLICT UPDATE
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
      console.log('✅ [DB] System Ready. Schema Verified.');
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
  // 1. Verificación de Token
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer DASHBOARD_V3_KEY_2025') {
    return res.status(401).json({ error: 'Unauthorized. Check Token.' });
  }

  const { zonas } = req.body;
  
  // Validación básica del payload
  if (!zonas || !Array.isArray(zonas)) {
    console.error('❌ [WEBHOOK] Invalid JSON received:', JSON.stringify(req.body).substring(0, 100));
    return res.status(400).json({ error: 'Invalid JSON Structure. Expected "zonas" array.' });
  }

  if (!process.env.DATABASE_URL) {
    notifyClients('TEST');
    return res.json({ ok: true, mode: 'memory_only_no_db' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let processedCount = 0;
    let lastCode = null;
    
    for (const z of zonas) {
      // Normalización de datos del Agente
      const agentCode = String(z.codigo_agente ?? '0').trim(); 
      const agentName = String(z.nombre_agente || z.nombre || 'DESCONOCIDO').toUpperCase();
      
      if (z.productos && Array.isArray(z.productos)) {
        for (const p of z.productos) {
          
          // A) Normalización de Producto
          const prodCode = String(p.codigo || '').trim().toUpperCase();
          
          // Si no hay código, saltamos (no podemos guardar basura)
          if (!prodCode || prodCode === 'UNKNOWN') continue;

          // Nombre: Prioridad p.nombre > p.descripcion > prodCode
          let prodName = p.nombre || p.descripcion || ''; 
          if (!prodName) prodName = prodCode;

          // B) Limpieza de Números (Manejo de comas decimales europeas)
          // Make a veces envía "10,5" que falla en Number(). Reemplazamos coma por punto.
          const cleanQty = String(p.cantidad || '0').replace(',', '.');
          const cleanStock = String(p.stock_fisico !== undefined && p.stock_fisico !== null ? p.stock_fisico : '').replace(',', '.');
          
          const qty = Number(cleanQty) || 0;
          const stockFisico = cleanStock === '' ? NaN : Number(cleanStock);

          lastCode = prodCode;

          // C) LÓGICA DE PEDIDOS (UPSERT ACUMULATIVO)
          if (qty > 0) {
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

          // D) LÓGICA DE STOCK (SOBRESCRIBIR)
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
    console.error('❌ [WEBHOOK ERROR]', err); // Log completo del error
    res.status(500).json({ error: err.message, detail: 'Check server logs for schema issues' });
  } finally {
    client.release();
  }
});

// Endpoint SCAN (Pistola)
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
  } catch(e) {
    res.status(500).json({error: e.message});
  } finally {
    client.release();
  }
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
    
    const rows = result.rows.map(r => ({ ...r, yesterday_qty: 0 }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'DB Query Failed' });
  }
});

app.post('/api/reset', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json({ ok: true });
  const client = await pool.connect();
  try {
    await client.query('TRUNCATE TABLE orders, inventory RESTART IDENTITY CASCADE');
    notifyClients('RESET');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({error: err.message}); } 
  finally { client.release(); }
});

app.get('/api/history', async (req, res) => res.json([]));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
