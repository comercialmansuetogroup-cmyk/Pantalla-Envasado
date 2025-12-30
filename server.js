const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Almacenamiento en memoria del último JSON recibido de Make
let latestData = null;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// ENDPOINT PARA RECIBIR DATOS DE MAKE (POST)
// La URL completa configurada por el usuario es: https://pantalla-envasado-production.up.railway.app/api/webhook
app.post('/api/webhook', (req, res) => {
  const authHeader = req.headers.authorization;
  // Usamos la variable de entorno que el usuario ya tiene en Railway como secreto
  const expectedToken = `Bearer ${process.env.VITE_MAKE_API_KEY || '563027d1-1af0-4c0e-a385-74cc322f2f66'}`;

  // Validación de seguridad por Token Bearer
  if (!authHeader || authHeader !== expectedToken) {
    console.error('[WEBHOOK ERROR] Intento de conexión no autorizada.');
    return res.status(401).json({ error: 'Autorización fallida. El Bearer token es incorrecto.' });
  }

  console.log('[WEBHOOK SUCCESS] JSON de Producción recibido desde Make.');
  latestData = req.body;
  res.status(200).json({ status: 'success', message: 'Dashboard actualizado' });
});

// ENDPOINT PARA QUE EL FRONTEND LEA LOS DATOS (GET)
app.get('/api/data', (req, res) => {
  res.json(latestData);
});

// Servir archivos estáticos del frontend
app.use(express.static(__dirname));

// Manejo de rutas del frontend (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log('----------------------------------------------------');
  console.log(`FACTORY OPS SERVER ACTIVO EN PUERTO ${PORT}`);
  console.log(`ENDPOINT WEBHOOK: /api/webhook`);
  console.log('----------------------------------------------------');
});
