const pool = require('../config/database');

exports.create = async (req, res) => {
  const { productId, userId } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO product_likes ("productId", "userId", "createdAt", "updatedAt") VALUES ($1,$2,NOW(),NOW()) RETURNING *',
      [productId, userId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear like' });
  }
};

exports.delete = async (req, res) => {
  const { productId, userId } = req.body;
  try {
    const result = await pool.query(
        'DELETE FROM product_likes WHERE "productId"=$1 AND "userId"=$2', 
        [productId, userId]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Like no encontrado' });
    res.json({ message: 'Like eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar like' });
  }
};

exports.getById = async (req, res) => {
  const { productId, userId } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM product_likes WHERE "productId"=$1 AND userId=$2', [productId, userId]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener like' });
  }
};  


exports.getAll = async (req, res) => {
  const { userId } = req.query;
  try {
    const { rows } = await pool.query(`
      SELECT p.*
      FROM products p
      INNER JOIN product_likes pl ON p.id = pl."productId" AND pl."userId" = $1
      ORDER BY p.id`, 
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};