const db = require('../database/db')
// Operaciones del comprador: catalogo, carrito y cantidades.

exports.index = async (req, res) => {
    try {
        if (req.user.nombre_rol !== 'comprador') return res.redirect('/')

        const [productos] = await db.query(`
            SELECT p.*, c.nombre_categoria, vp.nombre_tienda,
                   u.telefono AS telefono_vendedor
            FROM productos p
            INNER JOIN categorias c ON p.id_categoria = c.id_categoria
            INNER JOIN vendedor_perfil vp ON p.id_vendedor = vp.id_vendedor
            INNER JOIN usuarios u ON p.id_vendedor = u.id_usuario
            WHERE p.estado = 'activo' AND p.stock > 0
            ORDER BY p.fecha_pub DESC
        `)

        const carrito = req.session.carrito || []
        const totalItems = carrito.reduce((sum, i) => sum + i.cantidad, 0)

        res.render('comprador', { user: req.user, productos, totalItems })
    } catch (error) {
        console.log(error)
        res.redirect('/login')
    }
}

exports.verCarrito = (req, res) => {
    try {
        if (req.user.nombre_rol !== 'comprador') return res.redirect('/')
        const carrito = req.session.carrito || []
        const total = carrito.reduce((sum, i) => sum + (i.precio * i.cantidad), 0)
        res.render('carrito', { user: req.user, carrito, total })
    } catch (error) {
        console.log(error)
        res.redirect('/comprador')
    }
}

exports.agregarAlCarrito = async (req, res) => {
    try {
        const { id_producto } = req.body
        if (!req.session.carrito) req.session.carrito = []
        const carrito = req.session.carrito
        const idx = carrito.findIndex(i => i.id_producto == id_producto)

        if (idx >= 0) {
            carrito[idx].cantidad += 1
        } else {
            const [[prod]] = await db.query(
                'SELECT * FROM productos WHERE id_producto = ?', [id_producto]
            )
            if (prod) carrito.push({
                id_producto: prod.id_producto,
                nombre:      prod.nombre_producto,
                precio:      prod.precio,
                imagen:      prod.imagen,
                cantidad:    1
            })
        }

        req.session.carrito = carrito
        res.json({ ok: true, total: carrito.reduce((s, i) => s + i.cantidad, 0) })
    } catch (error) {
        console.log(error)
        res.json({ ok: false })
    }
}

exports.actualizarCarrito = (req, res) => {
    try {
        const { id_producto, cantidad } = req.body
        const carrito = req.session.carrito || []
        const idx = carrito.findIndex(i => i.id_producto == id_producto)

        if (idx >= 0) {
            if (parseInt(cantidad) <= 0) carrito.splice(idx, 1)
            else carrito[idx].cantidad = parseInt(cantidad)
        }

        req.session.carrito = carrito
        res.json({ ok: true, total: carrito.reduce((s, i) => s + i.precio * i.cantidad, 0) })
    } catch (error) {
        console.log(error)
        res.json({ ok: false })
    }
}

exports.eliminarDelCarrito = (req, res) => {
    try {
        const { id_producto } = req.body
        req.session.carrito = (req.session.carrito || []).filter(
            i => i.id_producto != id_producto
        )
        res.redirect('/carrito')
    } catch (error) {
        console.log(error)
        res.redirect('/carrito')
    }
}
