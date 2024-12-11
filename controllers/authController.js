const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const users = require('../models/User');
const { poolPromise, sql } = require('../config/db');

const register = async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = { username, password: hashedPassword };
    users.push(newUser);

    res.status(201).json({ message: 'Usuario registrado', user: username });
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const pool = await poolPromise;

        // Consulta SQL para verificar si el usuario existe
        const result = await pool.request()
            .input('username', sql.VarChar, username)
            .query('SELECT * FROM Usuarios WHERE Username = @username');

        if (result.recordset.length === 0) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }

        const user = result.recordset[0];

        // Comparar la contraseña ingresada con el hash almacenado
        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Contraseña incorrecta' });
        }

        // Generar un token JWT
        const token = jwt.sign(
            { username: user.Username, rol: user.Rol },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ message: 'Login exitoso', token });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

module.exports = { register, login };