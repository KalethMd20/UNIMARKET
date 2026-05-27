const db = require('../database/db')

const OrdenVendedorModel = {

    // Órdenes que contienen productos del vendedor
    getOrdenesPorVendedor: async (id_vendedor, estado = null) => {
        let where = 'WHERE t.id_vendedor = ?'
        const params = [id_vendedor]
        if (estado) { where += ' AND o.estado = ?'; params.push(estado) }

        const [rows] = await db.query(`
            SELECT DISTINCT
                o.id_orden, o.estado, o.total, o.fecha_orden,
                o.modalidad_entrega, o.direccion_envio,
                u.nombre AS nombre_comprador,
                u.telefono AS telefono_comprador,
                pe.nombre AS punto_nombre,
                pg.metodo_pago, pg.estado_pago
            FROM orden o
            INNER JOIN detalle_orden do2 ON o.id_orden = do2.id_orden
            INNER JOIN productos p ON do2.id_producto = p.id_producto
            INNER JOIN tienda t ON p.id_tienda = t.id_tienda
            INNER JOIN usuarios u ON o.id_usuario = u.id_usuario
            LEFT JOIN punto_encuentro pe ON o.id_punto_encuentro = pe.id_punto
            LEFT JOIN pago pg ON o.id_orden = pg.id_orden
            ${where}
            ORDER BY o.fecha_orden DESC
        `, params)
        return rows
    },

    getDetalleOrden: async (id_orden, id_vendedor) => {
        // Info general de la orden
        const [[orden]] = await db.query(`
            SELECT o.*, u.nombre AS nombre_comprador, u.telefono AS telefono_comprador,
                   u.correo AS correo_comprador,
                   pe.nombre AS punto_nombre, pe.ubicacion AS punto_ubicacion,
                   pg.metodo_pago, pg.estado_pago
            FROM orden o
            INNER JOIN usuarios u ON o.id_usuario = u.id_usuario
            LEFT JOIN punto_encuentro pe ON o.id_punto_encuentro = pe.id_punto
            LEFT JOIN pago pg ON o.id_orden = pg.id_orden
            WHERE o.id_orden = ?
        `, [id_orden])

        // Solo los items de este vendedor
        const [items] = await db.query(`
            SELECT do2.cantidad, do2.precio_unitario, do2.subtotal,
                   p.nombre_producto, p.imagen
            FROM detalle_orden do2
            INNER JOIN productos p ON do2.id_producto = p.id_producto
            INNER JOIN tienda t ON p.id_tienda = t.id_tienda
            WHERE do2.id_orden = ? AND t.id_vendedor = ?
        `, [id_orden, id_vendedor])

        return { orden, items }
    },

    cambiarEstadoOrden: async (id_orden, nuevo_estado) => {
        // Actualiza estado logistico y, cuando corresponde, estado del pago.
        await db.query('UPDATE orden SET estado = ? WHERE id_orden = ?', [nuevo_estado, id_orden])
        if (nuevo_estado === 'confirmado') {
            await db.query("UPDATE pago SET estado_pago = 'pagado' WHERE id_orden = ?", [id_orden])
        }
    }
}

module.exports = OrdenVendedorModel
