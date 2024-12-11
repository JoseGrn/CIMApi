const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Crear un nuevo combo con sus detalles
const createCombo = async (req, res) => {
    try {
        // Validar el token
        const token = req.header('Authorization');
        if (!token) return res.status(401).json({ message: 'Acceso denegado, no hay token' });

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Token no válido' });
        }

        // Verificar rol de administrador
        if (decoded.rol !== 'Administrador') {
            return res.status(403).json({ message: 'Acceso denegado, solo los administradores pueden crear combos' });
        }

        const { nombreCombo, descripcion, precioCombo, productos } = req.body;

        if (!nombreCombo || !precioCombo || !productos || !Array.isArray(productos) || productos.length === 0) {
            return res.status(400).json({ message: 'Faltan campos requeridos o productos no válidos' });
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Insertar el combo en la tabla Combos
            const [comboResult] = await connection.execute(
                `INSERT INTO Combos (NombreCombo, Descripcion, PrecioCombo) VALUES (?, ?, ?)`,
                [nombreCombo, descripcion, precioCombo]
            );

            const comboID = comboResult.insertId;

            // Insertar los detalles del combo en la tabla DetalleCombo
            for (const producto of productos) {
                const { productoID, cantidad } = producto;
                if (!productoID || !cantidad) throw new Error('Datos de producto no válidos');

                await connection.execute(
                    `INSERT INTO DetalleCombo (ComboID, ProductoID, Cantidad) VALUES (?, ?, ?)`,
                    [comboID, productoID, cantidad]
                );
            }

            await connection.commit();
            res.status(201).json({ message: 'Combo creado exitosamente', comboID });
        } catch (err) {
            await connection.rollback();
            res.status(500).json({ message: 'Error del servidor', error: err.message });
        } finally {
            connection.release();
        }
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

// Obtener todos los combos activos
const getAllCombos = async (req, res) => {
    try {
        // Validar el token
        const token = req.header('Authorization');
        if (!token) return res.status(401).json({ message: 'Acceso denegado, no hay token' });

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Token no válido' });
        }

        const [combos] = await db.execute('SELECT * FROM Combos WHERE Estado = 1');
        res.json({ combos });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

// Obtener un combo por su ID con los detalles de los productos asociados
const getComboById = async (req, res) => {
    try {
        // Validar el token
        const token = req.header('Authorization');
        if (!token) return res.status(401).json({ message: 'Acceso denegado, no hay token' });

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Token no válido' });
        }

        // Extraer el ID del combo desde los parámetros
        const { id } = req.params;

        // Obtener el combo
        const [combo] = await db.execute('SELECT * FROM Combos WHERE ComboID = ? AND Estado = 1', [id]);

        if (combo.length === 0) {
            return res.status(404).json({ message: 'Combo no encontrado o inactivo' });
        }

        // Obtener los detalles del combo
        const [detalleCombo] = await db.execute(
            `SELECT dc.DetalleComboID, dc.ProductoID, p.Nombre, dc.Cantidad
             FROM DetalleCombo dc
             JOIN Productos p ON dc.ProductoID = p.ProductoID
             WHERE dc.ComboID = ?`,
            [id]
        );

        res.json({ combo: combo[0], productos: detalleCombo });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

const editCombo = async (req, res) => {
    try {
        // Validar el token
        const token = req.header('Authorization');
        if (!token) {
            return res.status(401).json({ message: 'Acceso denegado, no hay token' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Token no válido' });
        }

        // Verificar si el rol del usuario autenticado es 'Administrador'
        if (decoded.rol !== 'Administrador') {
            return res.status(403).json({ message: 'Acceso denegado, solo los administradores pueden editar combos' });
        }

        // Extraer el ID del combo desde los parámetros
        const { id } = req.params;

        // Extraer los datos a actualizar del cuerpo de la solicitud
        const { nombreCombo, descripcion, precioCombo, estado, productos } = req.body;

        // Validar que los campos requeridos estén presentes
        if (!nombreCombo && !descripcion && !precioCombo && estado === undefined && !productos) {
            return res.status(400).json({ message: 'No hay datos para actualizar' });
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Actualizar los datos del combo en la tabla Combos
            const updateFields = [];
            const values = [];

            if (nombreCombo) {
                updateFields.push('NombreCombo = ?');
                values.push(nombreCombo);
            }
            if (descripcion) {
                updateFields.push('Descripcion = ?');
                values.push(descripcion);
            }
            if (precioCombo) {
                updateFields.push('PrecioCombo = ?');
                values.push(precioCombo);
            }
            if (estado !== undefined) {
                updateFields.push('Estado = ?');
                values.push(estado);
            }

            if (updateFields.length > 0) {
                values.push(id);
                await connection.execute(
                    `UPDATE Combos SET ${updateFields.join(', ')} WHERE ComboID = ?`,
                    values
                );
            }

            // Actualizar los detalles del combo si se proporcionan productos
            if (productos && Array.isArray(productos) && productos.length > 0) {
                // Eliminar los detalles actuales del combo
                await connection.execute('DELETE FROM DetalleCombo WHERE ComboID = ?', [id]);

                // Insertar los nuevos detalles del combo
                for (const producto of productos) {
                    const { productoID, cantidad } = producto;
                    if (!productoID || !cantidad) {
                        throw new Error('Datos de producto no válidos');
                    }

                    await connection.execute(
                        `INSERT INTO DetalleCombo (ComboID, ProductoID, Cantidad) VALUES (?, ?, ?)`,
                        [id, productoID, cantidad]
                    );
                }
            }

            await connection.commit();
            res.json({ message: `Combo con ID ${id} actualizado exitosamente` });
        } catch (err) {
            await connection.rollback();
            res.status(500).json({ message: 'Error del servidor', error: err.message });
        } finally {
            connection.release();
        }
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

const deleteCombo = async (req, res) => {
    try {
        // Validar el token
        const token = req.header('Authorization');
        if (!token) {
            return res.status(401).json({ message: 'Acceso denegado, no hay token' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Token no válido' });
        }

        // Verificar si el rol del usuario autenticado es 'Administrador'
        if (decoded.rol !== 'Administrador') {
            return res.status(403).json({ message: 'Acceso denegado, solo los administradores pueden eliminar combos' });
        }

        // Extraer el ID del combo desde los parámetros
        const { id } = req.params;

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Desactivar el combo en la tabla Combos
            const [comboResult] = await connection.execute(
                'UPDATE Combos SET Estado = 0 WHERE ComboID = ? AND Estado = 1',
                [id]
            );

            if (comboResult.affectedRows === 0) {
                return res.status(404).json({ message: 'Combo no encontrado o ya está inactivo' });
            }

            // Desactivar los detalles del combo en la tabla DetalleCombo
            await connection.execute(
                'UPDATE DetalleCombo SET Cantidad = 0 WHERE ComboID = ?',
                [id]
            );

            await connection.commit();
            res.json({ message: `Combo con ID ${id} eliminado exitosamente` });
        } catch (err) {
            await connection.rollback();
            res.status(500).json({ message: 'Error del servidor', error: err.message });
        } finally {
            connection.release();
        }
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

module.exports = { createCombo, getAllCombos, getComboById, editCombo, deleteCombo };
