const mysql = require('mysql2/promise');
require('dotenv').config({ path: './env/.env' });

// Logs iniciales utiles para validar que .env fue cargado.
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_DATABASE:', process.env.DB_DATABASE);

const pool = mysql.createPool({
    // Pool de conexiones reutilizable para todo el proyecto.
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 30000,
    connectTimeout: 10000
});

(async () => {
    try {
        // Prueba de conexion al iniciar la app.
        const conn = await pool.getConnection();
        console.log('¡Conectado a MySQL correctamente!');
        conn.release();
    } catch (error) {
        console.log('ERROR REAL MYSQL:', error.message);
    }
})();

module.exports = pool;
