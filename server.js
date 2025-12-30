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

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
});

const broadcastUpdate = () => {
  clients.forEach(client => {
    client.res.write(`data: ${JSON.stringify({ type: 'update', timestamp: Date.now() })}\n\n`);
  });
};

// --- ENDPOINTS ---

/**
 * Obtener todos los datos acumulados
 */
app.get('/api/data', (req, res) => {
  res.json({ zonas: allProductionLines });
});

/**
 * Endpoint SCAN (Scanner App)
 * Recibe: { "codigo": "12345", "cantidad": 5 }
 */
app.post('/api/scan', (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${CUSTOM_DASHBOARD_TOKEN}`;

  // Validación laxa para facilitar pruebas, pero idealmente estricta
  if (authHeader && authHeader !== expectedToken) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const { codigo, cantidad } = req.body;

  if (!codigo || cantidad === undefined) {
    return res.status(400).json({ error: 'Faltan datos: codigo o cantidad' });
  }

  const qtyToAdd = Number(cantidad);
  let productFound = false;

  // Búsqueda y actualización en profundidad
  // Prioridad: Buscar coincidencia exacta de código. Si no, buscar por nombre.
  // Nota: Esto actualiza la estructura en memoria.
  
  // Iteramos sobre todas las zonas
  for (let zona of allProductionLines) {
    if (Array.isArray(zona.productos)) {
      for (let prod of zona.productos) {
        // Normalizamos comparación
        const pCode = String(prod.codigo || '').trim().toUpperCase();
        const pName = String(prod.nombre || '').trim().toUpperCase();
        const scanCode = String(codigo).trim().toUpperCase();

        if (pCode === scanCode || pName === scanCode) {
          // Inicializar stock_fisico si no existe
          prod.stock_fisico = (Number(prod.stock_fisico) || 0) + qtyToAdd;
          productFound = true;
          // No hacemos break para actualizar TODAS las instancias de ese producto en diferentes pedidos?
          // Generalmente un código EAN es único. Si el usuario quiere descontar del total global,
          // debemos sumar al stock global. Aquí sumamos a la línea encontrada.
        }
      }
    } else {
        // Estructura Legacy (sin array productos)
        const pCode = String(zona.codigo_agente || '').trim().toUpperCase(); // A veces el código viene aquí en legacy
        const pName = String(zona.nombre || '').trim().toUpperCase();
        const scanCode = String(codigo).trim().toUpperCase();

        if (pName === scanCode || pCode === scanCode) {
            zona.stock_fisico = (Number(zona.stock_fisico) || 0) + qtyToAdd;
            productFound = true;
        }
    }
  }

  if (productFound) {
    console.log(`🔫 SCAN: Código ${codigo} (+${qtyToAdd}). Actualizando dashboard...`);
    broadcastUpdate(); // Notificar al frontend instantáneamente
    return res.json({ status: 'ok', message: 'Stock actualizado', codigo, added: qtyToAdd });
  } else {
    console.warn(`⚠️ SCAN: Código ${codigo} no encontrado en producción activa.`);
    // Aún así devolvemos OK para no bloquear al operario, pero no actualizamos nada visual
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
    return res.json({ status: 'reset_ok' });
  }
  res.status(401).json({ error: 'No autorizado' });
});

/**
 * Webhook acumulativo con marca de tiempo
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
    
    // IMPORTANTE: Al recibir nuevo webhook, decidimos si reemplazar o acumular.
    // Para mantener el estado del "stock_fisico" de los escaneos, idealmente deberíamos mergear.
    // Por simplicidad y robustez ante el pedido del usuario ("restablecer"), vamos a concatenar.
    // NOTA: Si Make envía todo de nuevo, se duplicará. Asumimos Make envía DELTAS o el usuario hace reset antes.
    
    allProductionLines = [...allProductionLines, ...zonesWithTime];
    
    console.log(`📥 Webhook: +${req.body.zonas.length} registros. Total: ${allProductionLines.length}`);
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