const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Token de seguridad (Debe coincidir en Make)
const CUSTOM_DASHBOARD_TOKEN = "DASHBOARD_V3_KEY_2025";

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Almacén en memoria persistente
let allProductionLines = [];

// Clientes conectados para SSE (Server-Sent Events)
let clients = [];

app.use(express.static(__dirname));

// --- SSE (Real-time updates) ---
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };

  clients.push(newClient);

  // Enviar mensaje de conexión
  res.write(`data: ${JSON.stringify({ type: 'sys_log', message: 'Conexión SSE establecida', timestamp: Date.now() })}\n\n`);

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
});

const broadcastUpdate = (extraData = {}) => {
  clients.forEach(client => {
    client.res.write(`data: ${JSON.stringify({ type: 'update', timestamp: Date.now(), ...extraData })}\n\n`);
  });
};

const broadcastLog = (msg) => {
  const payload = JSON.stringify({ type: 'sys_log', message: msg, timestamp: Date.now() });
  clients.forEach(client => {
    client.res.write(`data: ${payload}\n\n`);
  });
};

// --- ENDPOINTS ---

/**
 * Obtener todos los datos acumulados
 */
app.get('/api/data', (req, res) => {
  // Evitar caché estricto
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json({ zonas: allProductionLines });
});

/**
 * Endpoint SCAN (Scanner App)
 * Recibe: { "codigo": "12345", "cantidad": 5 }
 */
app.post('/api/scan', (req, res) => {
  // --- DEBUGGING EXTREMO PARA VERIFICAR CONEXIÓN ---
  console.log('------------------------------------------------');
  console.log('📡 [DEBUG] PETICIÓN ENTRANTE A /api/scan');
  console.log('👉 IP:', req.ip);
  console.log('👉 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('👉 Body:', JSON.stringify(req.body, null, 2));
  console.log('------------------------------------------------');
  // -----------------------------------------------------

  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${CUSTOM_DASHBOARD_TOKEN}`;

  // Validación laxa para facilitar pruebas
  if (authHeader && authHeader !== expectedToken) {
    const errorMsg = `🔒 ERROR TOKEN: Recibido [${authHeader}] vs Esperado [${expectedToken}]`;
    console.error(errorMsg);
    broadcastLog(errorMsg);
    return res.status(401).json({ error: 'Token inválido' });
  }

  const { codigo, cantidad } = req.body;

  if (!codigo || cantidad === undefined) {
    const errorMsg = `❌ SCAN Error: Datos incompletos (Codigo: ${codigo}, Cant: ${cantidad})`;
    console.error(errorMsg);
    broadcastLog(errorMsg);
    return res.status(400).json({ error: 'Faltan datos: codigo o cantidad' });
  }

  const qtyToAdd = Number(cantidad);
  let productFound = false;
  let updatedProduct = '';
  let updatedCode = '';

  // Búsqueda y actualización
  for (let zona of allProductionLines) {
    if (Array.isArray(zona.productos)) {
      for (let prod of zona.productos) {
        const pCode = String(prod.codigo || '').trim().toUpperCase();
        const pName = String(prod.nombre || '').trim().toUpperCase();
        const scanCode = String(codigo).trim().toUpperCase();

        if (pCode === scanCode || pName === scanCode) {
          prod.stock_fisico = (Number(prod.stock_fisico) || 0) + qtyToAdd;
          productFound = true;
          updatedProduct = prod.nombre || prod.codigo;
          updatedCode = pCode; // Guardamos el código real del producto actualizado
        }
      }
    } else {
        // Estructura Legacy
        const pCode = String(zona.codigo_agente || '').trim().toUpperCase();
        const pName = String(zona.nombre || '').trim().toUpperCase();
        const scanCode = String(codigo).trim().toUpperCase();

        if (pName === scanCode || pCode === scanCode) {
            zona.stock_fisico = (Number(zona.stock_fisico) || 0) + qtyToAdd;
            productFound = true;
            updatedProduct = zona.nombre;
            updatedCode = pCode;
        }
    }
  }

  if (productFound) {
    const msg = `MATCH: ${updatedProduct} (+${qtyToAdd})`;
    console.log(`✅ ${msg}`);
    broadcastLog(msg); // Enviar log al frontend
    // Enviamos updatedCode para que el frontend sepa EXACTAMENTE qué fila iluminar
    broadcastUpdate({ updatedCode }); 
    return res.json({ status: 'ok', message: 'Stock actualizado', codigo, added: qtyToAdd });
  } else {
    const msg = `NO MATCH: Código ${codigo} no encontrado en lista activa`;
    console.warn(`⚠️ ${msg}`);
    broadcastLog(msg);
    return res.json({ status: 'warning', message: 'Producto no encontrado en lista activa' });
  }
});

/**
 * Reiniciar datos
 */
app.post('/api/reset', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${CUSTOM_DASHBOARD_TOKEN}`) {
    allProductionLines = [];
    broadcastUpdate();
    broadcastLog('♻️ SISTEMA REINICIADO (RESET)');
    return res.json({ status: 'reset_ok' });
  }
  res.status(401).json({ error: 'No autorizado' });
});

/**
 * Webhook acumulativo
 */
app.post('/api/webhook', (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${CUSTOM_DASHBOARD_TOKEN}`;

  if (!authHeader || authHeader !== expectedToken) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  if (req.body && req.body.zonas && Array.isArray(req.body.zonas)) {
    const timestamp = new Date().toISOString();
    const zonesWithTime = req.body.zonas.map(z => ({ 
      ...z, 
      receivedAt: timestamp 
    }));
    
    allProductionLines = [...allProductionLines, ...zonesWithTime];
    
    const msg = `📥 WEBHOOK: Recibidos ${req.body.zonas.length} registros`;
    console.log(msg);
    broadcastLog(msg);
    broadcastUpdate();
    return res.status(200).json({ status: 'ok' });
  }
  
  res.status(400).json({ error: 'Formato incorrecto' });
});

app.get('*', (req, res) => {
  const ext = path.extname(req.url);
  if (ext && ext !== '.html') return res.status(404).send('Not found');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 FACTORYFLOW PRO - PORT ${PORT}`);
});