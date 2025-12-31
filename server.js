
const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de PostgreSQL - Usa la variable de Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(__dirname));

/**
 * 1. INICIALIZACIÓN DE TABLAS
 * Este bloque crea las tablas si no existen.
 * 'orders' se limpia con cada webhook de Make.
 * 'inventory' es PERMANENTE (tu stock acumulado).
 */
const initDB = async () => {
  try {
    // Tabla de Pedidos (Lo que hay que producir)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        agent_code TEXT,
        client_name TEXT,
        product_code TEXT,
        product_name TEXT,
        quantity NUMERIC DEFAULT 0,
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de Inventario (Lo que ya se ha escaneado)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        product_code TEXT PRIMARY KEY,
        stock_qty NUMERIC DEFAULT 0,
        last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ PostgreSQL: Estructura de tablas verificada.');
  } catch (err) {
    console.error('❌ Error inicializando DB:', err);
  }
};
initDB();

/**
 * 2. REAL-TIME ENGINE (SSE)
 */
let clients = [];
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  clients.push(res);
  req.on('close', () => { clients = clients.filter(c => c !== res); });
});

const broadcast = (data) => clients.forEach(c => c.write(`data: ${JSON.stringify(data)}\n\n`));

/**
 * 3. ENDPOINTS DE NEGOCIO
 */

// Obtener datos combinados: Pedidos + Stock Real
app.get('/api/data', async (req, res) => {
  try {
    // Consulta SQL que une pedidos con stock físico mediante LEFT JOIN
    const query = `
      SELECT 
        o.agent_code,
        o.client_name,
        o.product_name,
        o.product_code,
        o.quantity as pedido_qty,
        COALESCE(i.stock_qty, 0) as stock_real
      FROM orders o
      LEFT JOIN inventory i ON o.product_code = i.product_code
      ORDER BY o.agent_code ASC, o.product_name ASC
    `;
    const result = await pool.query(query);
    
    // Agrupamos por agente para el Dashboard
    const zones = {};
    result.rows.forEach(row => {
      if (!zones[row.agent_code]) {
        zones[row.agent_code] = {
          codigo_agente: row.agent_code,
          nombre_agente: row.client_name,
          productos: []
        };
      }
      zones[row.agent_code].productos.push({
        codigo: row.product_code,
        nombre: row.product_name,
        cantidad: Number(row.pedido_qty),
        stock_fisico: Number(row.stock_real)
      });
    });

    res.json({ zonas: Object.values(zones) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ESCÁNER: Sumar stock físico a la base de datos
app.post('/api/scan', async (req, res) => {
  const { codigo, cantidad } = req.body;
  const pCode = String(codigo).toUpperCase();
  const qty = Number(cantidad);

  if (!pCode || isNaN(qty)) return res.status(400).json({ error: 'Datos de escaneo inválidos' });

  try {
    // UPSERT: Si el producto existe, suma la cantidad. Si no, lo crea.
    await pool.query(`
      INSERT INTO inventory (product_code, stock_qty, last_update)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (product_code) 
      DO UPDATE SET 
        stock_qty = inventory.stock_qty + EXCLUDED.stock_qty,
        last_update = CURRENT_TIMESTAMP
    `, [pCode, qty]);

    broadcast({ type: 'update', updatedCode: pCode });
    res.json({ status: 'success', message: `Stock de ${pCode} actualizado` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MAKE WEBHOOK: Reemplaza la lista de pedidos diaria
app.post('/api/webhook', async (req, res) => {
  const { zonas } = req.body;
  if (!zonas || !Array.isArray(zonas)) return res.status(400).json({ error: 'Formato de Make inválido' });

  try {
    await pool.query('BEGIN');
    await pool.query('DELETE FROM orders'); // Borramos pedidos viejos, pero el 'inventory' se queda intacto

    for (const zona of zonas) {
      const code = zona.codigo_agente || '0';
      const name = zona.nombre_agente || 'CLIENTE';
      if (Array.isArray(zona.productos)) {
        for (const p of zona.productos) {
          await pool.query(
            'INSERT INTO orders (agent_code, client_name, product_code, product_name, quantity) VALUES ($1, $2, $3, $4, $5)',
            [code, name, String(p.codigo).toUpperCase(), p.nombre || 'Producto', p.cantidad || 0]
          );
        }
      }
    }
    await pool.query('COMMIT');
    broadcast({ type: 'update' });
    res.json({ status: 'ok', message: 'Pedidos sincronizados en PostgreSQL' });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Factory Engine (Postgres Ready) en puerto ${PORT}`));
