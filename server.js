
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

// --- PROTOCOLO DE INICIALIZACIÓN ROBUSTA ---
const initDB = async () => {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ [SYSTEM] Running without Database (Memory Mode)');
    return;
  }
  try {
    const client = await pool.connect();
    try {
      // 1. Limpieza de tablas antiguas o redundantes
      await client.query('DROP TABLE IF EXISTS webhook_memory'); 
      await client.query('DROP TABLE IF EXISTS daily_stats'); 
      await client.query('DROP TABLE IF EXISTS "DALL·E STATS"'); 

      // 2. Tabla ORDERS con Constraint de Unicidad
      // Creamos la tabla si no existe
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
      `);

      // 2.1 MIGRACIÓN SEGURA: Añadir order_hash si no existe (para evitar error 500 en tablas viejas)
      await client.query(`
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_hash TEXT UNIQUE;
      `);

      // 3. Tabla INVENTORY (Stock Físico)
      await client.query(`
        CREATE TABLE IF NOT EXISTS inventory (
          product_code TEXT PRIMARY KEY,
          stock_qty NUMERIC DEFAULT 0
        );
      `);
      
      console.log('✅ [DB] Schema Verified. Unique Constraints Active.');
    } finally {
      client.release();
    }
  } catch (err) { console.error('❌ [DB] Init Error:', err.message); }
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
  clients.push({ id: clientId, res });
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

// 1. WEBHOOK (Entrada de Pedidos - IDEMPOTENTE)
app.post('/api/webhook', async (req, res) => {
  const { zonas } = req.body;
  
  // Validación estricta para Make: Si no hay zonas, devolvemos 200 OK para no parar el escenario, pero avisamos.
  if (!zonas || !Array.isArray(zonas)) {
    console.log('⚠️ [WEBHOOK] Recibido payload vacío o inválido de Make');
    return res.status(200).json({ ok: true, message: 'No zones to process' });
  }

  if (!process.env.DATABASE_URL) {
    notifyClients('TEST');
    return res.json({ ok: true, mode: 'no-db' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let inserted = 0;
    let ignored = 0;
    let lastCode = null;
    
    // FECHA NORMALIZADA: Usamos YYYY-MM-DD del servidor.
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

    // CONTADOR DE OCURRENCIAS LOCAL (Por si Make envía duplicados en el mismo array)
    const batchOccurrences = new Map();

    for (const z of zonas) {
      // Extracción segura de datos del nivel superior (Zona)
      const code = String(z.codigo_agente ?? '0').trim(); 
      const name = z.nombre_agente || 'DESCONOCIDO';
      // Fallback: Si no hay nombre en la zona, usamos un placeholder
      const topLevelProductName = z.nombre || 'PRODUCTO GENERICO';

      if (z.productos && Array.isArray(z.productos)) {
        for (const p of z.productos) {
          lastCode = String(p.codigo || 'UNKNOWN').toUpperCase().trim();
          
          // Parsing numérico seguro (reemplazar comas por puntos por si acaso viene formato europeo)
          let qty = 0;
          try {
             const cleanQty = String(p.cantidad).replace(',', '.');
             qty = parseFloat(cleanQty);
             if (isNaN(qty)) qty = 0;
          } catch(e) { qty = 0; }
          
          // Determinar nombre final: Si el objeto producto tiene nombre, úsalo. Si no, usa el de la zona.
          const finalProductName = p.nombre || topLevelProductName;

          if (qty > 0) {
            // PROTOCOLO PASO 1: Identificar Ocurrencia Única
            const occurrenceKey = `${code}-${lastCode}-${qty}`;
            const currentCount = (batchOccurrences.get(occurrenceKey) || 0) + 1;
            batchOccurrences.set(occurrenceKey, currentCount);

            // PROTOCOLO PASO 2: Generar HASH DETERMINISTA
            // Hash = Cliente + Producto + Cantidad + FechaHoy + NºOcurrencia
            // Si Make envía esto mismo a las 10am y a las 2pm, el hash es IDÉNTICO.
            const rawString = `${code}-${lastCode}-${qty}-${dateKey}-${currentCount}`;
            const uniqueHash = crypto.createHash('md5').update(rawString).digest('hex');

            // PROTOCOLO PASO 3: Intentar Insertar con Blindaje
            const insertQuery = `
              INSERT INTO orders (order_hash, agent_code, agent_name, product_code, product_name, quantity)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (order_hash) DO NOTHING
              RETURNING id;
            `;

            const resInsert = await client.query(insertQuery, [uniqueHash, code, name, lastCode, finalProductName, qty]);
            
            if (resInsert.rows.length > 0) {
              inserted++;
            } else {
              ignored++;
            }
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log(`✅ [SYNC] Date: ${dateKey} | Inserted: ${inserted} | Ignored (Dupes): ${ignored}`);
    
    notifyClients(lastCode, 'order');
    res.json({ ok: true, inserted, ignored });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [ERROR 500 HANDLED]', err.message);
    // Devolvemos 500 pero con JSON claro para Make para que sepas qué falló
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 2. SCAN (Entrada de Inventario - Sumativa)
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

// 3. GET DATA
app.get('/api/data', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json([]);
  try {
    const result = await pool.query(`
      WITH Dates AS (
        SELECT CURRENT_DATE as today, CURRENT_DATE - INTERVAL '1 day' as yesterday
      )
      SELECT 
        o.agent_code, 
        o.agent_name, 
        o.product_code, 
        o.product_name, 
        SUM(CASE WHEN o.received_at::DATE = (SELECT today FROM Dates) THEN o.quantity ELSE 0 END) as total_qty,
        SUM(CASE WHEN o.received_at::DATE = (SELECT yesterday FROM Dates) THEN o.quantity ELSE 0 END) as yesterday_qty,
        COALESCE(MAX(i.stock_qty), 0) as global_stock
      FROM orders o
      LEFT JOIN inventory i ON o.product_code = i.product_code
      WHERE o.received_at >= CURRENT_DATE - INTERVAL '2 days'
      GROUP BY o.agent_code, o.agent_name, o.product_code, o.product_name
      ORDER BY o.agent_code ASC
    `);
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database query failed' });
  }
});

// 4. HISTORY
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

// 5. RESET (Borrado Total)
app.post('/api/reset', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json({ ok: true });
  const client = await pool.connect();
  try {
    await client.query('TRUNCATE TABLE orders, inventory RESTART IDENTITY CASCADE');
    console.log('⚠️ [RESET] SYSTEM FACTORY RESET EXECUTED');
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
