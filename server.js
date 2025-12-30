const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración manual de tipos MIME para evitar el error "application/octet-stream"
express.static.mime.define({
  'application/javascript': ['ts', 'tsx']
});

// Almacenamiento en memoria
let latestData = null;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// WEBHOOK: Recibe datos de Make
app.post('/api/webhook', (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${process.env.VITE_MAKE_API_KEY || '563027d1-1af0-4c0e-a385-74cc322f2f66'}`;

  if (!authHeader || authHeader !== expectedToken) {
    console.error('[!] Error de Seguridad: Token inválido desde Make.');
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (req.body && req.body.zonas) {
    latestData = req.body;
    console.log(`[✓] DATOS RECIBIDOS: ${req.body.zonas.length} líneas procesadas.`);
    return res.status(200).json({ status: 'success' });
  }
  res.status(400).json({ error: 'Formato inválido' });
});

app.get('/api/data', (req, res) => {
  res.json(latestData);
});

// Servir estáticos con la configuración de MIME types activa
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
