const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Datos simulados simplificados
const users = [
    {
        id: 1,
        email: 'admin@pchub.com',
        password: 'gaming123' // Contraseña sin hash temporalmente
    }
];

// Rutas de autenticación
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Intento de login:', { email, password }); // Para debugging
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        const user = users.find(u => u.email === email);
        console.log('Usuario encontrado:', user ? 'Sí' : 'No'); // Para debugging

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        if (user.password !== password) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar token con expiración de 24 horas
        const token = jwt.sign(
            { 
                userId: user.id,
                email: user.email
            }, 
            process.env.JWT_SECRET || 'secreto_temporal',
            { expiresIn: '24h' }
        );
        
        console.log('Token generado:', token); // Para debugging
        res.json({ 
            token,
            user: {
                id: user.id,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Error en login:', error); // Para debugging
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/auth/register', (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Verificar si el usuario ya existe
        if (users.some(u => u.email === email)) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        const newUser = {
            id: users.length + 1,
            email,
            password
        };
        
        users.push(newUser);
        res.status(201).json({ id: newUser.id, email: newUser.email });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rutas
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));

// Puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
}); 