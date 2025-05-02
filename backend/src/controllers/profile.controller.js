const pool = require('../config/database');
const bcrypt = require('bcryptjs');

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

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;
  const role = 'user';

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