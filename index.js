const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const mongoose = require('mongoose');
const app = require('./server');
const Usuario = require('./models/Usuario');
const Reserva = require('./models/Reserva');

async function iniciar({
  mongoUri = process.env.MONGO_URI, base, puerto = process.env.PORT || 4317, host = process.env.HOST || '127.0.0.1',
} = {}) {
  if (!mongoUri || !process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32) {
    throw new Error('Configura MONGO_URI y una JWT_SECRET de al menos 32 bytes en .env.');
  }
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000, ...(base ? { dbName: base } : {}) });
  await Promise.all([Usuario.init(), Reserva.init()]);
  console.log('MongoDB conectado | base ' + mongoose.connection.name + ' | índices listos');

  const servidor = await new Promise((resolve, reject) => {
    const http = app.listen(Number(puerto), host, () => resolve(http));
    http.once('error', reject);
  });
  console.log('API Biblioteca disponible en http://' + host + ':' + servidor.address().port);
  return servidor;
}

async function cerrar(servidor) {
  try {
    if (servidor) await new Promise(resolve => servidor.close(resolve));
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  iniciar().then(servidor => {
    process.once('SIGINT', () => cerrar(servidor));
    process.once('SIGTERM', () => cerrar(servidor));
  }).catch(async error => {
    const configuracion = error.message.startsWith('Configura MONGO_URI');
    console.error(configuracion ? error.message : 'No se pudo iniciar la API (' + (error.code || error.name) + '). Revisa MongoDB y el puerto.');
    await cerrar();
    process.exitCode = 1;
  });
}

module.exports = { iniciar, cerrar };
