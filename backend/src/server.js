const express = require('express');
const app = express();
app.disable("x-powered-by");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const bcrypt = require('bcryptjs');

//Instacias de clases 
const productsRouter = require('./routes/products');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const profileRouter = require('./routes/profile');
const pool = require('./config/database');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Carpeta pública
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de API
app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/profile', profileRouter);

// Ruta raíz (redirige a index.html automáticamente gracias a express.static)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Ruta /tienda para servir tienda.html
app.get('/tienda', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/tienda.html'));
});

app.get('/users', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/usuarios.html'));
});

app.get('/products', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/productos.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/perfil.html'));
});


// Rutas de autenticación
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Intento de login:', { email, password });

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        const query = 'SELECT id, email, password, role FROM users WHERE email = $1';
        const { rows } = await pool.query(query, [email]);
        const user = rows[0];

        console.log('Usuario encontrado:', user ? 'Sí' : 'No');

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET || 'secreto_temporal',
            { expiresIn: '24h' }
        );

        console.log('Token generado:', token);

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});