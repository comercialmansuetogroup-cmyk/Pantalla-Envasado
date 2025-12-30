const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Almacenamiento en memoria (Persiste mientras el proceso esté vivo en Railway)
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
    console.log(`[✓] DATOS RECIBIDOS: ${req.body.zonas.length} líneas de producción procesadas.`);
    // Log para depuración manual en la consola de Railway
    const clientes = req.body.zonas.map(z => z.codigo_agente).filter((v, i, a) => a.indexOf(v) === i);
    console.log(`[i] Clientes detectados en el lote: ${clientes.join(', ')}`);
    
    return res.status(200).json({ status: 'success' });
  }

  console.warn('[!] Webhook recibido pero el JSON no tiene el formato esperado (falta "zonas").');
  res.status(400).json({ error: 'Formato inválido' });
});

// API: Entrega datos al Frontend
app.get('/api/data', (req, res) => {
  if (!latestData) {
    console.log('[i] Frontend solicitó datos pero el buffer está vacío (esperando a Make).');
  }
  res.json(latestData);
});

app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
  ================================================
  FACTORY OPS: SERVER ONLINE
  Puerto: ${PORT}
  Webhook: /api/webhook
  ================================================
  `);
});
