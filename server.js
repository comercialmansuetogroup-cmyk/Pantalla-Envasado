
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');
const crypto = require('crypto');

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
      console.log('🔄 [DB] Syncing Tables & Cleaning...');
      
      // 1. Limpieza de tablas basura si existen
      await client.query('DROP TABLE IF EXISTS daily_stats'); 
      await client.query('DROP TABLE IF EXISTS "DALL·E STATS"'); 

      // 2. Creación de tablas Core
      await client.query(`
        -- TABLA 1: LIBRO DE PEDIDOS (La Realidad)
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          agent_code TEXT,
          agent_name TEXT,
          product_code TEXT,
          product_name TEXT,
          quantity NUMERIC DEFAULT 0,
          received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- TABLA 2: ALMACÉN (El Escáner)
        CREATE TABLE IF NOT EXISTS inventory (
          product_code TEXT PRIMARY KEY,
          stock_qty NUMERIC DEFAULT 0
        );
        
        -- TABLA 3: EL PORTERO (Memoria de Duplicados - Legacy, mantenida por compatibilidad)
        CREATE TABLE IF NOT EXISTS webhook_memory (
          line_hash TEXT PRIMARY KEY,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ [DB] System Ready. Tables: orders, inventory, webhook_memory');
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
  const { zonas } = req.body;
  
  if (!zonas || !Array.isArray(zonas)) {
    console.error('❌ [WEBHOOK] Invalid Body');
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
    let countUpsert = 0;
    
    // Iteramos por cada zona (Agente)
    for (const z of zonas) {
      const agentCode = String(z.codigo_agente ?? '0').trim(); 
      const agentName = z.nombre_agente || 'DESCONOCIDO';
      const topLevelProductName = z.nombre || 'PRODUCTO';
      
      // Lista para rastrear qué productos vinieron en ESTE webhook
      // Cualquier producto que esté en la DB para este agente hoy, pero NO en esta lista, será borrado.
      const incomingProductCodes = [];

      if (z.productos && Array.isArray(z.productos)) {
        for (const p of z.productos) {
          const prodCode = String(p.codigo || 'UNKNOWN').toUpperCase().trim();
          const prodName = p.nombre || topLevelProductName;
          
          // REGLA DE ORO: Redondear hacia abajo SIEMPRE antes de escribir
          const qty = Math.floor(Number(p.cantidad) || 0);
          
          lastCode = prodCode;
          incomingProductCodes.push(prodCode);

          if (qty >= 0) { // Permitimos 0 por si quieren dejar la línea a cero sin borrarla explícitamente
            
            // 1. INTENTAR ACTUALIZAR (Si ya existe la línea hoy)
            // Esto maneja la EDICIÓN de cantidades en tiempo real
            const updateResult = await client.query(
               `UPDATE orders 
                SET quantity = $1, product_name = $2
                WHERE agent_code = $3 
                  AND product_code = $4 
                  AND received_at::DATE = CURRENT_DATE`,
               [qty, prodName, agentCode, prodCode]
            );

            // 2. SI NO EXISTE, INSERTAR (Nueva Línea)
            if (updateResult.rowCount === 0 && qty > 0) {
              await client.query(
                `INSERT INTO orders (agent_code, agent_name, product_code, product_name, quantity) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [agentCode, agentName, prodCode, prodName, qty]
              );
            }
            countUpsert++;
          }
        }
      }

      // 3. ELIMINAR LÍNEAS HUÉRFANAS (Si se borró una línea en Make)
      // Borramos de la DB cualquier producto de ESTE agente HOY que NO esté en la lista que acabamos de recibir.
      if (incomingProductCodes.length > 0) {
          // Generamos los placeholders ($2, $3, etc) para el array
          const placeholders = incomingProductCodes.map((_, i) => `$${i + 2}`).join(',');
          
          await client.query(
            `DELETE FROM orders 
             WHERE agent_code = $1 
               AND received_at::DATE = CURRENT_DATE
               AND product_code NOT IN (${placeholders})`,
            [agentCode, ...incomingProductCodes]
          );
      } else {
          // Si la lista de productos viene vacía, significa que el usuario borró TODO para este agente hoy.
          // Borramos todas las líneas de hoy para este agente.
          await client.query(
            `DELETE FROM orders 
             WHERE agent_code = $1 
               AND received_at::DATE = CURRENT_DATE`,
            [agentCode]
          );
      }
    }

    await client.query('COMMIT');
    console.log(`✅ [SYNC] Processed Agent Updates. Total Ops: ${countUpsert}`);
    
    // Notificamos al frontend para que refresque inmediatamente
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

app.post('/api/scan', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer DASHBOARD_V3_KEY_2025') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { codigo, cantidad } = req.body;
  if (!codigo || !cantidad) {
    return res.status(400).json({ error: 'Faltan datos' });
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

    console.log(`✅ [SCAN] ${codeStr} +${qtyNum}`);
    notifyClients(codeStr, 'scan');
    res.json({ ok: true, updated: codeStr, qty: qtyNum });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/data', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json([]);
  
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
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
  
  // Conexión dedicada para el reset
  const client = await pool.connect();
  try {
    // FIX: TRUNCATE CASCADE para un borrado instantáneo y total
    await client.query('TRUNCATE TABLE orders, inventory, webhook_memory RESTART IDENTITY CASCADE');
    console.log('⚠️ [RESET] SYSTEM FACTORY RESET EXECUTED');
    notifyClients('RESET');
    res.json({ ok: true });
  } catch (err) { 
    console.error('Reset Error:', err);
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
