const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const auth = require('./routes/auth');
const reservas = require('./routes/reservas');

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: ['http://localhost:4200', 'http://127.0.0.1:4200'] }));
app.use(express.json({ limit: '32kb' }));

app.get('/api/salud', (_req, res) => {
  const conectado = mongoose.connection.readyState === 1;
  res.status(conectado ? 200 : 503).json({
    estado: conectado ? 'ok' : 'no disponible',
    baseDeDatos: conectado ? 'conectada' : 'desconectada',
  });
});
app.use('/api/auth', auth);
app.use('/api/reservas', reservas);
app.use('/api', (_req, res) => res.status(404).json({ mensaje: 'Ruta de API desconocida.' }));

const cliente = path.join(__dirname, 'angular', 'dist', 'biblioteca', 'browser');
const portada = path.join(cliente, 'index.html');
app.use(express.static(cliente));
app.use((req, res, next) => {
  if (req.method === 'GET' && !path.extname(req.path) && req.accepts('html') && fs.existsSync(portada)) {
    return res.sendFile(portada);
  }
  next();
});
app.use((_req, res) => res.status(404).json({ mensaje: 'Recurso no encontrado.' }));

app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === 11000) {
    const mensaje = error.keyPattern?.email
      ? 'Ya existe una cuenta con ese correo.'
      : 'La sala ya está reservada en esa fecha y hora.';
    return res.status(409).json({ mensaje });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ mensaje: Object.values(error.errors)[0].message });
  }
  if (error.type === 'entity.parse.failed') return res.status(400).json({ mensaje: 'El cuerpo debe contener JSON válido.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ mensaje: 'El contenido excede el tamaño permitido.' });
  console.error('Error de la API:', error.name);
  res.status(500).json({ mensaje: 'No se pudo completar la operación.' });
});

module.exports = app;
