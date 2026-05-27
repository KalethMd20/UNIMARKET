const db     = require('../database/db')
const bcrypt = require('bcryptjs')
// Gestion de perfil del usuario autenticado.

exports.verPerfil = async (req, res) => {
    try {
        const [[usuario]] = await db.query(
            'SELECT id_usuario, nombre, correo, telefono, facultad FROM usuarios WHERE id_usuario = ?',
            [req.user.id_usuario]
        )
        res.render('perfil', {
            user:    req.user,
            usuario,
            alert:   false
        })
    } catch (error) {
        console.log(error)
        res.redirect('/')
    }
}

exports.actualizarPerfil = async (req, res) => {
    const { nombre, correo, telefono, facultad, contrasena_nueva } = req.body

    try {
        if (contrasena_nueva && contrasena_nueva.trim() !== '') {
            const hash = await bcrypt.hash(contrasena_nueva, 10)
            await db.query(
                `UPDATE usuarios SET nombre=?, correo=?, telefono=?, facultad=?, contrasena=? WHERE id_usuario=?`,
                [nombre, correo, telefono, facultad, hash, req.user.id_usuario]
            )
        } else {
            await db.query(
                `UPDATE usuarios SET nombre=?, correo=?, telefono=?, facultad=? WHERE id_usuario=?`,
                [nombre, correo, telefono, facultad, req.user.id_usuario]
            )
        }

        // usuario fresco de BD para que el form refleje los cambios
        const [[usuario]] = await db.query(
            'SELECT id_usuario, nombre, correo, telefono, facultad FROM usuarios WHERE id_usuario = ?',
            [req.user.id_usuario]
        )

        res.render('perfil', {
            user:              { ...req.user, nombre, correo, telefono, facultad },
            usuario,
            alert:             true,
            alertTitle:        '¡Guardado!',
            alertMessage:      'Tu perfil fue actualizado correctamente',
            alertIcon:         'success',
            showConfirmButton: false,
            timer:             2000,
            ruta:              req.user.nombre_rol
        })

    } catch (error) {
        console.log(error)

        const [[usuario]] = await db.query(
            'SELECT id_usuario, nombre, correo, telefono, facultad FROM usuarios WHERE id_usuario = ?',
            [req.user.id_usuario]
        ).catch(() => [[null]])

        res.render('perfil', {
            user:              req.user,
            usuario:           usuario || req.user,
            alert:             true,
            alertTitle:        'Error',
            alertMessage:      'No se pudo actualizar el perfil. Intenta de nuevo.',
            alertIcon:         'error',
            showConfirmButton: true,
            timer:             false,
            ruta:              'perfil'
        })
    }
}
