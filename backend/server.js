// Punto de entrada HTTP: entrega el frontend y monta la API en el mismo origen.
const express = require('express');
const cors = require('cors');
const path = require('node:path');
const pool = require('./config/db');
const productosRoutes = require('./routes/productos');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', productosRoutes);
app.use('/docs/img', express.static(path.join(__dirname, '../docs/img')));
app.use(express.static(path.join(__dirname, '../frontend')));

// Solo escucha cuando la configuración es válida y MySQL responde.
// La prueba integral reutiliza esta función con un puerto propio (3102).
async function start(port = process.env.PORT || 3002) {
    const number = Number(port);
    if (!Number.isInteger(number) || number < 1 || number > 65535) {
        throw new Error('PORT debe ser un número entre 1 y 65535 en backend/.env.');
    }
    for (const name of ['DB_HOST', 'DB_USER', 'DB_NAME']) {
        if (!process.env[name]) throw new Error(`Falta ${name} en backend/.env. Ejecuta npm install y revisa ese archivo.`);
    }
    try {
        await pool.query('SELECT 1');
    } catch (error) {
        throw new Error(`No se pudo conectar a MySQL (${error.code || error.message}). Inicia MySQL y revisa backend/.env: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME.`, { cause: error });
    }
    return new Promise((resolve, reject) => {
        const server = app.listen(number);
        server.once('error', error => {
            reject(new Error(error.code === 'EADDRINUSE'
                ? `El puerto ${number} ya está ocupado. Cierra el servidor anterior o cambia PORT en backend/.env.`
                : `No se pudo abrir el puerto ${number}: ${error.message}`, { cause: error }));
        });
        server.once('listening', () => {
            console.log(`MySQL conectado. Abre http://127.0.0.1:${number}/`);
            resolve(server);
        });
    });
}

// Al ejecutar `node server.js` se inicia; al importarlo se exporta start().
if (require.main === module) {
    start().catch(error => {
        console.error(`Error al iniciar: ${error.message}`);
        process.exitCode = 1;
        pool.end().catch(() => {});
    });
}

module.exports = { app, start };
