const db = require('../database/db')

const PedidoModel = {

    // Devuelve el historial resumido de pedidos del comprador.
    getPedidosByUsuario: async (id_usuario) => {
        const [rows] = await db.query(`
            SELECT 
                o.id_orden, o.fecha_orden, o.total, o.estado, o.modalidad_entrega,
                o.direccion_envio,
                pe.nombre AS punto_nombre,
                pg.metodo_pago, pg.estado_pago,
                COUNT(do2.id_detalle_orden) AS total_items
            FROM orden o
            LEFT JOIN punto_encuentro pe ON o.id_punto_encuentro = pe.id_punto
            LEFT JOIN pago pg ON o.id_orden = pg.id_orden
            LEFT JOIN detalle_orden do2 ON o.id_orden = do2.id_orden
            WHERE o.id_usuario = ?
            GROUP BY o.id_orden
            ORDER BY o.fecha_orden DESC
        `, [id_usuario])
        return rows
    },

    // Trae una orden puntual validando que pertenezca al usuario.
    getPedidoById: async (id_orden, id_usuario) => {
        const [[orden]] = await db.query(`
            SELECT o.*, pe.nombre AS punto_nombre,
                   pg.metodo_pago, pg.estado_pago
            FROM orden o
            LEFT JOIN punto_encuentro pe ON o.id_punto_encuentro = pe.id_punto
            LEFT JOIN pago pg ON o.id_orden = pg.id_orden
            WHERE o.id_orden = ? AND o.id_usuario = ?
        `, [id_orden, id_usuario])
        return orden
    },

    // Obtiene lineas de productos de una orden.
    getItemsByPedido: async (id_orden) => {
        const [rows] = await db.query(`
            SELECT do2.cantidad, do2.precio_unitario, do2.subtotal,
                   p.nombre_producto, p.imagen
            FROM detalle_orden do2
            INNER JOIN productos p ON do2.id_producto = p.id_producto
            WHERE do2.id_orden = ?
        `, [id_orden])
        return rows
    },

    // Consulta completa usada para factura PDF.
    getPedidoCompleto: async (id_orden, id_usuario) => {
    const [[orden]] = await db.query(`
        SELECT o.*, u.nombre AS nombre_usuario, u.correo,
               pe.nombre AS punto_nombre,
               pg.metodo_pago, pg.estado_pago
        FROM orden o
        INNER JOIN usuarios u ON o.id_usuario = u.id_usuario
        LEFT JOIN punto_encuentro pe ON o.id_punto_encuentro = pe.id_punto
        LEFT JOIN pago pg ON o.id_orden = pg.id_orden
        WHERE o.id_orden = ? AND o.id_usuario = ?
    `, [id_orden, id_usuario])

    const [items] = await db.query(`
        SELECT do2.cantidad, do2.precio_unitario, do2.subtotal,
               p.nombre_producto
        FROM detalle_orden do2
        INNER JOIN productos p ON do2.id_producto = p.id_producto
        WHERE do2.id_orden = ?
    `, [id_orden])

    return { orden, items }
    }

}

module.exports = PedidoModel
