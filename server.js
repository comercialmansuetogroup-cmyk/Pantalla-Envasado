
const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// TOKEN PERSONALIZADO (Cópialo para Make)
const CUSTOM_DASHBOARD_TOKEN = "DASHBOARD_V3_KEY_2025";

// Middleware para asegurar que los archivos .tsx se sirvan con el tipo correcto
app.use((req, res, next) => {
  if (req.url.endsWith('.tsx') || req.url.endsWith('.ts')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  next();
});

let latestData = null;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Silenciar error de favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// WEBHOOK: Recibe datos de Make (POST)
app.post('/api/webhook', (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${CUSTOM_DASHBOARD_TOKEN}`;

  if (!authHeader || authHeader !== expectedToken) {
    console.warn(`[!] Acceso denegado. Se esperaba: ${expectedToken}`);
    return res.status(401).json({ error: 'Token de Dashboard inválido' });
  }

  if (req.body && req.body.zonas) {
    latestData = req.body;
    console.log(`[✓] ÉXITO: Recibidos datos de ${req.body.zonas.length} zonas.`);
    return res.status(200).json({ status: 'success' });
  }
  
  res.status(400).json({ error: 'JSON mal formado' });
});

// API para el Frontend
app.get('/api/data', (req, res) => {
  res.json(latestData);
});

// Servir archivos estáticos DESDE LA RAÍZ
app.use(express.static(path.join(__dirname, '.')));

// El catch-all solo para rutas de navegación (no archivos con puntos)
app.get('*', (req, res) => {
  if (req.url.includes('.')) {
    return res.status(404).send('Archivo no encontrado');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`-----------------------------------------`);
  console.log(`DASHBOARD ACTIVO EN PUERTO: ${PORT}`);
  console.log(`WEBHOOK URL: /api/webhook`);
  console.log(`TOKEN REQUERIDO: Bearer ${CUSTOM_DASHBOARD_TOKEN}`);
  console.log(`-----------------------------------------`);
});
