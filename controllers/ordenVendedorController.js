const OrdenVendedorModel = require('../models/OrdenVendedorModel')
// API del vendedor para listar ordenes y cambiar estados.

exports.getOrdenes = async (req, res) => {
    try {
        const pendientes   = await OrdenVendedorModel.getOrdenesPorVendedor(req.user.id_usuario, 'pendiente')
        const confirmadas  = await OrdenVendedorModel.getOrdenesPorVendedor(req.user.id_usuario, 'confirmado')
        const entregadas   = await OrdenVendedorModel.getOrdenesPorVendedor(req.user.id_usuario, 'entregado')
        res.json({ pendientes, confirmadas, entregadas })
    } catch (error) {
        console.log('ERROR getOrdenes:', error.message)
        res.status(500).json({ error: error.message })
    }
}

exports.getDetalleOrden = async (req, res) => {
    try {
        const data = await OrdenVendedorModel.getDetalleOrden(req.params.id, req.user.id_usuario)
        res.json(data)
    } catch (error) {
        console.log('ERROR getDetalle:', error.message)
        res.status(500).json({ error: error.message })
    }
}

exports.cambiarEstado = async (req, res) => {
    try {
        const { id_orden, nuevo_estado } = req.body
        const estados_validos = ['confirmado', 'entregado']
        if (!estados_validos.includes(nuevo_estado)) return res.status(400).json({ error: 'Estado inválido' })

        await OrdenVendedorModel.cambiarEstadoOrden(id_orden, nuevo_estado)
        res.json({ ok: true })
    } catch (error) {
        console.log('ERROR cambiarEstado:', error.message)
        res.status(500).json({ error: error.message })
    }
}
