const pool = require('../config/database');
const bcrypt = require('bcryptjs');

exports.getAll = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

exports.getById = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

exports.create = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
 
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password, role, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,NOW(),NOW()) RETURNING *',
      [name, email, hashedPassword, role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role } = req.body;

  try {
    // 1) Obtengo la contraseña actual si existe
    const existing = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [id]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const currentHashed = existing.rows[0].password;

    // 2) Si vienen password, la encripto; si no, uso la vieja
    let finalPassword = currentHashed;
    if (password) {
      finalPassword = await bcrypt.hash(password, 10);
    }

    // 3) Actualizo todos los campos de golpe
    const result = await pool.query(
      `UPDATE users
         SET name       = $1,
             email      = $2,
             password   = $3,
             role       = $4,
             "updatedAt"= NOW()
       WHERE id = $5`,
      [name, email, finalPassword, role, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Error al actualizar usuario',
      detail: err.message
    });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE id=$1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};