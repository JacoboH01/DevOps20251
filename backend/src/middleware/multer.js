const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Función para limpiar el nombre del producto para el archivo
function sanitizeFileName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-') // reemplaza todo lo que no sea letra o número por guión
        .replace(/-+/g, '-');       // reemplaza múltiples guiones por uno solo
}

// Configurar Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const { category, name } = req.body;

        // Validar que vengan el nombre y la categoría
        if (!category || !name) {
            return cb(new Error('El nombre y la categoría son requeridos para subir la imagen.'));
        }

        const dir = path.join(__dirname, '../../public/images/', category);

        // Crear la carpeta si no existe
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const { name } = req.body;
        const safeName = sanitizeFileName(name);
        const ext = path.extname(file.originalname); // Mantiene la extensión original (.jpg, .png, etc.)

        cb(null, `${safeName}${ext}`);
    }
});

const upload = multer({ storage });

module.exports = upload;