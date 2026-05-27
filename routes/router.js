const express            = require('express')
const router             = express.Router()
const authController     = require('../controllers/authController')
const adminController    = require('../controllers/adminController')
const compradorController= require('../controllers/compradorController')
const pedidoController   = require('../controllers/pedidoController')
const productoController = require('../controllers/productoController')
const vc = require('../controllers/vendedorController');
const usuarioController  = require('../controllers/usuarioController')
const checkoutController = require('../controllers/checkoutController')
const TiendaModel        = require('../models/TiendaModel')
const db                 = require('../database/db')
// Router principal: aqui se conectan las rutas de cada modulo.

// ── AUTH ───────────────────────────────────────────────────
router.get('/login',    (req, res) => res.render('login',    { alert: false }))
router.get('/register', (req, res) => res.render('register', { alert: false }))
router.post('/register', authController.register)
router.post('/login',    authController.login)
router.get('/logout',    authController.logout)

// ── RAÍZ ───────────────────────────────────────────────────
router.get('/', authController.isAuthenticated, (req, res) => {
    // Redireccion automatica segun el rol del usuario autenticado.
    if (req.user.nombre_rol === 'admin')     return res.redirect('/admin')
    if (req.user.nombre_rol === 'vendedor')  return res.redirect('/vendedor')
    if (req.user.nombre_rol === 'comprador') return res.redirect('/comprador')
    res.render('index', { user: req.user })
})

// ── COMPRADOR ──────────────────────────────────────────────
router.get('/comprador',           authController.isAuthenticated, compradorController.index)
router.get('/carrito',             authController.isAuthenticated, compradorController.verCarrito)
router.post('/carrito/agregar',    authController.isAuthenticated, compradorController.agregarAlCarrito)
router.post('/carrito/actualizar', authController.isAuthenticated, compradorController.actualizarCarrito)
router.post('/carrito/eliminar',   authController.isAuthenticated, compradorController.eliminarDelCarrito)

// ── PEDIDOS ────────────────────────────────────────────────
router.get('/mis-pedidos',         authController.isAuthenticated, pedidoController.misPedidos)
router.get('/mis-pedidos/:id/pdf', authController.isAuthenticated, pedidoController.descargarPDF)
router.get('/mis-pedidos/:id/pdf/preview', authController.isAuthenticated, pedidoController.previsualizarPDF)
router.get('/mis-pedidos/:id',     authController.isAuthenticated, pedidoController.detallePedido)

// ── VENDEDOR ───────────────────────────────────────────────
router.get('/vendedor',                     authController.isAuthenticated, vc.panel)
router.post('/vendedor/crear',  vc.upload,  authController.isAuthenticated, vc.crearProducto)
router.post('/vendedor/editar', vc.upload,  authController.isAuthenticated, vc.editarProducto)
router.post('/vendedor/eliminar',           authController.isAuthenticated, vc.eliminarProducto)
router.get('/vendedor/ordenes/data',        authController.isAuthenticated, vc.ordenesData)
router.get('/vendedor/ordenes/:id/detalle', authController.isAuthenticated, vc.detalleOrden)
router.post('/vendedor/ordenes/estado',     authController.isAuthenticated, vc.cambiarEstadoOrden)
router.get('/mis-pedidos/:id/pdf',          authController.isAuthenticated, vc.descargarPDF)

router.get('/checkout',         authController.isAuthenticated, checkoutController.verCheckout)
router.post('/checkout',        authController.isAuthenticated, checkoutController.procesarCheckout)
router.get('/pago',             authController.isAuthenticated, checkoutController.verPago)
router.post('/pago/procesar',   authController.isAuthenticated, checkoutController.procesarPago)
router.get('/confirmacion/:id', authController.isAuthenticated, checkoutController.verConfirmacion)

// ── ADMIN ──────────────────────────────────────────────────
router.get('/admin', authController.isAuthenticated, (req, res, next) => {
    if (req.user.nombre_rol !== 'admin') return res.redirect('/')
    next()
}, adminController.getDashboard)
router.post('/admin/usuario/estado',  authController.isAuthenticated, adminController.cambiarEstadoUsuario)
router.post('/admin/producto/estado', authController.isAuthenticated, adminController.cambiarEstadoProducto)
router.post('/admin/vendedor/estado', authController.isAuthenticated, adminController.cambiarEstadoVendedor)
router.post('/admin/punto/crear',     authController.isAuthenticated, adminController.crearPunto)
router.post('/admin/punto/toggle',    authController.isAuthenticated, adminController.togglePunto)

// ── PERFIL ─────────────────────────────────────────────────
router.get('/perfil',  authController.isAuthenticated, usuarioController.verPerfil)
router.post('/perfil', authController.isAuthenticated, usuarioController.actualizarPerfil)

module.exports = router
