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

app.use(express.static(__dirname));

/**
 * Obtener todos los datos acumulados
 */
app.get('/api/data', (req, res) => {
  res.json({ zonas: allProductionLines });
});

/**
 * Reiniciar datos
 */
app.post('/api/reset', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${CUSTOM_DASHBOARD_TOKEN}`) {
    allProductionLines = [];
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
    
    allProductionLines = [...allProductionLines, ...zonesWithTime];
    console.log(`📥 Webhook: +${req.body.zonas.length} registros. Total: ${allProductionLines.length}`);
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