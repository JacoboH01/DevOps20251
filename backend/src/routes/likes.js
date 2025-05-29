const express = require('express');
const router = express.Router();
const likesController = require('../controllers/likes.controller');

// CRUD Likes
router.post('/',   likesController.create);
router.delete('/', likesController.delete);
router.get('/:id', likesController.getById);
router.get('/',    likesController.getAll);

module.exports = router;