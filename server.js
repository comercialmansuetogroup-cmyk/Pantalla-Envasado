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

// Almacén en memoria persistente durante la vida del proceso
let allProductionLines = [];

app.use(express.static(__dirname));

/**
 * Obtener todos los datos acumulados
 */
app.get('/api/data', (req, res) => {
  res.json({ zonas: allProductionLines });
});

/**
 * Endpoint para limpiar el dashboard (Opcional, requiere token)
 */
app.post('/api/reset', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${CUSTOM_DASHBOARD_TOKEN}`) {
    allProductionLines = [];
    console.log("♻️  Buffer de producción reiniciado");
    return res.json({ status: 'reset_ok' });
  }
  res.status(401).json({ error: 'No autorizado' });
});

/**
 * Endpoint Webhook para Make (ACUMULATIVO)
 * Los datos se añaden al buffer actual, no se reemplazan.
 */
app.post('/api/webhook', (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${CUSTOM_DASHBOARD_TOKEN}`;

  if (!authHeader || authHeader !== expectedToken) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  if (req.body && req.body.zonas && Array.isArray(req.body.zonas)) {
    // IMPORTANTE: Concatenamos los datos nuevos con los existentes para persistencia
    allProductionLines = [...allProductionLines, ...req.body.zonas];
    console.log(`📥 Recibidos ${req.body.zonas.length} registros desde Make. Total en memoria: ${allProductionLines.length}`);
    return res.status(200).json({ status: 'ok', total_records: allProductionLines.length });
  }
  
  res.status(400).json({ error: 'Formato de datos incorrecto. Se espera un objeto con "zonas" (array).' });
});

app.get('*', (req, res) => {
  const ext = path.extname(req.url);
  if (ext && ext !== '.html') return res.status(404).send('Not found');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 FACTORYFLOW V4 - PERSISTENCIA ACTIVA EN PUERTO ${PORT}`);
});