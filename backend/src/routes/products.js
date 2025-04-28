const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Middleware previo para asegurarte que ya tienes el 'name' en req.body
const uploadMiddleware = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(__dirname, '../../public/images/', req.body.category || 'default');
            // Crea la carpeta si no existe
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir, { recursive: true });
            }
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            let fileName = req.body.name || 'unnamed';
            cb(null, fileName + path.extname(file.originalname));
        }
    })
});

// Crear producto
router.post('/', uploadMiddleware.single('image'), async (req, res) => {
    try {
        const { name, price, description, category, stock } = req.body;

         // Validar que vengan todos los campos obligatorios
         if (!name || !price || !description || !category || !stock) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }

        const extension = path.extname(req.file.originalname);
        const imageUrl = req.file ? `/images/${category}/${name}${extension}` : null;

        const date = new Date();

        const result = await pool.query(
            `INSERT INTO products (name, price, description, category, stock, "imageUrl", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [name, price, description, category, stock, imageUrl, date, date]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: 'Error al crear producto', error });
    }
});

// Obtener productos
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM products');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// Actualizar producto
router.put('/:id', uploadMiddleware.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, description, category, stock } = req.body;

        // 1. Consultar el producto actual
        const existingProduct = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (existingProduct.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const oldProduct = existingProduct.rows[0];
        let oldImagePath = null;

        if (oldProduct.imageUrl) {
            oldImagePath = path.join(__dirname, '../../public', oldProduct.imageUrl);
        }

        // 2. Definir los nuevos valores
        let fields = [];
        let values = [];
        let index = 1;
        let newImageUrl = oldProduct.imageUrl; // por defecto mantenemos la actual

        // 3. Si hay nueva imagen
        if (req.file) {
            const extension = path.extname(req.file.originalname);

            const newCategory = category || oldProduct.category;
            const newName = name || oldProduct.name;

            newImageUrl = `/images/${newCategory}/${newName}${extension}`;

            // Crear carpeta si no existe
            const newCategoryPath = path.join(__dirname, '../../public/images/', newCategory);
            if (!fs.existsSync(newCategoryPath)) {
                fs.mkdirSync(newCategoryPath, { recursive: true });
            }

            // Mover el archivo subido a la carpeta correcta
            const tempPath = req.file.path;
            const targetPath = path.join(__dirname, '../../public', newImageUrl);

            fs.renameSync(tempPath, targetPath);

            // Borrar la imagen anterior si existe
            if (oldImagePath && fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }

            fields.push(`"imageUrl" = $${index++}`);
            values.push(newImageUrl);
        } else if (category && category !== oldProduct.category) {
            // 4. Si NO hay nueva imagen pero cambió la categoría, mover la imagen antigua
            if (oldImagePath && fs.existsSync(oldImagePath)) {
                const oldExtension = path.extname(oldProduct.imageUrl);
                const newImagePath = path.join(__dirname, '../../public/images/', category, `${oldProduct.name}${oldExtension}`);
                const newImageUrlPath = `/images/${category}/${oldProduct.name}${oldExtension}`;

                // Crear carpeta si no existe
                const newCategoryPath = path.join(__dirname, '../../public/images/', category);
                if (!fs.existsSync(newCategoryPath)) {
                    fs.mkdirSync(newCategoryPath, { recursive: true });
                }

                fs.renameSync(oldImagePath, newImagePath);

                newImageUrl = newImageUrlPath;

                fields.push(`"imageUrl" = $${index++}`);
                values.push(newImageUrl);
            }
        }

        // 5. Actualizar otros campos
        if (name) {
            fields.push(`name = $${index++}`);
            values.push(name);
        }
        if (price) {
            fields.push(`price = $${index++}`);
            values.push(price);
        }
        if (description) {
            fields.push(`description = $${index++}`);
            values.push(description);
        }
        if (category) {
            fields.push(`category = $${index++}`);
            values.push(category);
        }
        if (stock) {
            fields.push(`stock = $${index++}`);
            values.push(stock);
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        // Agregar el ID como último parámetro
        values.push(id);

        const query = `
            UPDATE products 
            SET ${fields.join(', ')}
            WHERE id = $${index}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ error: 'Error interno al actualizar producto' });
    }
});

// Eliminar producto
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('SELECT "imageUrl" FROM products WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const imageUrl = result.rows[0].imageUrl;

        await pool.query('DELETE FROM products WHERE id = $1', [id]);

        if (imageUrl) {
            const imagePath = path.join(__dirname, '../../public', imageUrl);
            
            // Verificar si el archivo existe antes de intentar borrarlo
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        res.json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

module.exports = router;