const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const users = require('../models/User');
const db = require('../config/db');

const register = async (req, res) => {
    try {
        // Extraer los datos del nuevo usuario del cuerpo de la solicitud
        const { nombre, apellido, username, password, email, rol } = req.body;

        // Verificar que el usuario autenticado tenga un token válido
        const token = req.header('Authorization');
        if (!token) {
            return res.status(401).json({ message: 'Acceso denegado, no hay token' });
        }

        // Verificar el token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Token no válido' });
        }

        // Verificar si el rol del usuario autenticado es 'Administrador'
        if (decoded.rol !== 'Administrador') {
            return res.status(403).json({ message: 'Acceso denegado, solo los administradores pueden registrar usuarios' });
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar el nuevo usuario en la base de datos
        await db.execute(
            'INSERT INTO Usuarios (Nombre, Apellido, Username, PasswordHash, Email, Rol) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, apellido, username, hashedPassword, email, rol]
        );

        res.status(201).json({ message: 'Usuario registrado exitosamente', user: username });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Consulta SQL para verificar si el usuario existe
        const [rows] = await db.execute('SELECT * FROM Usuarios WHERE Username = ?', [username]);

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }

        const user = rows[0];

        // Comparar la contraseña ingresada con el hash almacenado
        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
            { id: user.UsuarioID, username: user.Username, rol: user.Rol },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );        

        res.json({ message: 'Login exitoso', token });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        // Extraer el token del encabezado
        const token = req.header('Authorization');
        if (!token) {
            return res.status(401).json({ message: 'Acceso denegado, no hay token' });
        }

        // Verificar el token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Token no válido' });
        }

        // Verificar si el rol del usuario autenticado es 'Administrador'
        if (decoded.rol !== 'Administrador') {
            return res.status(403).json({ message: 'Acceso denegado, solo los administradores pueden eliminar usuarios' });
        }

        // Extraer el ID del usuario a desactivar desde los parámetros de la URL
        const { id } = req.params;

        // Actualizar el campo Estado a 0 en la base de datos
        const [result] = await db.execute(
            'UPDATE Usuarios SET Estado = 0 WHERE UsuarioID = ? AND Estado = 1',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o ya desactivado' });
        }

        res.json({ message: `Usuario con ID ${id} desactivado exitosamente` });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

const editUser = async (req, res) => {
    try {
        // Extraer el token del encabezado
        const token = req.header('Authorization');
        if (!token) {
            return res.status(401).json({ message: 'Acceso denegado, no hay token' });
        }

        // Verificar el token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Token no válido' });
        }

        // Verificar si el rol del usuario autenticado es 'Administrador'
        if (decoded.rol !== 'Administrador') {
            return res.status(403).json({ message: 'Acceso denegado, solo los administradores pueden editar usuarios' });
        }

        // Extraer el ID del usuario a editar desde los parámetros de la URL
        const { id } = req.params;

        // Extraer los datos a actualizar del cuerpo de la solicitud
        const { nombre, apellido, email, rol, estado } = req.body;

        // Validar que al menos un campo se va a actualizar
        if (!nombre && !apellido && !email && !rol && estado === undefined) {
            return res.status(400).json({ message: 'No hay datos para actualizar' });
        }

        // Construir la consulta de actualización dinámicamente
        let updateFields = [];
        let values = [];

        if (nombre) {
            updateFields.push('Nombre = ?');
            values.push(nombre);
        }
        if (apellido) {
            updateFields.push('Apellido = ?');
            values.push(apellido);
        }
        if (email) {
            updateFields.push('Email = ?');
            values.push(email);
        }
        if (rol) {
            updateFields.push('Rol = ?');
            values.push(rol);
        }
        if (estado !== undefined) {
            updateFields.push('Estado = ?');
            values.push(estado);
        }

        values.push(id);

        // Crear la consulta SQL
        const sql = `UPDATE Usuarios SET ${updateFields.join(', ')} WHERE UsuarioID = ?`;

        // Ejecutar la consulta
        const [result] = await db.execute(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o no se realizaron cambios' });
        }

        res.json({ message: `Usuario con ID ${id} actualizado exitosamente` });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        // Extraer el token del encabezado
        const token = req.header('Authorization');
        if (!token) {
            return res.status(401).json({ message: 'Acceso denegado, no hay token' });
        }

        // Verificar el token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Token no válido' });
        }

        // Verificar si el rol del usuario autenticado es 'Administrador'
        if (decoded.rol !== 'Administrador') {
            return res.status(403).json({ message: 'Acceso denegado, solo los administradores pueden ver usuarios' });
        }

        // Consultar todos los usuarios activos
        const [users] = await db.execute('SELECT * FROM Usuarios WHERE Estado = 1');

        res.json({ users });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

// Obtener un usuario por su ID
const getUserById = async (req, res) => {
    try {
        // Extraer el token del encabezado
        const token = req.header('Authorization');
        if (!token) {
            return res.status(401).json({ message: 'Acceso denegado, no hay token' });
        }

        // Verificar el token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Token no válido' });
        }

        // Verificar si el rol del usuario autenticado es 'Administrador'
        if (decoded.rol !== 'Administrador') {
            return res.status(403).json({ message: 'Acceso denegado, solo los administradores pueden ver usuarios' });
        }

        // Extraer el ID del usuario desde los parámetros de la URL
        const { id } = req.params;

        // Consultar el usuario por su ID y verificar que esté activo
        const [user] = await db.execute('SELECT * FROM Usuarios WHERE UsuarioID = ? AND Estado = 1', [id]);

        if (user.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o inactivo' });
        }

        res.json({ user: user[0] });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

// Obtener el rol del usuario a partir del token
const getUserRole = async (req, res) => {
    try {
        // Extraer el token del encabezado
        const token = req.header('Authorization');
        if (!token) {
            return res.status(401).json({ message: 'Acceso denegado, no hay token' });
        }

        // Verificar el token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Token no válido' });
        }

        // Extraer el rol y el username del payload del token
        const { rol, username } = decoded;

        res.json({ message: `${rol}` });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

module.exports = { register, login, deleteUser, editUser, getAllUsers, getUserById, getUserRole };