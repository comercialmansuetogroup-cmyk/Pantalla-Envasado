
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

// Inicialización de Tablas
const initDB = async () => {
  if (!process.env.DATABASE_URL) return;
  try {
    const client = await pool.connect();
    try {
      // Tabla de Pedidos (Lo que hay que producir)
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          agent_code TEXT,      -- Código Cliente (Ej: 10, 27)
          agent_name TEXT,      -- Nombre Cliente (Ej: PINGÜINO)
          product_code TEXT,    -- Código Producto
          product_name TEXT,    -- Descripción Producto
          quantity NUMERIC DEFAULT 0,
          received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Tabla de Inventario (Lo que ya hay fabricado)
        CREATE TABLE IF NOT EXISTS inventory (
          product_code TEXT PRIMARY KEY,
          stock_qty NUMERIC DEFAULT 0
        );
      `);
      console.log('✅ [DB] System Ready');
    } finally {
      client.release();
    }
  } catch (err) { console.error('❌ [DB] Error:', err.message); }
};
initDB();

// SSE para tiempo real
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
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { zonas } = req.body;
  if (!zonas || !Array.isArray(zonas)) return res.status(400).json({ error: 'Invalid JSON' });

  if (!process.env.DATABASE_URL) {
    notifyClients('TEST');
    return res.json({ ok: true, mode: 'memory' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let processedCount = 0;
    let lastCode = null;
    
    // Recorremos cada "Zona" (que en realidad es una cabecera de pedido/cliente)
    for (const z of zonas) {
      // z.nombre es el Nombre del Cliente (Ej: INTEGRA TRANSPORTE)
      // z.codigo_agente es el Código (Ej: 10, 27)
      const agentCode = String(z.codigo_agente ?? '0').trim();
      const agentName = String(z.nombre_agente || z.nombre || 'DESCONOCIDO').toUpperCase();
      
      const incomingProductIds = [];

      if (z.productos && Array.isArray(z.productos)) {
        for (const p of z.productos) {
          // --- LÓGICA DE PRODUCTO ---
          // IMPORTANTE: NO usar z.nombre aquí, eso es el cliente.
          // Buscamos el nombre dentro del objeto producto.
          // Si Make envía "nombre" o "descripcion" dentro de "productos", lo usamos.
          let prodName = p.nombre || p.descripcion || '';
          let prodCode = String(p.codigo || '').trim().toUpperCase();
          const qty = Math.floor(Number(p.cantidad) || 0);
          const stockFisico = Number(p.stock_fisico); // Captura del stock real

          // Si viene sin código, usamos el nombre como identificador (NO INVENTAMOS HASHES)
          if (!prodCode || prodCode === 'UNKNOWN') {
             prodCode = prodName.toUpperCase().trim();
          }
          
          // Si no tiene nombre ni código, nos saltamos esta línea
          if (!prodCode) continue;
          
          // Si el nombre estaba vacío pero tenemos código, usamos el código como nombre temporal
          // Esto evita que coja z.nombre (que es el cliente)
          if (!prodName) prodName = prodCode;

          lastCode = prodCode;
          incomingProductIds.push(prodCode);

          if (qty >= 0) {
            // 1. ACTUALIZAR PEDIDO (Orders)
            // Buscamos si ya existe una línea para este Agente + Producto hoy
            const updateRes = await client.query(
               `UPDATE orders 
                SET quantity = $1, product_name = $2, agent_name = $5
                WHERE agent_code = $3 
                  AND product_code = $4 
                  AND received_at::DATE = CURRENT_DATE`,
               [qty, prodName, agentCode, prodCode, agentName]
            );

            if (updateRes.rowCount === 0 && qty > 0) {
              await client.query(
                `INSERT INTO orders (agent_code, agent_name, product_code, product_name, quantity) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [agentCode, agentName, prodCode, prodName, qty]
              );
            }

            // 2. ACTUALIZAR STOCK FISICO (Inventory)
            // Si Make nos manda el stock real, actualizamos la tabla de inventario
            if (!isNaN(stockFisico)) {
               await client.query(
                 `INSERT INTO inventory (product_code, stock_qty) 
                  VALUES ($1, $2)
                  ON CONFLICT (product_code) 
                  DO UPDATE SET stock_qty = $2`,
                 [prodCode, stockFisico]
               );
            }
            processedCount++;
          }
        }
      }

      // 3. LIMPIEZA
      // Si en este envío del agente faltan productos que antes estaban hoy, se borran (sincronización total)
      if (incomingProductIds.length > 0) {
          const placeholders = incomingProductIds.map((_, i) => `$${i + 2}`).join(',');
          await client.query(
            `DELETE FROM orders 
             WHERE agent_code = $1 
               AND received_at::DATE = CURRENT_DATE
               AND product_code NOT IN (${placeholders})`,
            [agentCode, ...incomingProductIds]
          );
      }
    }

    await client.query('COMMIT');
    console.log(`✅ [SYNC] Ops: ${processedCount}`);
    notifyClients(lastCode, 'order');
    res.json({ ok: true, count: processedCount });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [ERROR]', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/data', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json([]);
  res.setHeader('Cache-Control', 'no-store');
  
  try {
    // Consulta Agrupada: Trae Pedido Total y Stock Real
    // Calcula HOY y AYER para tendencias
    const result = await pool.query(`
      WITH RankedDates AS (
        SELECT DISTINCT received_at::DATE as r_date FROM orders ORDER BY r_date DESC LIMIT 2
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
        -- Suma de cantidades para HOY
        SUM(CASE WHEN o.received_at::DATE = (SELECT date_today FROM TargetDates) THEN o.quantity ELSE 0 END) as total_qty,
        -- Suma de cantidades para AYER (Comparativa)
        SUM(CASE WHEN o.received_at::DATE = (SELECT date_yesterday FROM TargetDates) THEN o.quantity ELSE 0 END) as yesterday_qty,
        -- Stock actual (Máximo valor registrado para ese código)
        COALESCE((SELECT stock_qty FROM inventory WHERE product_code = o.product_code), 0) as global_stock
      FROM orders o
      WHERE o.received_at::DATE IN (SELECT r_date FROM RankedDates)
      GROUP BY o.agent_code, o.agent_name, o.product_code, o.product_name
      ORDER BY o.agent_code ASC
    `);
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'DB Query Failed' });
  }
});

// Endpoint Reset (para emergencias)
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

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
