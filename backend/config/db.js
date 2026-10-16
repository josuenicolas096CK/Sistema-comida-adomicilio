// Pool único de MySQL compartido por todas las rutas de la API.
// La ruta absoluta permite iniciar Node desde la raíz o desde backend/.
const mysql = require('mysql2/promise');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Crear el pool de conexiones seguras
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
