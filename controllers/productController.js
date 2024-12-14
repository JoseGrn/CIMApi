const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Middleware para crear un nuevo producto
const createProduct = async (req, res) => {
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
            return res.status(403).json({ message: 'Acceso denegado, solo los administradores pueden crear productos' });
        }

        // Extraer los datos del producto desde el cuerpo de la solicitud
        const {
            nombre,
            descripcion,
            pesoDisponible,
            precioPorLibra,
            precioPorMediaLibra,
            cantidadMinima,
            tipoEmpaque,
            estado,
            pesoXCaja  // Nuevo campo
        } = req.body;

        // Validar que los campos requeridos estén presentes
        if (!nombre || !pesoDisponible || !precioPorLibra || !precioPorMediaLibra || !cantidadMinima) {
            return res.status(400).json({ message: 'Faltan campos requeridos' });
        }

        // Insertar el nuevo producto en la base de datos
        await db.execute(
            `INSERT INTO Productos 
            (Nombre, Descripcion, PesoDisponible, PrecioPorLibra, PrecioPorMediaLibra, CantidadMinima, TipoEmpaque, Estado, PesoXCaja) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre,
                descripcion || null,
                pesoDisponible,
                precioPorLibra,
                precioPorMediaLibra,
                cantidadMinima,
                tipoEmpaque || null,
                estado !== undefined ? estado : 1,
                pesoXCaja || null  // Nuevo campo
            ]
        );

        res.status(201).json({ message: 'Producto creado exitosamente', producto: nombre });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

const getAllProducts = async (req, res) => {
    try {
        // Extraer y verificar el token del encabezado
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

        // Token válido, proceder con la consulta
        const [products] = await db.execute('SELECT * FROM Productos WHERE Estado = 1');
        res.json({ products });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

// Obtener un producto por su ID
const getProductById = async (req, res) => {
    try {
        // Extraer y verificar el token del encabezado
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

        // Extraer el ID del producto desde los parámetros de la URL
        const { id } = req.params;

        // Consultar el producto por su ID y verificar que esté activo
        const [product] = await db.execute('SELECT * FROM Productos WHERE ProductoID = ? AND Estado = 1', [id]);

        if (product.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado o inactivo' });
        }

        res.json({ product: product[0] });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

const editProduct = async (req, res) => {
    try {
        // Extraer y verificar el token del encabezado
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
            return res.status(403).json({ message: 'Acceso denegado, solo los administradores pueden editar productos' });
        }

        // Extraer el ID del producto desde los parámetros de la URL
        const { id } = req.params;

        // Extraer los datos a actualizar del cuerpo de la solicitud
        const {
            nombre,
            descripcion,
            pesoDisponible,
            precioPorLibra,
            precioPorMediaLibra,
            cantidadMinima,
            tipoEmpaque,
            estado,
            pesoXCaja  // Nuevo campo
        } = req.body;

        // Validar que al menos un campo se va a actualizar
        if (!nombre && !descripcion && !pesoDisponible && !precioPorLibra && !precioPorMediaLibra &&
            !cantidadMinima && !tipoEmpaque && estado === undefined && pesoXCaja === undefined) {
            return res.status(400).json({ message: 'No hay datos para actualizar' });
        }

        // Construir la consulta de actualización dinámicamente
        let updateFields = [];
        let values = [];

        if (nombre) {
            updateFields.push('Nombre = ?');
            values.push(nombre);
        }
        if (descripcion) {
            updateFields.push('Descripcion = ?');
            values.push(descripcion);
        }
        if (pesoDisponible) {
            updateFields.push('PesoDisponible = ?');
            values.push(pesoDisponible);
        }
        if (precioPorLibra) {
            updateFields.push('PrecioPorLibra = ?');
            values.push(precioPorLibra);
        }
        if (precioPorMediaLibra) {
            updateFields.push('PrecioPorMediaLibra = ?');
            values.push(precioPorMediaLibra);
        }
        if (cantidadMinima) {
            updateFields.push('CantidadMinima = ?');
            values.push(cantidadMinima);
        }
        if (tipoEmpaque) {
            updateFields.push('TipoEmpaque = ?');
            values.push(tipoEmpaque);
        }
        if (estado !== undefined) {
            updateFields.push('Estado = ?');
            values.push(estado);
        }
        if (pesoXCaja !== undefined) {
            updateFields.push('PesoXCaja = ?');
            values.push(pesoXCaja);
        }

        values.push(id);

        // Crear la consulta SQL
        const sql = `UPDATE Productos SET ${updateFields.join(', ')} WHERE ProductoID = ?`;

        // Ejecutar la consulta
        const [result] = await db.execute(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Producto no encontrado o no se realizaron cambios' });
        }

        res.json({ message: `Producto con ID ${id} actualizado exitosamente` });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        // Extraer y verificar el token del encabezado
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
            return res.status(403).json({ message: 'Acceso denegado, solo los administradores pueden eliminar productos' });
        }

        // Extraer el ID del producto desde los parámetros de la URL
        const { id } = req.params;

        // Actualizar el campo Estado a 0 para realizar una eliminación lógica
        const [result] = await db.execute('UPDATE Productos SET Estado = 0 WHERE ProductoID = ? AND Estado = 1', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Producto no encontrado o ya está inactivo' });
        }

        res.json({ message: `Producto con ID ${id} eliminado exitosamente` });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

const addInventory = async (req, res) => {
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
            return res.status(403).json({ message: 'Acceso denegado, solo los administradores pueden agregar inventario' });
        }

        // Extraer los productos y cantidades desde el cuerpo de la solicitud
        const { productos } = req.body;

        if (!productos || !Array.isArray(productos) || productos.length === 0) {
            return res.status(400).json({ message: 'Debe proporcionar una lista de productos con sus cantidades' });
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            for (const item of productos) {
                const { productoID, cantidad } = item;

                if (!productoID || !cantidad) {
                    throw new Error('Datos de producto no válidos. Asegúrate de enviar productoID y cantidad.');
                }

                // Obtener el PesoXCaja del producto
                const [result] = await connection.execute(
                    `SELECT PesoXCaja FROM Productos WHERE ProductoID = ? AND Estado = 1`,
                    [productoID]
                );

                if (result.length === 0) {
                    throw new Error(`El producto con ID ${productoID} no existe o está inactivo.`);
                }

                const pesoXCaja = result[0].PesoXCaja;

                if (!pesoXCaja) {
                    throw new Error(`El producto con ID ${productoID} no tiene definido un PesoXCaja.`);
                }

                // Calcular el peso a agregar
                const pesoTotal = cantidad * pesoXCaja;

                // Actualizar el PesoDisponible del producto
                await connection.execute(
                    `UPDATE Productos SET PesoDisponible = PesoDisponible + ? WHERE ProductoID = ?`,
                    [pesoTotal, productoID]
                );
            }

            await connection.commit();
            res.status(200).json({ message: 'Inventario actualizado exitosamente' });
        } catch (err) {
            await connection.rollback();
            res.status(500).json({ message: 'Error al actualizar inventario', error: err.message });
        } finally {
            connection.release();
        }
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

module.exports = { createProduct, getAllProducts, getProductById, editProduct, deleteProduct, addInventory };