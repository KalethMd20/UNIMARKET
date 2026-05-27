const PedidoModel = require('../models/PedidoModel')
const PDFDocument = require('pdfkit')
// Controlador de pedidos del comprador (historial, detalle y factura PDF).

exports.misPedidos = async (req, res) => {
    try {
        const pedidos = await PedidoModel.getPedidosByUsuario(req.user.id_usuario)
        res.render('mis-pedidos', { user: req.user, pedidos })
    } catch (error) {
        console.log(error)
        res.redirect('/comprador')
    }
}

exports.detallePedido = async (req, res) => {
    try {
        const orden = await PedidoModel.getPedidoById(req.params.id, req.user.id_usuario)
        if (!orden) return res.redirect('/mis-pedidos')

        const items = await PedidoModel.getItemsByPedido(req.params.id)
        res.render('detalle-pedido', { user: req.user, orden, items })
    } catch (error) {
        console.log(error)
        res.redirect('/mis-pedidos')
    }
}

// Funcion compartida para construir el PDF en modo descarga o vista previa.
async function enviarPDFPedido(req, res, inline = false) {
    try {
        const { orden, items } = await PedidoModel.getPedidoCompleto(
            req.params.id,
            req.user.id_usuario
        )
        if (!orden) return res.redirect('/mis-pedidos')

        const doc = new PDFDocument({ margin: 50, size: 'A4' })

        // inline = previsualizar en una nueva ventana, attachment = descargar.
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader(
            'Content-Disposition',
            `${inline ? 'inline' : 'attachment'}; filename=pedido-${orden.id_orden}.pdf`
        )
        doc.pipe(res)

        doc.rect(0, 0, 612, 90).fill('#4f46e5')
        doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text('UniMarket', 50, 25)
        doc.fontSize(11).font('Helvetica').text('Tu mercado universitario', 50, 55)
        doc.fontSize(11)
            .text(`Pedido #${orden.id_orden}`, 400, 35, { align: 'right' })
            .text(
                new Date(orden.fecha_orden).toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                }),
                400,
                52,
                { align: 'right' }
            )

        doc.moveDown(3)

        doc.fillColor('#1e293b').fontSize(13).font('Helvetica-Bold').text('Informacion del cliente', 50, 110)
        doc.moveTo(50, 127).lineTo(562, 127).strokeColor('#e2e8f0').stroke()

        doc.fontSize(10).font('Helvetica').fillColor('#475569')
        doc.text('Nombre:', 50, 135).fillColor('#0f172a').text(orden.nombre_usuario, 150, 135)
        doc.fillColor('#475569').text('Correo:', 50, 152).fillColor('#0f172a').text(orden.correo, 150, 152)
        doc.fillColor('#475569').text('Estado:', 50, 169).fillColor('#4f46e5').font('Helvetica-Bold')
            .text(orden.estado.toUpperCase(), 150, 169)

        doc.fillColor('#1e293b').fontSize(13).font('Helvetica-Bold').text('Entrega y pago', 50, 200)
        doc.moveTo(50, 217).lineTo(562, 217).strokeColor('#e2e8f0').stroke()

        doc.fontSize(10).font('Helvetica')
        doc.fillColor('#475569').text('Modalidad:', 50, 225)
        doc.fillColor('#0f172a').text(
            orden.modalidad_entrega === 'recogida'
                ? `Recogida en campus - ${orden.punto_nombre || ''}`
                : `Envio a domicilio - ${orden.direccion_envio || ''}`,
            150,
            225
        )

        doc.fillColor('#475569').text('Metodo de pago:', 50, 242)
        doc.fillColor('#0f172a').text(
            orden.metodo_pago
                ? orden.metodo_pago.charAt(0).toUpperCase() + orden.metodo_pago.slice(1)
                : 'No registrado',
            150,
            242
        )

        doc.fillColor('#475569').text('Estado del pago:', 50, 259)
        doc.fillColor('#0f172a').text(orden.estado_pago || 'No registrado', 150, 259)

        doc.fillColor('#1e293b').fontSize(13).font('Helvetica-Bold').text('Productos', 50, 295)
        doc.moveTo(50, 312).lineTo(562, 312).strokeColor('#e2e8f0').stroke()

        doc.rect(50, 318, 512, 22).fill('#f1f5f9')
        doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold')
        doc.text('PRODUCTO', 58, 324)
        doc.text('CANT.', 370, 324, { width: 50, align: 'center' })
        doc.text('P. UNIT.', 420, 324, { width: 70, align: 'right' })
        doc.text('SUBTOTAL', 490, 324, { width: 70, align: 'right' })

        let y = 348
        items.forEach((item, i) => {
            if (i % 2 === 0) doc.rect(50, y - 4, 512, 20).fill('#fafafa')
            doc.fillColor('#0f172a').fontSize(9).font('Helvetica')
            doc.text(item.nombre_producto, 58, y, { width: 300 })
            doc.text(String(item.cantidad), 370, y, { width: 50, align: 'center' })
            doc.text(`$${Number(item.precio_unitario).toLocaleString('es-CO')}`, 420, y, { width: 70, align: 'right' })
            doc.text(`$${Number(item.subtotal).toLocaleString('es-CO')}`, 490, y, { width: 70, align: 'right' })
            y += 22
        })

        doc.moveTo(50, y + 5).lineTo(562, y + 5).strokeColor('#e2e8f0').stroke()

        doc.rect(390, y + 12, 172, 30).fill('#4f46e5')
        doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
            .text('TOTAL', 400, y + 20)
            .text(`$${Number(orden.total).toLocaleString('es-CO')}`, 400, y + 20, { width: 155, align: 'right' })

        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
            .text(
                'Este documento es un comprobante de compra generado automaticamente por UniMarket.',
                50,
                760,
                { align: 'center', width: 512 }
            )
            .text(
                'Para cualquier inquietud contactanos por el campus universitario.',
                50,
                772,
                { align: 'center', width: 512 }
            )

        doc.end()
    } catch (error) {
        console.log(error)
        res.redirect('/mis-pedidos')
    }
}

exports.descargarPDF = async (req, res) => enviarPDFPedido(req, res, false)
exports.previsualizarPDF = async (req, res) => enviarPDFPedido(req, res, true)
