# Reservas de salas de biblioteca

Aplicación de laboratorio para registrar usuarios y reservar salas por fecha y hora. Angular consume una API de Express y Mongoose que persiste las cuentas y las reservas en MongoDB.

## Arranque local

Se comprobó con Node.js 24.19.0, npm 11.17.0 y MongoDB Community 8.0.4. Los comandos siguientes se ejecutan en PowerShell desde la raíz del repositorio. [Node.js](https://nodejs.org/en/download) · [MongoDB Community para Windows](https://www.mongodb.com/docs/manual/administration/install-community-windows/)

1. Inicia el servicio de MongoDB. Si utilizas el ejecutable `mongod` directamente, puedes mantenerlo abierto en una terminal con un directorio de datos propio.

   ```powershell
   $datosBiblioteca = Join-Path $env:LOCALAPPDATA 'BibliotecaLab03\datos'
   New-Item -ItemType Directory -Force -Path $datosBiblioteca | Out-Null
   mongod --bind_ip 127.0.0.1 --port 27017 --dbpath $datosBiblioteca
   ```

2. En la terminal de la aplicación, instala las dependencias y crea `.env` con una clave aleatoria. Ejecuta la segunda línea una sola vez. Si ya tienes un `.env`, edita ese archivo. La URI inicial apunta a `biblioteca_demo` en el puerto 27017. Ajusta `MONGO_URI` si usas otro puerto o servidor.

   ```powershell
   npm.cmd ci
   node -e "const f=require('node:fs'), c=require('node:crypto'); const s=f.readFileSync('.env.example','utf8').replace('JWT_SECRET=', 'JWT_SECRET='+c.randomBytes(48).toString('hex')); f.writeFileSync('.env',s,{flag:'wx'})"
   ```

3. Instala y compila el cliente. Inicia Express desde la raíz para servir la página y la API en el mismo puerto.

   ```powershell
   npm.cmd --prefix angular ci
   npm.cmd --prefix angular run build
   node index.js
   ```

4. Abre la aplicación, crea una cuenta e inicia sesión. En **Mis reservas** puedes elegir sala, fecha y hora, editar una reserva o eliminarla. La ruta de salud muestra el estado de la conexión a MongoDB. [Abrir la aplicación](http://127.0.0.1:4317) · [Estado del servicio](http://127.0.0.1:4317/api/salud)

Durante el desarrollo puedes mantener `node index.js` en una terminal y ejecutar `npm.cmd --prefix angular start` en otra. Angular atiende el puerto 4200 y su proxy envía `/api/**` a Express en el 4317. [Cliente de desarrollo](http://localhost:4200) · [Proxy de Angular CLI](https://angular.dev/tools/cli/serve)

## API

Las respuestas usan JSON. Las rutas de reservas requieren `Authorization: Bearer <token de sesión>`. Las sesiones duran una hora. El registro admite contraseñas de ocho caracteres como mínimo y de hasta 72 bytes UTF-8.

| Método | Ruta | Entrada | Resultado correcto |
| --- | --- | --- | --- |
| GET | `/api/salud` | — | `200` con estado de la API y de MongoDB |
| POST | `/api/auth/register` | `nombre`, `email`, `password` | `201` con los datos públicos del usuario |
| POST | `/api/auth/login` | `email`, `password` | `200` con el usuario y su JWT de acceso |
| POST | `/api/auth/recover` | `email` | `200` con un mensaje, un JWT de recuperación y `expiraEnMinutos` |
| GET | `/api/reservas` | — | `200` con las reservas del titular |
| POST | `/api/reservas` | `sala`, `fecha`, `hora` | `201` con la reserva creada |
| PUT | `/api/reservas/:id` | Uno o más campos entre `sala`, `fecha`, `hora` | `200` con la reserva actualizada |
| DELETE | `/api/reservas/:id` | — | `200` con la confirmación |

`fecha` usa el formato `AAAA-MM-DD` y `hora` usa `HH:mm` en formato de 24 horas. Una combinación de sala, fecha y hora ocupada produce `409`. La validación reconoce la misma sala si cambia el uso de mayúsculas o la cantidad de espacios. Una reserva ajena o inexistente produce `404`. Las entradas inválidas producen `400` y acceder a las reservas sin una sesión válida produce `401`. Cada error contiene un campo `mensaje`.

La recuperación del laboratorio se simula en pantalla. Para una cuenta registrada, la API devuelve un código de diez minutos destinado exclusivamente a recuperación. La programación de turnos requiere la credencial emitida por el inicio de sesión.

## Postman y Newman

La colección `postman/API Biblioteca.postman_collection.json` genera dos cuentas de prueba y una sala distinta en cada corrida. Sus 26 peticiones comprueban las operaciones de la guía, la recuperación, los conflictos de ocupación y el aislamiento entre cuentas. El ejecutor usa la base `biblioteca_pruebas`. Puedes configurar `MONGO_PRUEBAS_URI` en `.env` para utilizar otra instancia de MongoDB.

Para ejecutar las 59 aserciones con Newman, mantén MongoDB iniciado y usa el siguiente comando. El ejecutor abre un puerto local libre, ejecuta la colección y cierra su servidor HTTP. El estado de salida indica si pasaron las pruebas.

```powershell
npm.cmd test
```

Para guardar un resumen JSON con estados HTTP, respuestas públicas y el resultado de cada aserción, indica el archivo de salida.

```powershell
npm.cmd test -- --resumen resumen-newman.json
```

Para utilizar la interfaz de Postman, ejecuta `npm.cmd run start:pruebas`, importa la colección y elige **Run collection** con las cuatro carpetas en el orden indicado. Su variable `baseUrl` apunta a `http://127.0.0.1:4318`. Cada petición contiene sus comprobaciones en la pestaña de scripts posterior a la respuesta. [Newman, ejecutor de colecciones de Postman](https://learning.postman.com/docs/reference/newman-cli/command-line-integration-with-newman/)
