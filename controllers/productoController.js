const VendedorModel  = require('../models/VendedorModel')
const ProductoModel = require('../models/ProductoModel')
const multer        = require('multer')
const path          = require('path')
const fs            = require('fs')
// Gestion de productos para vendedor: altas, cambios, bajas e imagenes.
// ── CONFIG MULTER ──────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './public/uploads/productos'
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        cb(null, dir)
    },
    filename: (req, file, cb) => {
        const ext  = path.extname(file.originalname)
        const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext
        cb(null, name)
    }
})
const fileFilter = (req, file, cb) => {
    /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase())
        ? cb(null, true)
        : cb(new Error('Solo imágenes JPG, PNG o WEBP'))
}
exports.upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } })

// ── VER MIS PRODUCTOS ──────────────────────────────────────────────────────
exports.getMisProductos = async (req, res) => {
    try {
        const [productos, categorias, stats] = await Promise.all([
            ProductoModel.getByVendedor(req.user.id_usuario),
            ProductoModel.getCategorias(),
            ProductoModel.getStats(req.user.id_usuario)
        ])
        res.render('vendedor', { user: req.user, productos, categorias, stats })
    } catch (error) {
        console.log(error)
        res.render('vendedor', { user: req.user, productos: [], categorias: [], stats: {} })
    }
}

exports.detalleProducto = async (req, res) => {
    try {
        const producto = await ProductoModel.getById(req.params.id)
        if (!producto) return res.redirect('/comprador')
        res.render('detalle-producto', { user: req.user, producto })
    } catch (error) {
        console.log(error)
        res.redirect('/comprador')
    }
}

// ── CREAR ──────────────────────────────────────────────────────────────────
exports.crearProducto = async (req, res) => {
    try {
        const { nombre_producto, descripcion, precio, stock, id_categoria } = req.body
        const imagen = req.file ? req.file.filename : 'default.jpg'
        await ProductoModel.crear({
            id_vendedor: req.user.id_usuario,
            id_categoria, nombre_producto, descripcion, precio, stock, imagen
        })
        res.redirect('/vendedor')
    } catch (error) {
        console.log(error)
        res.redirect('/vendedor')
    }
}

// ── EDITAR ─────────────────────────────────────────────────────────────────
exports.editarProducto = async (req, res) => {
    try {
        const { id_producto, nombre_producto, descripcion, precio, stock, id_categoria } = req.body
        let imagen = null

        if (req.file) {
            const imgAnterior = await ProductoModel.getImagen(id_producto)
            if (imgAnterior && imgAnterior !== 'default.jpg') {
                const oldPath = `./public/uploads/productos/${imgAnterior}`
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
            }
            imagen = req.file.filename
        }

        await ProductoModel.editar({
            id_producto, id_vendedor: req.user.id_usuario,
            nombre_producto, descripcion, precio, stock, id_categoria, imagen
        })
        res.redirect('/vendedor')
    } catch (error) {
        console.log(error)
        res.redirect('/vendedor')
    }
}

// ── ELIMINAR ───────────────────────────────────────────────────────────────
exports.eliminarProducto = async (req, res) => {
    try {
        const { id_producto } = req.body
        const imgAnterior = await ProductoModel.getImagen(id_producto)
        if (imgAnterior && imgAnterior !== 'default.jpg') {
            const imgPath = `./public/uploads/productos/${imgAnterior}`
            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath)
        }
        await ProductoModel.eliminar(id_producto, req.user.id_usuario)
        res.redirect('/vendedor')
    } catch (error) {
        console.log(error)
        res.redirect('/vendedor')
    }

}


// ── VERIFICAR PERFIL Y REDIRIGIR ───────────────────────────────────────────
exports.getMisProductos = async (req, res) => {
    try {
        const perfil = await VendedorModel.getPerfil(req.user.id_usuario)

        // Sin perfil → crear tienda
        if (!perfil) return res.render('crear-tienda', { user: req.user, error: null })

        // Perfil pendiente → esperar verificación
        if (perfil.estado_verif === 'pendiente') 
            return res.render('tienda-pendiente', { user: req.user, perfil })

        // Perfil rechazado
        if (perfil.estado_verif === 'rechazado')
            return res.render('tienda-rechazada', { user: req.user, perfil })

        // Verificado → panel completo
        const [productos, categorias, stats, ordenesPendientes, ordenesCompletadas] = await Promise.all([
            ProductoModel.getByVendedor(req.user.id_usuario),
            ProductoModel.getCategorias(),
            ProductoModel.getStats(req.user.id_usuario),
            VendedorModel.getOrdenesPendientes(req.user.id_usuario),
            VendedorModel.getOrdenesCompletadas(req.user.id_usuario)
        ])

        res.render('vendedor', {
            user: req.user, perfil,
            productos, categorias, stats,
            ordenesPendientes, ordenesCompletadas
        })
    } catch (error) {
        console.log(error)
        res.redirect('/logout')
    }
}

// ── CREAR PERFIL TIENDA ────────────────────────────────────────────────────
exports.crearTienda = async (req, res) => {
    try {
        const { nombre_tienda, documento, descripcion } = req.body
        await VendedorModel.crearPerfil({
            id_vendedor: req.user.id_usuario,
            nombre_tienda, documento, descripcion
        })
        res.render('tienda-pendiente', {
            user: req.user,
            perfil: { nombre_tienda, estado_verif: 'pendiente' }
        })
    } catch (error) {
        console.log(error)
        res.render('crear-tienda', { user: req.user, error: 'Error al crear la tienda, intenta de nuevo' })
    }
}
