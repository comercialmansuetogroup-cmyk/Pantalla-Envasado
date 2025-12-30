const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// TOKEN FIJO para Make
const CUSTOM_DASHBOARD_TOKEN = "DASHBOARD_V3_KEY_2025";

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Almacén de producción (Acumulativo)
// Aquí guardaremos cada línea de pedido recibida sin sobrescribir nada
let allProductionLines = [];

// Servir archivos estáticos
app.use(express.static(__dirname));

// Endpoint para obtener TODA la producción acumulada
app.get('/api/data', (req, res) => {
  res.json({ zonas: allProductionLines });
});

// Endpoint para resetear el dashboard (Limpieza diaria)
app.post('/api/reset', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${CUSTOM_DASHBOARD_TOKEN}`) {
    allProductionLines = [];
    console.log(`[!] Dashboard reseteado.`);
    return res.json({ status: 'reset_ok' });
  }
  res.status(401).json({ error: 'No autorizado' });
});

// Endpoint Webhook para Make (ACUMULACIÓN REAL)
app.post('/api/webhook', (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${CUSTOM_DASHBOARD_TOKEN}`;

  if (!authHeader || authHeader !== expectedToken) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  if (req.body && req.body.zonas && Array.isArray(req.body.zonas)) {
    // AÑADIMOS los nuevos registros al historial actual en lugar de reemplazarlos
    allProductionLines = [...allProductionLines, ...req.body.zonas];
    
    console.log(`[✓] Lote recibido. Total líneas acumuladas: ${allProductionLines.length}`);
    return res.status(200).json({ 
      status: 'ok', 
      newLines: req.body.zonas.length,
      totalLines: allProductionLines.length 
    });
  }
  
  res.status(400).json({ error: 'Formato de datos incorrecto' });
});

app.get('*', (req, res) => {
  const ext = path.extname(req.url);
  if (ext && ext !== '.html') return res.status(404).send('Not found');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`-----------------------------------------`);
  console.log(`🚀 FACTORYFLOW V3 - MODO ACUMULATIVO`);
  console.log(`📦 Líneas en memoria: ${allProductionLines.length}`);
  console.log(`🔑 TOKEN: Bearer ${CUSTOM_DASHBOARD_TOKEN}`);
  console.log(`-----------------------------------------`);
});