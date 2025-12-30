const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para forzar MIME types antes de cualquier otra ruta
app.use((req, res, next) => {
  if (req.url.endsWith('.tsx') || req.url.endsWith('.ts')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  next();
});

// Almacenamiento en memoria (Persiste en Railway hasta el próximo reinicio)
let latestData = null;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// WEBHOOK: Recibe datos de Make
app.post('/api/webhook', (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${process.env.VITE_MAKE_API_KEY || '563027d1-1af0-4c0e-a385-74cc322f2f66'}`;

  if (!authHeader || authHeader !== expectedToken) {
    console.error('[!] Seguridad: Token inválido.');
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (req.body && req.body.zonas) {
    latestData = req.body;
    console.log(`[✓] OK: Recibidos datos de producción.`);
    return res.status(200).json({ status: 'success' });
  }
  res.status(400).json({ error: 'JSON mal formado' });
});

// API para que el Dashboard lea los datos
app.get('/api/data', (req, res) => {
  res.json(latestData);
});

// Servir archivos estáticos
app.use(express.static(__dirname));

// El catch-all solo debe aplicarse si NO es una petición a un archivo .tsx o .js
app.get('*', (req, res) => {
  if (req.url.includes('.') && !req.url.endsWith('.html')) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`FACTORY OPS SERVER: Activo en puerto ${PORT}`);
});
