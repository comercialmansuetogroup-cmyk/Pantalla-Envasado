const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// TOKEN PERSONALIZADO (Este es el que debes usar en Make)
const CUSTOM_DASHBOARD_TOKEN = "DASHBOARD_V3_KEY_2025";

// Asegurar que el navegador entienda los archivos .tsx y .ts como JS
app.use((req, res, next) => {
  if (req.url.endsWith('.tsx') || req.url.endsWith('.ts')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  next();
});

let latestData = null;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Evitar error 404 de favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// WEBHOOK: Endpoint para Make
app.post('/api/webhook', (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${CUSTOM_DASHBOARD_TOKEN}`;

  if (!authHeader || authHeader !== expectedToken) {
    console.warn(`[!] Acceso no autorizado: ${authHeader}`);
    return res.status(401).json({ error: 'Token inválido' });
  }

  if (req.body && req.body.zonas) {
    latestData = req.body;
    console.log(`[✓] DATOS RECIBIDOS: ${req.body.zonas.length} registros nuevos.`);
    return res.status(200).json({ status: 'success' });
  }
  
  res.status(400).json({ error: 'Formato de datos incorrecto' });
});

// GET: El frontend consulta esto cada 5 segundos
app.get('/api/data', (req, res) => {
  res.json(latestData);
});

// Archivos estáticos
app.use(express.static(__dirname));

// Manejo de rutas SPA (Single Page Application)
app.get('*', (req, res) => {
  // Si la ruta pide un archivo real que no existe, damos 404
  if (req.url.includes('.')) {
    return res.status(404).send('Not found');
  }
  // Si no, servimos el index.html
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 DASHBOARD LISTO EN PUERTO: ${PORT}`);
  console.log(`📍 URL WEBHOOK: /api/webhook`);
  console.log(`🔑 TOKEN: Bearer ${CUSTOM_DASHBOARD_TOKEN}`);
  console.log(`=========================================`);
});