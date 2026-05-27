const db = require('../database/db')

const OrdenModel = {

    // Lista puntos activos para entregas de tipo recogida.
    getPuntosEncuentro: async () => {
        const [rows] = await db.query(
            'SELECT * FROM punto_encuentro WHERE activo = 1 ORDER BY nombre'
        )
        return rows
    },

    // Crea la cabecera de la orden.
    crearOrden: async ({ id_usuario, total, modalidad_entrega, direccion_envio, id_punto_encuentro }) => {
        const [result] = await db.query(
            `INSERT INTO orden (id_usuario, total, estado, modalidad_entrega, direccion_envio, id_punto_encuentro, fecha_orden)
             VALUES (?, ?, 'pendiente', ?, ?, ?, NOW())`,
            [id_usuario, total, modalidad_entrega, direccion_envio || null, id_punto_encuentro || null]
        )
        return result.insertId
    },

    // Inserta los items comprados y descuenta stock por producto.
    crearDetalles: async (id_orden, items) => {
        for (const item of items) {
            await db.query(
                `INSERT INTO detalle_orden (id_orden, id_producto, cantidad, precio_unitario, subtotal)
                 VALUES (?, ?, ?, ?, ?)`,
                [id_orden, item.id_producto, item.cantidad, item.precio, item.precio * item.cantidad]
            )
            // Descontar stock
            await db.query(
                'UPDATE productos SET stock = stock - ? WHERE id_producto = ?',
                [item.cantidad, item.id_producto]
            )
        }
    },

    // Registra el movimiento de pago asociado a la orden.
    crearPago: async ({ id_orden, metodo_pago, estado_pago, monto }) => {
        const [result] = await db.query(
            `INSERT INTO pago (id_orden, metodo_pago, estado_pago, monto, fecha_pago)
             VALUES (?, ?, ?, ?, NOW())`,
            [id_orden, metodo_pago, estado_pago, monto]
        )
        return result.insertId
    }
}

module.exports = OrdenModel
