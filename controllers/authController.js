const jwt          = require('jsonwebtoken')
const bcryptjs     = require('bcryptjs')
const {promisify}  = require('util')
const UsuarioModel = require('../models/UsuarioModel')

// Controlador de autenticacion: registro, login, middleware y cierre de sesion.

// REGISTRO
exports.register = async (req, res) => {
    try {
        const { nombre, correo, contrasena, id_rol, facultad, telefono } = req.body

        const existe = await UsuarioModel.findByCorreo(correo)
        if (existe) {
            return res.render('register', {
                alert: true,
                alertTitle: "Error",
                alertMessage: "El correo ya está registrado",
                alertIcon: 'error',
                showConfirmButton: true,
                timer: false,
                ruta: 'register'
            })
        }

        await UsuarioModel.crear({ nombre, correo, contrasena, id_rol: id_rol || 3, facultad, telefono })

        res.render('register', {
            alert: true,
            alertTitle: "¡Cuenta creada!",
            alertMessage: "Tu cuenta fue registrada exitosamente",
            alertIcon: 'success',
            showConfirmButton: false,
            timer: 2000,
            ruta: 'login'
        })

    } catch (error) {
        console.log(error)
    }
}


// LOGIN
exports.login = async (req, res) => {
    try {
        const { correo, contrasena } = req.body

        if (!correo || !contrasena) {
            return res.render('login', {
                alert: true,
                alertTitle: "Advertencia",
                alertMessage: "Ingrese correo y contraseña",
                alertIcon: 'info',
                showConfirmButton: true,
                timer: false,
                ruta: 'login'
            })
        }

        // Buscar usuario
        const usuario = await UsuarioModel.findByCorreo(correo)

        if (!usuario || !(await UsuarioModel.verificarPassword(contrasena, usuario.contrasena))) {
            return res.render('login', {
                alert: true,
                alertTitle: "Error",
                alertMessage: "Correo y/o contraseña incorrectos",
                alertIcon: 'error',
                showConfirmButton: true,
                timer: false,
                ruta: 'login'
            })
        }

        // Generar token JWT con identidad y rol para navegacion por modulos.
        const token = jwt.sign(
            {
                id:         usuario.id_usuario,
                nombre:     usuario.nombre,
                nombre_rol: usuario.nombre_rol
            },
            process.env.JWT_SECRETO,
            { expiresIn: process.env.JWT_TIEMPO_EXPIRA }
        )

        // Guardar cookie — secure: false para que funcione en localhost
        const cookiesOptions = {
            expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: false
        }
        res.cookie('jwt', token, cookiesOptions)

        // Redirigir según el rol del usuario
        const rol = usuario.nombre_rol
        const ruta = rol === 'admin' ? 'admin' : rol === 'vendedor' ? 'vendedor' : 'comprador'

        res.render('login', {
            alert: true,
            alertTitle: "Conexión exitosa",
            alertMessage: "¡LOGIN CORRECTO!",
            alertIcon: 'success',
            showConfirmButton: false,
            timer: 1500,
            ruta: ruta
        })

    } catch (error) {
        console.log(error)
    }
}


// MIDDLEWARE — verifica si está autenticado
exports.isAuthenticated = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            // Verificar y decodificar token
            const decodificada = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRETO)

            // Buscar usuario actualizado desde la BD
            const [rows] = await require('../database/db').query(
                'SELECT u.*, r.nombre_rol FROM usuarios u INNER JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?',
                [decodificada.id]
            )

            if (!rows || rows.length === 0) return res.redirect('/login')

            req.user = rows[0]
            return next()

        } catch (error) {
            console.log(error)
            res.clearCookie('jwt')
            return res.redirect('/login')
        }
    } else {
        res.redirect('/login')
    }
}


// LOGOUT
exports.logout = (req, res) => {
    res.clearCookie('jwt')
    return res.redirect('/login')
}
