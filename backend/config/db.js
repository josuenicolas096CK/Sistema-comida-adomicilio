const mysql = require('mysql2/promise');
require('dotenv').config();

// Crear el pool de conexiones seguras
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Probar la conexión
async function probarConexion() {
    try {
        const connection = await pool.getConnection();
        console.log('¡Conexión exitosa a la base de datos MySQL! 🔗');
        connection.release();
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error.message);
    }
}

probarConexion();

module.exports = pool;