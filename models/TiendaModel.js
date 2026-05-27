const db = require('../database/db')

class TiendaModel {

    // Registra el perfil de tienda que luego valida el admin.
    static async crear({ id_usuario, nombre_tienda, documento, descripcion }) {
        const [result] = await db.query(
            `INSERT INTO vendedor_perfil (id_vendedor, nombre_tienda, documento, descripcion)
             VALUES (?, ?, ?, ?)`,
            [id_usuario, nombre_tienda, documento, descripcion]
        )
        return result.insertId
    }

    // Busca el perfil de tienda por usuario vendedor.
    static async findByUsuario(id_usuario) {
        const [rows] = await db.query(
            `SELECT * FROM vendedor_perfil WHERE id_vendedor = ?`,
            [id_usuario]
        )
        return rows[0] || null
    }

    // Listado administrativo de tiendas con datos del usuario.
    static async getAll() {
        const [rows] = await db.query(
            `SELECT vp.*, u.nombre, u.correo
             FROM vendedor_perfil vp
             INNER JOIN usuarios u ON vp.id_vendedor = u.id_usuario
             ORDER BY vp.id_vendedor DESC`
        )
        return rows
    }

    // Cambia estado de verificacion de la tienda.
    static async cambiarEstado(id_vendedor, estado) {
        await db.query(
            `UPDATE vendedor_perfil SET estado_verif = ? WHERE id_vendedor = ?`,
            [estado, id_vendedor]
        )
    }
}

module.exports = TiendaModel
