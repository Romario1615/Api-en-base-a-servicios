const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { iniciar, cerrar } = require('../index');

const coleccion = path.join(__dirname, 'API Biblioteca.postman_collection.json');
const modoServidor = process.argv.includes('--servidor');

function ejecutarColeccion(baseUrl) {
  const newman = require('newman');
  return new Promise((resolve, reject) => {
    newman.run({
      collection: coleccion,
      envVar: [{ key: 'baseUrl', value: baseUrl }],
      reporters: 'cli',
      color: 'off',
      timeoutRequest: 10000,
    }, (error, resultado) => error ? reject(error) : resolve(resultado));
  });
}

// El reporte admite sólo campos públicos. Las credenciales viven en la corrida de Newman.
function respuestaPublica(valor) {
  if (Array.isArray(valor)) return valor.map(respuestaPublica);
  if (!valor || typeof valor !== 'object') return null;
  const publico = {};
  const campos = ['estado', 'baseDeDatos', 'mensaje', 'id', '_id', 'sala', 'fecha', 'hora', 'expiraEnMinutos', 'nombre', 'email'];
  for (const campo of campos) {
    if (Object.hasOwn(valor, campo)) publico[campo] = valor[campo];
  }
  if (valor.usuario) publico.usuario = respuestaPublica(valor.usuario);
  if (typeof valor.token === 'string') publico.credencialEmitida = true;
  return publico;
}

function crearResumen(resultado) {
  const { run } = resultado;
  return {
    coleccion: resultado.collection.name,
    generador: 'Newman ' + require('newman/package.json').version,
    inicio: new Date(run.timings.started).toISOString(),
    fin: new Date(run.timings.completed).toISOString(),
    baseDeDatos: 'biblioteca_pruebas',
    peticiones: run.stats.requests.total,
    peticionesFallidas: run.stats.requests.failed,
    aserciones: run.stats.assertions.total,
    asercionesFallidas: run.stats.assertions.failed,
    fallos: run.failures.length,
    ejecuciones: run.executions.map(ejecucion => ({
      nombre: ejecucion.item.name,
      metodo: ejecucion.request.method,
      ruta: ejecucion.request.url.getPath(),
      estadoHTTP: ejecucion.response?.code ?? null,
      duracionMs: ejecucion.response?.responseTime ?? null,
      respuesta: ejecucion.response?.headers.get('Content-Type')?.includes('application/json')
        ? respuestaPublica(ejecucion.response.json())
        : null,
      comprobaciones: (ejecucion.assertions || []).map(prueba => ({
        nombre: prueba.assertion,
        resultado: prueba.skipped ? 'omitida' : prueba.error ? 'falló' : 'pasó',
      })),
    })),
  };
}

async function principal() {
  const indiceResumen = process.argv.indexOf('--resumen');
  const destino = indiceResumen >= 0 ? process.argv[indiceResumen + 1] : null;
  if (indiceResumen >= 0 && !destino) throw new Error('Indica un archivo después de --resumen.');
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  const host = '127.0.0.1';
  const servidor = await iniciar({
    mongoUri: process.env.MONGO_PRUEBAS_URI || process.env.MONGO_URI,
    base: 'biblioteca_pruebas',
    puerto: process.env.PUERTO_PRUEBAS || (modoServidor ? 4318 : 0),
    host,
  });

  if (modoServidor) {
    process.once('SIGINT', () => cerrar(servidor));
    process.once('SIGTERM', () => cerrar(servidor));
    return;
  }
  try {
    const resultado = await ejecutarColeccion('http://' + host + ':' + servidor.address().port);
    if (destino) fs.writeFileSync(destino, JSON.stringify(crearResumen(resultado), null, 2) + '\n');
    if (resultado.run.failures.length) process.exitCode = 1;
  } finally {
    await cerrar(servidor);
  }
}

principal().catch(async error => {
  console.error('La ejecución de pruebas no pudo terminar (' + (error.code || error.name) + '). Comprueba MongoDB, el puerto y la ruta del resumen.');
  await cerrar();
  process.exitCode = 1;
});
