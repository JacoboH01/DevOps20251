const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const pool = require('./config/database');
const path = require('path');
const bcrypt = require('bcryptjs');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de autenticación
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Intento de login:', { email, password });

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // Buscar usuario en la base de datos
        const query = 'SELECT id, email, password FROM users WHERE email = $1';
        const { rows } = await pool.query(query, [email]);
        console.log(rows);
        const user = rows[0];

        console.log('Usuario encontrado:', user ? 'Sí' : 'No');

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Comparar contraseñas con bcrypt
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Crear token
        const token = jwt.sign(
            { 
                userId: user.id,
                email: user.email
            }, 
            process.env.JWT_SECRET || 'secreto_temporal',
            { expiresIn: '24h' }
        );

        console.log('Token generado:', token);

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
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
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/../../', 'index.html'));
});

app.get('/tienda.html', (req, res) => {
    res.sendFile(path.join(__dirname, '/../../', 'tienda.html'));
});

// app.use('/api/products', require('./routes/products'));
// app.use('/api/cart', require('./routes/cart'));
// app.use('/api/orders', require('./routes/orders'));

// Puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
}); 