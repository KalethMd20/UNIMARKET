const db = require('../database/db')

// Consultas del panel vendedor (perfil, ordenes y estados de pago).
// Verificar si el vendedor ya tiene perfil
exports.getPerfil = async (id_vendedor) => {
    const [rows] = await db.query(
        'SELECT * FROM vendedor_perfil WHERE id_vendedor = ?',
        [id_vendedor]
    )
    return rows[0] || null
}

// Crear perfil de tienda
exports.crearPerfil = async ({ id_vendedor, nombre_tienda, documento, descripcion }) => {
    const [result] = await db.query(
        'INSERT INTO vendedor_perfil (id_vendedor, nombre_tienda, documento, descripcion, estado_verif) VALUES (?,?,?,?,?)',
        [id_vendedor, nombre_tienda, documento, descripcion, 'pendiente']
    )
    return result
}

// Obtener órdenes con productos del vendedor
exports.getOrdenesPendientes = async (id_vendedor) => {
    const [rows] = await db.query(`
        SELECT 
            o.id_orden, o.fecha_orden, o.modalidad_entrega,
            o.estado AS estado_orden, o.total,
            u.nombre AS comprador, u.telefono,
            COALESCE(pe.nombre, o.direccion_envio) AS destino,
            p.nombre_producto, do2.cantidad, do2.precio_unitario, do2.subtotal,
            pg.metodo_pago, pg.estado_pago
        FROM detalle_orden do2
        INNER JOIN orden o        ON do2.id_orden    = o.id_orden
        INNER JOIN productos p    ON do2.id_producto = p.id_producto
        INNER JOIN usuarios u     ON o.id_usuario    = u.id_usuario
        LEFT  JOIN punto_encuentro pe ON o.id_punto_encuentro = pe.id_punto
        LEFT  JOIN pago pg        ON o.id_orden      = pg.id_orden
        WHERE p.id_vendedor = ?
          AND o.estado IN ('pendiente','confirmada','lista_recoger')
        ORDER BY o.fecha_orden DESC
    `, [id_vendedor])
    return rows
}

exports.getOrdenesCompletadas = async (id_vendedor) => {
    const [rows] = await db.query(`
        SELECT 
            o.id_orden, o.fecha_orden, o.modalidad_entrega,
            o.estado AS estado_orden, o.total,
            u.nombre AS comprador,
            COALESCE(pe.nombre, o.direccion_envio) AS destino,
            p.nombre_producto, do2.cantidad, do2.subtotal,
            pg.metodo_pago, pg.estado_pago
        FROM detalle_orden do2
        INNER JOIN orden o        ON do2.id_orden    = o.id_orden
        INNER JOIN productos p    ON do2.id_producto = p.id_producto
        INNER JOIN usuarios u     ON o.id_usuario    = u.id_usuario
        LEFT  JOIN punto_encuentro pe ON o.id_punto_encuentro = pe.id_punto
        LEFT  JOIN pago pg        ON o.id_orden      = pg.id_orden
        WHERE p.id_vendedor = ?
          AND o.estado IN ('entregada','cancelada')
        ORDER BY o.fecha_orden DESC
    `, [id_vendedor])
    return rows
}
