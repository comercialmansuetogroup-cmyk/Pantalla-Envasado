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

let latestData = null;

// Servir archivos estáticos del directorio actual
app.use(express.static(__dirname));

// Endpoint para que el Frontend obtenga los datos
app.get('/api/data', (req, res) => {
  res.json(latestData);
});

// Endpoint Webhook para Make
app.post('/api/webhook', (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${CUSTOM_DASHBOARD_TOKEN}`;

  if (!authHeader || authHeader !== expectedToken) {
    console.warn(`[!] Intento de acceso no autorizado: ${authHeader}`);
    return res.status(401).json({ error: 'Token inválido' });
  }

  if (req.body && req.body.zonas) {
    latestData = req.body;
    console.log(`[✓] Datos actualizados: ${req.body.zonas.length} registros.`);
    return res.status(200).json({ status: 'ok' });
  }
  
  res.status(400).json({ error: 'Formato de datos incorrecto' });
});

// Evitar servir index.html para archivos que deberían existir
app.get('*', (req, res) => {
  const ext = path.extname(req.url);
  if (ext && ext !== '.html') {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`-----------------------------------------`);
  console.log(`🚀 FACTORYFLOW V3 - PRODUCTION READY`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔑 WEBHOOK TOKEN: Bearer ${CUSTOM_DASHBOARD_TOKEN}`);
  console.log(`-----------------------------------------`);
});