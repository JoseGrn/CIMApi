const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true,
        connectionTimeout: 30000,
        integratedSecurity: true // Agregar esta opción
    },
    authentication: {
        type: 'ntlm',
        options: {
            userName: process.env.DB_USERNAME || '', // Asegúrate de que no sea undefined
            password: process.env.DB_PASSWORD || '', // Asegúrate de que no sea undefined
            domain: process.env.DB_DOMAIN || '',     // Deja vacío si no hay dominio
            workstation: process.env.DB_WORKSTATION || '' // Nombre de la máquina local (puede dejarse vacío)
        }
    }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('Conexión a SQL Server establecida');
        return pool;
    })
    .catch(err => {
        console.error('Error al conectar a SQL Server:', err);
    });

module.exports = {
    sql,
    poolPromise
};
