const db = require('../database/db')

// Modelo de productos para operaciones CRUD del vendedor.
// Obtener productos de un vendedor
exports.getByVendedor = async (id_vendedor) => {
    const [rows] = await db.query(`
        SELECT p.*, c.nombre_categoria
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        WHERE p.id_vendedor = ?
        ORDER BY p.fecha_pub DESC
    `, [id_vendedor])
    return rows
}

// Estadísticas del vendedor
exports.getStats = async (id_vendedor) => {
    const [rows] = await db.query(`
        SELECT 
            COUNT(*) as total,
            COALESCE(SUM(stock), 0) as stock_total,
            COALESCE(ROUND(AVG(precio), 0), 0) as precio_promedio
        FROM productos WHERE id_vendedor = ?
    `, [id_vendedor])
    return rows[0]
}

// Obtener todas las categorías
exports.getCategorias = async () => {
    const [rows] = await db.query('SELECT * FROM categorias ORDER BY nombre_categoria')
    return rows
}

// Crear producto
exports.crear = async ({ id_vendedor, id_categoria, nombre_producto, descripcion, precio, stock, imagen }) => {
    const [result] = await db.query(
        'INSERT INTO productos (id_vendedor, id_categoria, nombre_producto, descripcion, precio, stock, imagen, estado) VALUES (?,?,?,?,?,?,?,?)',
        [id_vendedor, id_categoria, nombre_producto, descripcion, precio, stock, imagen, 'activo']
    )
    return result
}

// Editar producto
exports.editar = async ({ id_producto, id_vendedor, nombre_producto, descripcion, precio, stock, id_categoria, imagen }) => {
    if (imagen) {
        const [result] = await db.query(
            'UPDATE productos SET nombre_producto=?, descripcion=?, precio=?, stock=?, id_categoria=?, imagen=? WHERE id_producto=? AND id_vendedor=?',
            [nombre_producto, descripcion, precio, stock, id_categoria, imagen, id_producto, id_vendedor]
        )
        return result
    } else {
        const [result] = await db.query(
            'UPDATE productos SET nombre_producto=?, descripcion=?, precio=?, stock=?, id_categoria=? WHERE id_producto=? AND id_vendedor=?',
            [nombre_producto, descripcion, precio, stock, id_categoria, id_producto, id_vendedor]
        )
        return result
    }
}

// Obtener imagen de un producto
exports.getImagen = async (id_producto) => {
    const [rows] = await db.query('SELECT imagen FROM productos WHERE id_producto = ?', [id_producto])
    return rows[0]?.imagen || null
}

// Eliminar producto
exports.eliminar = async (id_producto, id_vendedor) => {
    const [result] = await db.query(
        'DELETE FROM productos WHERE id_producto = ? AND id_vendedor = ?',
        [id_producto, id_vendedor]
    )
    return result
}

// Obtener un producto por ID (con datos del vendedor)
exports.getById = async (id_producto) => {
    const [[producto]] = await db.query(`
        SELECT p.*, 
               c.nombre_categoria,
               u.nombre AS nombre_vendedor,
               u.telefono AS telefono_vendedor
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        INNER JOIN usuarios u ON p.id_vendedor = u.id_usuario
        WHERE p.id_producto = ?
    `, [id_producto])
    return producto
}
