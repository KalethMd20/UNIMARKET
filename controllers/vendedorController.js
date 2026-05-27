const db = require('../database/db') // ← ajusta esta ruta según tu proyecto
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// ── MULTER ───────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './public/uploads/productos'
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) =>
    cb(null, `prod_${Date.now()}${path.extname(file.originalname)}`)
})
exports.upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }).single('imagen')

// ── PANEL ────────────────────────────────────────────
exports.panel = async (req, res) => {
  try {
    const id_usuario = req.user.id_usuario

    const [[perfil]] = await db.query(
      'SELECT * FROM vendedor_perfil WHERE id_vendedor = ?', [id_usuario])
    if (!perfil) return res.redirect('/vendedor/crear-tienda')

    const [productos] = await db.query(`
      SELECT p.*, c.nombre_categoria
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      WHERE p.id_vendedor = ?
      ORDER BY p.fecha_pub DESC`, [id_usuario])

    const [[stats]] = await db.query(`
      SELECT COUNT(*) AS total, SUM(stock) AS stock_total, AVG(precio) AS precio_promedio
      FROM productos WHERE id_vendedor = ?`, [id_usuario])

    const [categorias] = await db.query(
      'SELECT * FROM categorias ORDER BY nombre_categoria')

    res.render('vendedor', 
        { perfil, productos, stats, categorias, user: req.user })
  } catch (e) {
    console.error(e)
    res.status(500).send('Error al cargar el panel')
  }
}

// ── CREAR PRODUCTO ───────────────────────────────────
exports.crearProducto = async (req, res) => {
  try {
    const { nombre_producto, descripcion, precio, stock, id_categoria } = req.body
    const imagen = req.file ? req.file.filename : 'default.jpg'

    await db.query(
      `INSERT INTO productos
       (id_vendedor, id_categoria, nombre_producto, descripcion, precio, stock, imagen, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      [req.user.id_usuario, id_categoria, nombre_producto, descripcion, precio, stock, imagen])

    res.redirect('/vendedor')
  } catch (e) {
    console.error(e)
    res.redirect('/vendedor')
  }
}

// ── EDITAR PRODUCTO ──────────────────────────────────
exports.editarProducto = async (req, res) => {
  try {
    const { id_producto, nombre_producto, descripcion, precio, stock, id_categoria } = req.body

    const [[prod]] = await db.query(
      'SELECT * FROM productos WHERE id_producto = ? AND id_vendedor = ?',
      [id_producto, req.user.id_usuario])
    if (!prod) return res.redirect('/vendedor')

    let imagen = prod.imagen
    if (req.file) {
      if (prod.imagen && prod.imagen !== 'default.jpg') {
        const old = `./public/uploads/productos/${prod.imagen}`
        if (fs.existsSync(old)) fs.unlinkSync(old)
      }
      imagen = req.file.filename
    }

    await db.query(
      `UPDATE productos
       SET nombre_producto=?, descripcion=?, precio=?, stock=?, id_categoria=?, imagen=?
       WHERE id_producto=? AND id_vendedor=?`,
      [nombre_producto, descripcion, precio, stock, id_categoria, imagen,
       id_producto, req.user.id_usuario])

    res.redirect('/vendedor')
  } catch (e) {
    console.error(e)
    res.redirect('/vendedor')
  }
}

// ── ELIMINAR PRODUCTO ────────────────────────────────
exports.eliminarProducto = async (req, res) => {
  try {
    const { id_producto } = req.body

    const [[prod]] = await db.query(
      'SELECT imagen FROM productos WHERE id_producto = ? AND id_vendedor = ?',
      [id_producto, req.user.id_usuario])
    if (!prod) return res.redirect('/vendedor')

    if (prod.imagen && prod.imagen !== 'default.jpg') {
      const imgPath = `./public/uploads/productos/${prod.imagen}`
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath)
    }

    await db.query(
      'DELETE FROM productos WHERE id_producto = ? AND id_vendedor = ?',
      [id_producto, req.user.id_usuario])

    res.redirect('/vendedor')
  } catch (e) {
    console.error(e)
    res.redirect('/vendedor')
  }
}

// ── ÓRDENES DATA (JSON) ──────────────────────────────
exports.ordenesData = async (req, res) => {
  try {
    const id_vendedor = req.user.id_usuario

    const base = `
      SELECT o.id_orden, o.total, o.estado, o.fecha_orden,
             o.modalidad_entrega, o.direccion_envio,
             u.nombre AS nombre_comprador, u.telefono AS telefono_comprador,
             pe.nombre AS punto_nombre,
             pg.metodo_pago, pg.estado_pago
      FROM orden o
      INNER JOIN usuarios u ON o.id_usuario = u.id_usuario
      LEFT JOIN punto_encuentro pe ON o.id_punto_encuentro = pe.id_punto
      LEFT JOIN pago pg ON o.id_orden = pg.id_orden
      WHERE o.id_orden IN (
        SELECT DISTINCT do2.id_orden FROM detalle_orden do2
        INNER JOIN productos p ON do2.id_producto = p.id_producto
        WHERE p.id_vendedor = ?
      ) AND o.estado = ?
      ORDER BY o.fecha_orden DESC`

    const [pendientes]  = await db.query(base, [id_vendedor, 'pendiente'])
    const [confirmadas] = await db.query(base, [id_vendedor, 'confirmada'])
    const [entregadas]  = await db.query(base, [id_vendedor, 'entregada'])

    res.json({ pendientes, confirmadas, entregadas })
  } catch (e) {
    console.error(e)
    res.json({ pendientes: [], confirmadas: [], entregadas: [] })
  }
}

// ── DETALLE ORDEN (JSON) ─────────────────────────────
exports.detalleOrden = async (req, res) => {
  try {
    const [[orden]] = await db.query(`
      SELECT o.*, u.nombre AS nombre_comprador, u.telefono AS telefono_comprador,
             pe.nombre AS punto_nombre, pg.metodo_pago, pg.estado_pago
      FROM orden o
      INNER JOIN usuarios u ON o.id_usuario = u.id_usuario
      LEFT JOIN punto_encuentro pe ON o.id_punto_encuentro = pe.id_punto
      LEFT JOIN pago pg ON o.id_orden = pg.id_orden
      WHERE o.id_orden = ?`, [req.params.id])

    const [items] = await db.query(`
      SELECT do2.cantidad, do2.precio_unitario, do2.subtotal,
             p.nombre_producto, p.imagen
      FROM detalle_orden do2
      INNER JOIN productos p ON do2.id_producto = p.id_producto
      WHERE do2.id_orden = ?`, [req.params.id])

    res.json({ orden, items })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al obtener detalle' })
  }
}

// ── CAMBIAR ESTADO ORDEN ─────────────────────────────
exports.cambiarEstadoOrden = async (req, res) => {
  try {
    const { id_orden, nuevo_estado } = req.body
    if (!['confirmada', 'entregada'].includes(nuevo_estado))
      return res.json({ ok: false })

    await db.query('UPDATE orden SET estado = ? WHERE id_orden = ?',
      [nuevo_estado, id_orden])

    if (nuevo_estado === 'confirmada') {
      await db.query(
        "UPDATE pago SET estado_pago = 'aprobado' WHERE id_orden = ?",
        [id_orden])
    }

    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.json({ ok: false })
  }
}

// ── PDF COMPROBANTE ──────────────────────────────────
const PDFDocument = require('pdfkit')

exports.descargarPDF = async (req, res) => {
  try {
    const [[orden]] = await db.query(`
      SELECT o.*, u.nombre AS nombre_usuario, u.correo,
             pe.nombre AS punto_nombre,
             pg.metodo_pago, pg.estado_pago
      FROM orden o
      INNER JOIN usuarios u ON o.id_usuario = u.id_usuario
      LEFT JOIN punto_encuentro pe ON o.id_punto_encuentro = pe.id_punto
      LEFT JOIN pago pg ON o.id_orden = pg.id_orden
      WHERE o.id_orden = ? AND o.id_usuario = ?`,
      [req.params.id, req.user.id_usuario])

    if (!orden) return res.redirect('/mis-pedidos')

    const [items] = await db.query(`
      SELECT do2.cantidad, do2.precio_unitario, do2.subtotal, p.nombre_producto
      FROM detalle_orden do2
      INNER JOIN productos p ON do2.id_producto = p.id_producto
      WHERE do2.id_orden = ?`, [req.params.id])

    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition',
      `attachment; filename=pedido-${orden.id_orden}.pdf`)
    doc.pipe(res)

    doc.rect(0, 0, 612, 90).fill('#4f46e5')
    doc.fillColor('#fff').fontSize(26).font('Helvetica-Bold').text('UniMarket', 50, 25)
    doc.fontSize(11).font('Helvetica').text('Tu mercado universitario', 50, 55)
    doc.fontSize(11)
       .text(`Pedido #${orden.id_orden}`, 400, 35, { align: 'right' })
       .text(new Date(orden.fecha_orden).toLocaleDateString('es-CO',
         { day: '2-digit', month: 'long', year: 'numeric' }), 400, 52, { align: 'right' })

    doc.fillColor('#1e293b').fontSize(13).font('Helvetica-Bold').text('Información del cliente', 50, 110)
    doc.moveTo(50, 127).lineTo(562, 127).strokeColor('#e2e8f0').stroke()
    doc.fontSize(10).font('Helvetica')
    doc.fillColor('#475569').text('Nombre:', 50, 135).fillColor('#0f172a').text(orden.nombre_usuario, 160, 135)
    doc.fillColor('#475569').text('Correo:', 50, 152).fillColor('#0f172a').text(orden.correo, 160, 152)
    doc.fillColor('#475569').text('Estado:', 50, 169).fillColor('#4f46e5').font('Helvetica-Bold')
       .text(orden.estado.toUpperCase(), 160, 169)

    doc.fillColor('#1e293b').fontSize(13).font('Helvetica-Bold').text('Entrega y pago', 50, 200)
    doc.moveTo(50, 217).lineTo(562, 217).strokeColor('#e2e8f0').stroke()
    const entregaTxt = orden.modalidad_entrega === 'recogida'
      ? `Recogida en campus — ${orden.punto_nombre || ''}`
      : `Domicilio — ${orden.direccion_envio || ''}`
    doc.fontSize(10).font('Helvetica')
    doc.fillColor('#475569').text('Modalidad:', 50, 225).fillColor('#0f172a').text(entregaTxt, 160, 225)
    doc.fillColor('#475569').text('Método de pago:', 50, 242)
       .fillColor('#0f172a').text(orden.metodo_pago || 'No registrado', 160, 242)
    doc.fillColor('#475569').text('Estado del pago:', 50, 259)
       .fillColor('#0f172a').text(orden.estado_pago || 'No registrado', 160, 259)

    doc.fillColor('#1e293b').fontSize(13).font('Helvetica-Bold').text('Productos', 50, 295)
    doc.moveTo(50, 312).lineTo(562, 312).strokeColor('#e2e8f0').stroke()
    doc.rect(50, 318, 512, 22).fill('#f1f5f9')
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold')
    doc.text('PRODUCTO', 58, 324).text('CANT.', 370, 324, { width: 50, align: 'center' })
       .text('P. UNIT.', 420, 324, { width: 70, align: 'right' })
       .text('SUBTOTAL', 490, 324, { width: 70, align: 'right' })

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
    doc.fillColor('#fff').fontSize(11).font('Helvetica-Bold')
       .text('TOTAL', 400, y + 20)
       .text(`$${Number(orden.total).toLocaleString('es-CO')}`, 400, y + 20, { width: 155, align: 'right' })

    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
       .text('Comprobante generado automáticamente por UniMarket.', 50, 760,
         { align: 'center', width: 512 })

    doc.end()
  } catch (e) {
    console.error(e)
    res.redirect('/mis-pedidos')
  }
}