const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const productController = require('../controllers/product.controller');
const fs = require('fs');

// Configuración de Multer
const uploadImage = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(__dirname, '../../public/images/', req.body.categoria || 'default');
            // Crea la carpeta si no existe
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir, { recursive: true });
            }
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            let fileName = req.body.nombre || 'unnamed';
            cb(null, fileName + path.extname(file.originalname));
        }
    })
});

// CRUD Products
router.get('/',           productController.getAll);
router.get('/:id',        productController.getById);
router.post('/', uploadImage.single('imagen'), productController.create);
router.put('/:id', uploadImage.single('imagen'), productController.update);
router.delete('/:id',     productController.delete);

module.exports = router;