const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'CIM'
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Error al conectar a MySQL:', err.message);
    } else {
        console.log('Conexión a MySQL establecida');
        connection.release();
    }
});

module.exports = db.promise(); // Exporta el pool como promesa