const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Forzar que el navegador trate .tsx y .ts como JavaScript ejecutable
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
// IMPORTANTE: Make debe enviar un POST a /api/webhook
app.post('/api/webhook', (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${process.env.VITE_MAKE_API_KEY || '563027d1-1af0-4c0e-a385-74cc322f2f66'}`;

  if (!authHeader || authHeader !== expectedToken) {
    console.warn('[!] Intento de acceso no autorizado.');
    return res.status(401).json({ error: 'No autorizado' });
  }

  // Validamos que el JSON tenga la estructura "zonas" que envía tu Make
  if (req.body && req.body.zonas) {
    latestData = req.body;
    console.log(`[✓] DATOS RECIBIDOS: ${req.body.zonas.length} líneas desde Make.`);
    return res.status(200).json({ status: 'success' });
  }
  
  console.error('[!] Error: El JSON recibido no tiene el campo "zonas".');
  res.status(400).json({ error: 'Formato inválido. Se espera { "zonas": [...] }' });
});

app.get('/api/data', (req, res) => {
  res.json(latestData);
});

app.use(express.static(__dirname));

app.get('*', (req, res) => {
  if (req.url.includes('.') && !req.url.endsWith('.html')) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SERVER READY ON PORT ${PORT}`);
});
