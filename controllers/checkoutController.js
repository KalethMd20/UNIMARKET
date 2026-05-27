const OrdenModel = require('../models/OrdenModel')
const PedidoModel = require('../models/PedidoModel')
// Controla el flujo de compra: checkout, pago y pantalla de confirmacion.

// GET /checkout — mostrar formulario
exports.verCheckout = async (req, res) => {
    try {
        if (req.user.nombre_rol !== 'comprador') return res.redirect('/')
        const carrito = req.session.carrito || []
        if (carrito.length === 0) return res.redirect('/carrito')

        const puntos = await OrdenModel.getPuntosEncuentro()
        const total  = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)

        res.render('checkout', { user: req.user, carrito, total, puntos })
    } catch (error) {
        console.log(error)
        res.redirect('/carrito')
    }
}

// GET /pago — mostrar formulario de pago simulado
exports.verPago = async (req, res) => {
    try {
        if (req.user.nombre_rol !== 'comprador') return res.redirect('/')
        const carrito = req.session.carrito || []
        if (carrito.length === 0) return res.redirect('/carrito')

        const { modalidad_entrega, direccion_envio, id_punto_encuentro } = req.session.checkoutData || {}
        if (!modalidad_entrega) return res.redirect('/checkout')

        const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
        res.render('pago', { user: req.user, total })
    } catch (error) {
        console.log(error)
        res.redirect('/checkout')
    }
}

// POST /checkout — guardar modalidad y pasar a pago
exports.procesarCheckout = async (req, res) => {
    try {
        const { modalidad_entrega, direccion_envio, id_punto_encuentro } = req.body
        
        req.session.checkoutData = { modalidad_entrega, direccion_envio, id_punto_encuentro }
        res.redirect('/pago')
    } catch (error) {
        console.log(error)
        res.redirect('/checkout')
    }
}

// POST /pago/procesar — crear orden en BD y confirmar
exports.procesarPago = async (req, res) => {
    try {
        const carrito = req.session.carrito || []
        if (carrito.length === 0) return res.redirect('/carrito')

        const { metodo_pago } = req.body
        const { modalidad_entrega, direccion_envio, id_punto_encuentro } = req.session.checkoutData || {}
        if (!modalidad_entrega) return res.redirect('/checkout')

        const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)

        // Crear orden
        const id_orden = await OrdenModel.crearOrden({
            id_usuario: req.user.id_usuario,
            total,
            modalidad_entrega,
            direccion_envio,
            id_punto_encuentro: id_punto_encuentro || null
        })

        // Crear detalles y descontar stock
        await OrdenModel.crearDetalles(id_orden, carrito)

        // Crear pago en estado pendiente; el vendedor lo aprueba despues.
        await OrdenModel.crearPago({
            id_orden,
            metodo_pago,
            estado_pago: 'pendiente',
            monto: total
        })

        // Limpiar sesión
        req.session.carrito = []
        req.session.checkoutData = null

        res.redirect(`/confirmacion/${id_orden}`)
    } catch (error) {
        console.log(error)
        res.redirect('/carrito')
    }
}

// GET /confirmacion/:id
exports.verConfirmacion = async (req, res) => {
    try {
        const { id } = req.params
        const orden = await PedidoModel.getPedidoById(id, req.user.id_usuario)
        if (!orden) return res.redirect('/mis-pedidos')

        const items = await PedidoModel.getItemsByPedido(id)
        res.render('confirmacion', {
            user: req.user,
            id_orden: id,
            orden,
            items
        })
    } catch (error) {
        console.log(error)
        res.redirect('/comprador')
    }
}
