const pool = require('../config/database');
const path = require('path');

// Obtener todos los productos
exports.getAll = async (req, res) => {
  const { userId } = req.query;
  try {
    const { rows } = await pool.query(`
      SELECT p.*, pl."userId" IS NOT NULL AS liked
      FROM products p
      LEFT JOIN product_likes pl ON p.id = pl."productId" AND pl."userId" = $1
      ORDER BY p.id`, 
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

// Obtener uno por ID
exports.getById = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM products WHERE id = $1', [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

// Crear producto
exports.create = async (req, res) => {
  const { nombre, precio, stock, categoria, descripcion } = req.body;
  
  const extension = path.extname(req.file.originalname);
  const imageUrl = req.file ? `/images/${categoria}/${nombre}${extension}` : null;
  
  try {
    const { rows } = await pool.query(
      `INSERT INTO products
         (name, price, stock, category, description, "imageUrl", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
       RETURNING *`,
      [nombre, precio, stock, categoria, descripcion, imageUrl]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear producto', detail: err.message });
  }
};

// Actualizar producto
exports.update = async (req, res) => {
  const { id } = req.params;
  const { nombre, precio, stock, categoria, descripcion } = req.body;
  
  try {
    // Obtener URL de imagen actual
    const existing = await pool.query(
      'SELECT "imageUrl" FROM products WHERE id = $1', [id]
    );
    if (!existing.rowCount) return res.status(404).json({ error: 'Producto no encontrado' });

    let imageUrl = existing.rows[0].imageUrl;
    if(req.file){
      const extension = path.extname(req.file.originalname);
      imageUrl = `/images/${categoria}/${nombre}${extension}`;
    }

    await pool.query(
      `UPDATE products
         SET name       = $1,
             price       = $2,
             stock        = $3,
             category    = $4,
             description  = $5,
             "imageUrl"    = $6,
             "updatedAt" = NOW()
       WHERE id = $7`,
      [nombre, precio, stock, categoria, descripcion, imageUrl, id]
    );

    res.json({ message: 'Producto actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar producto', detail: err.message });
  }
};

// Eliminar producto
exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1', [id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};