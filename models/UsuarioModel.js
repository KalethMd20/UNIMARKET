const db      = require('../database/db')
const bcrypt  = require('bcryptjs')

class UsuarioModel {

    // Valida login buscando usuario activo y su rol.
    // Buscar usuario por correo (incluye nombre del rol)
    static async findByCorreo(correo) {
        const [rows] = await db.query(
            `SELECT u.*, r.nombre_rol
             FROM usuarios u
             INNER JOIN roles r ON u.id_rol = r.id_rol
             WHERE u.correo = ? AND u.estado = 'activo'
             LIMIT 1`,
            [correo]
        )
        return rows[0] || null
    }

    // Registrar nuevo usuario
    static async crear({ nombre, correo, contrasena, id_rol, facultad, telefono }) {
        const hash = await bcrypt.hash(contrasena, 10)
        const [result] = await db.query(
            `INSERT INTO usuarios 
             (nombre, correo, contrasena, id_rol, facultad, telefono)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nombre, correo, hash, id_rol, facultad || null, telefono || null]
        )
        return result.insertId
    }

    // Verificar contraseña
    static async verificarPassword(plain, hash) {
        return bcrypt.compare(plain, hash)
    }

    // Obtener todos los usuarios (admin)
    static async getAll() {
        const [rows] = await db.query(
            `SELECT u.id_usuario, u.nombre, u.correo,
                    r.nombre_rol, u.facultad, u.estado, u.fecha_registro
             FROM usuarios u
             INNER JOIN roles r ON u.id_rol = r.id_rol
             ORDER BY u.fecha_registro DESC`
        )
        return rows
    }

    // Activar o desactivar usuario
    static async cambiarEstado(id, estado) {
        await db.query(
            `UPDATE usuarios SET estado = ? WHERE id_usuario = ?`,
            [estado, id]
        )
    }
}

module.exports = UsuarioModel
