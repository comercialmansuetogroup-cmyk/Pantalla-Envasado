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

// Almacén de estado global (acumulativo por zona/agente)
let globalProductionState = {};

// Servir archivos estáticos
app.use(express.static(__dirname));

// Endpoint para obtener TODA la producción acumulada
app.get('/api/data', (req, res) => {
  res.json({ zonas: Object.values(globalProductionState) });
});

// Endpoint para resetear el dashboard (opcional)
app.post('/api/reset', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${CUSTOM_DASHBOARD_TOKEN}`) {
    globalProductionState = {};
    return res.json({ status: 'reset_ok' });
  }
  res.status(401).json({ error: 'No autorizado' });
});

// Endpoint Webhook para Make (Acumulativo)
app.post('/api/webhook', (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${CUSTOM_DASHBOARD_TOKEN}`;

  if (!authHeader || authHeader !== expectedToken) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  if (req.body && req.body.zonas && Array.isArray(req.body.zonas)) {
    // Actualizamos el estado global zona por zona
    req.body.zonas.forEach(nuevaZona => {
      // Usamos el código de agente o el nombre como ID único para actualizar
      const id = nuevaZona.codigo_agente || nuevaZona.nombre || 'sin-id';
      globalProductionState[id] = nuevaZona;
    });
    
    console.log(`[✓] Estado actualizado. Clientes totales en dashboard: ${Object.keys(globalProductionState).length}`);
    return res.status(200).json({ status: 'ok', activeClients: Object.keys(globalProductionState).length });
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
  console.log(`🚀 SERVIDOR ACUMULATIVO V3 ACTIVO`);
  console.log(`🔑 TOKEN: Bearer ${CUSTOM_DASHBOARD_TOKEN}`);
  console.log(`-----------------------------------------`);
});