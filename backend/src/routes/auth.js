const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const pool = require('../config/database');

router.post('/register', async (req, res) => {
  try {
    let { name, email, password, role } = req.body; 

    // Validar que los campos obligatorios existan
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    // Si no envían rol, ponerlo como 'usuario' por defecto
    if (!role) {
      role = 'user';
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const date = new Date();

    const result = await pool.query(
      'INSERT INTO users (name, email, password, role, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role',
      [name, email, hashedPassword, role, date, date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
      const { rows } = await pool.query('SELECT * FROM users');
      res.json(rows);
  } catch (error) {
      console.error('Error al obtener productos:', error);
      res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const user = await User.findByEmail(email);
    
//     if (!user) {
//       return res.status(401).json({ error: 'Credenciales inválidas' });
//     }

//     const validPassword = await bcrypt.compare(password, user.password);
//     if (!validPassword) {
//       return res.status(401).json({ error: 'Credenciales inválidas' });
//     }

//     const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
//     res.json({ token });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

module.exports = router; 