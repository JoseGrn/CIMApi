const sql = require('mssql');

const dbConfig = {
    server: 'HP5CD1173LS7\\SQLEXPRESS', // Cambia esto si es necesario
    database: 'CIM',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        connectionTimeout: 30000 // Aumenta el tiempo de espera a 30 segundos
    },
    authentication: {
        type: 'ntlm',
        options: {
            domain: '', // Deja vacío si no hay dominio
            workstation: undefined
        }
    }
};

async function testConnection() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('Conexión exitosa a SQL Server');
        pool.close();
    } catch (err) {
        console.error('Error al conectar a SQL Server:', err);
    }
}

testConnection();
