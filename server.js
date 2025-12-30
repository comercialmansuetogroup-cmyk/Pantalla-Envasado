const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Almacenamiento en memoria del último JSON recibido
let latestData = null;

app.use(cors());
app.use(bodyParser.json());

// ENDPOINT PARA RECIBIR DATOS DE MAKE (POST)
app.post('/api/webhook', (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${process.env.VITE_MAKE_API_KEY}`;

  // Validación de seguridad
  if (!authHeader || authHeader !== expectedToken) {
    console.error('Petición no autorizada recibida en el Webhook');
    return res.status(401).json({ error: 'No autorizado. El Bearer token es incorrecto.' });
  }

  console.log('Datos recibidos desde Make correctamente');
  latestData = req.body;
  res.status(200).json({ message: 'Datos recibidos y actualizados en el dashboard' });
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
  console.log(`Servidor de Fábrica ejecutándose en puerto ${PORT}`);
  console.log(`Configura Make para enviar POST a: /api/webhook`);
});
