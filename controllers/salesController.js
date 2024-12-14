const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Crear una nueva venta con sus detalles
const createSale = async (req, res) => {
    try {
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

        const usuarioID = decoded.id;

        const { tipoVenta, ganancia, detalleVenta, productos, combos } = req.body;

        if ((!productos || !Array.isArray(productos) || productos.length === 0) &&
            (!combos || !Array.isArray(combos) || combos.length === 0)) {
            return res.status(400).json({ message: 'Debe haber al menos un producto o combo en la venta' });
        }

        let totalVenta = 0;

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Calcular el total de los combos utilizando el precio del combo
            if (combos && combos.length > 0) {
                for (const combo of combos) {
                    const { comboID, cantidad } = combo;

                    if (!comboID || !cantidad) {
                        throw new Error('Datos de combo no válidos. Asegúrate de enviar comboID y cantidad.');
                    }

                    // Obtener el precio del combo
                    const [comboResult] = await connection.execute(
                        `SELECT PrecioCombo FROM Combos WHERE ComboID = ? AND Estado = 1`,
                        [comboID]
                    );

                    if (comboResult.length === 0) {
                        throw new Error(`El combo con ID ${comboID} no existe o está inactivo.`);
                    }

                    const precioCombo = comboResult[0].PrecioCombo;
                    const subtotalCombo = precioCombo * cantidad;

                    totalVenta += subtotalCombo;
                }
            }

            // Calcular el total de los productos individuales
            if (productos && productos.length > 0) {
                for (const producto of productos) {
                    const { productoID, cantidad, subtotal } = producto;

                    if (!productoID || !cantidad || !subtotal) {
                        throw new Error('Datos de producto no válidos. Asegúrate de enviar productoID, cantidad y subtotal.');
                    }

                    totalVenta += subtotal;
                }
            }

            // Insertar la venta en la tabla Ventas
            const [ventaResult] = await connection.execute(
                `INSERT INTO Ventas (UsuarioID, TotalVenta, TipoVenta, Ganancia, DetalleVenta) 
                 VALUES (?, ?, ?, ?, ?)`,
                [usuarioID, totalVenta, tipoVenta, ganancia, detalleVenta || null]
            );

            const ventaID = ventaResult.insertId;

            // Insertar productos individuales en DetalleVenta y actualizar inventario
            if (productos && productos.length > 0) {
                for (const producto of productos) {
                    const { productoID, cantidad, subtotal } = producto;

                    await connection.execute(
                        `INSERT INTO DetalleVenta (VentaID, ProductoID, Cantidad, Subtotal) 
                         VALUES (?, ?, ?, ?)`,
                        [ventaID, productoID, cantidad, subtotal]
                    );

                    await connection.execute(
                        `UPDATE Productos SET PesoDisponible = PesoDisponible - ? WHERE ProductoID = ? AND PesoDisponible >= ?`,
                        [cantidad, productoID, cantidad]
                    );
                }
            }

            // Insertar los detalles de los combos en DetalleVenta y actualizar inventario
            if (combos && combos.length > 0) {
                for (const combo of combos) {
                    const { comboID, cantidad } = combo;

                    // Obtener los detalles del combo
                    const [comboDetails] = await connection.execute(
                        `SELECT dc.ProductoID, dc.Cantidad AS CantidadProducto, p.PrecioPorLibra
                         FROM DetalleCombo dc
                         JOIN Productos p ON dc.ProductoID = p.ProductoID
                         WHERE dc.ComboID = ?`,
                        [comboID]
                    );

                    for (const detail of comboDetails) {
                        const { ProductoID, CantidadProducto, PrecioPorLibra } = detail;

                        const subtotal = CantidadProducto * cantidad * PrecioPorLibra;

                        await connection.execute(
                            `INSERT INTO DetalleVenta (VentaID, ProductoID, Cantidad, Subtotal) 
                             VALUES (?, ?, ?, ?)`,
                            [ventaID, ProductoID, CantidadProducto * cantidad, subtotal]
                        );

                        await connection.execute(
                            `UPDATE Productos SET PesoDisponible = PesoDisponible - ? WHERE ProductoID = ? AND PesoDisponible >= ?`,
                            [CantidadProducto * cantidad, ProductoID, CantidadProducto * cantidad]
                        );
                    }
                }
            }

            await connection.commit();
            res.status(201).json({ message: 'Venta creada exitosamente', ventaID });
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

// Obtener todas las ventas
const getAllSales = async (req, res) => {
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

        const [sales] = await db.execute(
            `SELECT v.*, u.Nombre, u.Apellido 
             FROM Ventas v
             JOIN Usuarios u ON v.UsuarioID = u.UsuarioID`
        );

        res.json({ sales });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

// Obtener una venta por su ID con los detalles de los productos asociados
const getSaleById = async (req, res) => {
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

        const { id } = req.params;

        // Obtener la venta
        const [sale] = await db.execute(
            `SELECT v.*, u.Nombre, u.Apellido 
             FROM Ventas v
             JOIN Usuarios u ON v.UsuarioID = u.UsuarioID
             WHERE v.VentaID = ?`,
            [id]
        );

        if (sale.length === 0) {
            return res.status(404).json({ message: 'Venta no encontrada' });
        }

        // Obtener los detalles de la venta
        const [saleDetails] = await db.execute(
            `SELECT dv.DetalleVentaID, dv.ProductoID, p.Nombre, dv.Cantidad, dv.Subtotal
             FROM DetalleVenta dv
             JOIN Productos p ON dv.ProductoID = p.ProductoID
             WHERE dv.VentaID = ?`,
            [id]
        );

        res.json({ venta: sale[0], detalles: saleDetails });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

// Obtener ventas agrupadas por día
const getSalesByDay = async (req, res) => {
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

        const [sales] = await db.execute(`
            SELECT DATE(FechaVenta) AS fecha, SUM(TotalVenta) AS total
            FROM Ventas
            WHERE FechaVenta >= CURDATE() - INTERVAL 7 DAY
            GROUP BY DATE(FechaVenta)
            ORDER BY fecha DESC
        `);

        res.json({ sales });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

// Obtener ventas totales de la semana
const getSalesByWeek = async (req, res) => {
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

        const [sales] = await db.execute(`
            SELECT YEARWEEK(FechaVenta, 1) AS semana, SUM(TotalVenta) AS total
            FROM Ventas
            WHERE FechaVenta >= CURDATE() - INTERVAL 1 MONTH
            GROUP BY YEARWEEK(FechaVenta, 1)
            ORDER BY semana DESC
        `);

        res.json({ sales });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

// Obtener ventas totales del mes actual con el último día del mes
const getSalesByMonth = async (req, res) => {
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

        const [sales] = await db.execute(`
            SELECT 
                LAST_DAY(CURDATE()) AS fecha, 
                SUM(TotalVenta) AS total
            FROM Ventas
            WHERE YEAR(FechaVenta) = YEAR(CURDATE()) AND MONTH(FechaVenta) = MONTH(CURDATE())
        `);

        res.json({ sales });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor', error: err.message });
    }
};

module.exports = { createSale, getAllSales, getSaleById, getSalesByDay, getSalesByWeek, getSalesByMonth };
