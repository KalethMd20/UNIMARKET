const db = require('../database/db')
// Controlador de administracion: dashboard y estados globales del sistema.

const adminController = {

    // ── Dashboard principal ────────────────────────────────
    getDashboard: async (req, res) => {
        try {
            const [[{ total_usuarios }]] = await db.query(`SELECT COUNT(*) AS total_usuarios FROM usuarios`)
            const [[{ total_productos }]] = await db.query(`SELECT COUNT(*) AS total_productos FROM productos`)
            const [[{ productos_pendientes }]] = await db.query(`SELECT COUNT(*) AS productos_pendientes FROM productos WHERE estado = 'pendiente'`)
            const [[{ vendedores_pendientes }]] = await db.query(`SELECT COUNT(*) AS vendedores_pendientes FROM vendedor_perfil WHERE estado_verif = 'pendiente'`)
            const [[{ total_ordenes }]] = await db.query(`SELECT COUNT(*) AS total_ordenes FROM orden`)
            const [[{ total_puntos }]] = await db.query(`SELECT COUNT(*) AS total_puntos FROM punto_encuentro`)

            const [usuarios] = await db.query(`
                SELECT u.*, r.nombre_rol
                FROM usuarios u
                INNER JOIN roles r ON u.id_rol = r.id_rol
                ORDER BY u.fecha_registro DESC
            `)

            const [productos] = await db.query(`
                SELECT p.*, vp.nombre_tienda, c.nombre_categoria
                FROM productos p
                INNER JOIN vendedor_perfil vp ON p.id_vendedor = vp.id_vendedor
                INNER JOIN categorias c ON p.id_categoria = c.id_categoria
                ORDER BY p.fecha_pub DESC
            `)

            const [vendedores] = await db.query(`
                SELECT vp.*, u.nombre, u.correo, u.facultad
                FROM vendedor_perfil vp
                INNER JOIN usuarios u ON vp.id_vendedor = u.id_usuario
                ORDER BY vp.estado_verif ASC
            `)

            const [ordenes] = await db.query(`
                SELECT o.*, u.nombre AS comprador, COALESCE(pe.nombre, o.direccion_envio) AS destino
                FROM orden o
                INNER JOIN usuarios u ON o.id_usuario = u.id_usuario
                LEFT JOIN punto_encuentro pe ON o.id_punto_encuentro = pe.id_punto
                ORDER BY o.fecha_orden DESC
            `)

            const [puntos] = await db.query(`SELECT * FROM punto_encuentro ORDER BY id_punto ASC`)

            res.render('admin', {
                user: req.user,
                stats: {
                    total_usuarios,
                    total_productos,
                    productos_pendientes,
                    vendedores_pendientes,
                    total_ordenes,
                    total_puntos
                },
                usuarios,
                productos,
                vendedores,
                ordenes,
                puntos
            })
        } catch (err) {
            console.error(err)
            res.render('admin', {
                user: req.user,
                stats: {},
                usuarios: [],
                productos: [],
                vendedores: [],
                ordenes: [],
                puntos: []
            })
        }
    },

    // ── Usuarios ───────────────────────────────────────────
    cambiarEstadoUsuario: async (req, res) => {
        const { id, estado } = req.body
        try {
            await db.query(`UPDATE usuarios SET estado = ? WHERE id_usuario = ?`, [estado, id])

            const estadoProducto = estado === 'inactivo' ? 'rechazado' : 'activo'
            await db.query(`UPDATE productos SET estado = ? WHERE id_vendedor = ?`, [estadoProducto, id])

            console.log(`Usuario ${id} → ${estado} | Productos → ${estadoProducto}`)
        } catch (err) {
            console.error('Error:', err)
        }
        res.redirect('/admin#usuarios')
    },

    // ── Productos ──────────────────────────────────────────
    cambiarEstadoProducto: async (req, res) => {
        const { id, estado } = req.body
        try {
            await db.query(`UPDATE productos SET estado = ? WHERE id_producto = ?`, [estado, id])
        } catch (err) {
            console.error(err)
        }
        res.redirect('/admin#productos')
    },

    // ── Vendedores ─────────────────────────────────────────
    cambiarEstadoVendedor: async (req, res) => {
        const { id, estado } = req.body
        try {
            await db.query(`UPDATE vendedor_perfil SET estado_verif = ? WHERE id_vendedor = ?`, [estado, id])

            const estadoProducto = estado === 'rechazado' ? 'rechazado' : 'activo'
            await db.query(`UPDATE productos SET estado = ? WHERE id_vendedor = ?`, [estadoProducto, id])

            console.log(`Vendedor ${id} → ${estado} | Productos → ${estadoProducto}`)
        } catch (err) {
            console.error(err)
        }
        res.redirect('/admin#vendedores')
    },

    // ── Puntos de encuentro ────────────────────────────────
    crearPunto: async (req, res) => {
        try {
            console.log('BODY RECIBIDO:', req.body)

            const nombre = req.body.nombre
            const descripcion = req.body.descripcion
            const latitud = req.body.latitud
            const longitud = req.body.longitud

            console.log('NOMBRE:', nombre)
            console.log('DESCRIPCION:', descripcion)
            console.log('LATITUD:', latitud, typeof latitud)
            console.log('LONGITUD:', longitud, typeof longitud)

            if (!nombre || !latitud || !longitud) {
                console.log('Faltan datos, no se insertará')
                return res.redirect('/admin#puntos')
            }

            const [resultado] = await db.query(
                `INSERT INTO punto_encuentro (nombre, descripcion, latitud, longitud, activo)
                VALUES (?, ?, ?, ?, 1)`,
                [nombre, descripcion || null, latitud, longitud]
            )

            console.log('INSERT OK:', resultado)

            return res.redirect('/admin#puntos')
        } catch (err) {
            console.error('ERROR AL CREAR PUNTO:', err)
            return res.redirect('/admin#puntos')
        }
    },

    togglePunto: async (req, res) => {
        const { id, activo } = req.body
        try {
            await db.query(`UPDATE punto_encuentro SET activo = ? WHERE id_punto = ?`, [activo, id])
        } catch (err) {
            console.error(err)
        }
        res.redirect('/admin#puntos')
    }
}

module.exports = adminController
