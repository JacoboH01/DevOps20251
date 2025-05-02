const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');

// Funciones de perfil usuario
router.get('/:id', profileController.getById);
router.put('/:id', profileController.update);

module.exports = router;