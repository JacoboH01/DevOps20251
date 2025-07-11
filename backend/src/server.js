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
const likesRouter = require('./routes/likes');
const ordersRouter = require('./routes/orders');
const dashboardRoutes = require('./routes/dashboard');
const pool = require('./config/database');

const allowedOrigins = [
    'http://localhost:3000',
    'https://devops20251-production.up.railway.app'
];

app.use(cors({
    origin: function (origin, callback) {
      // Permitir solicitudes sin origin (como de curl o Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    },
    credentials: true // si usas cookies o auth headers
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Carpeta pública
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de API
app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/profile', profileRouter);
app.use('/api/likes', likesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/dashboard', dashboardRoutes);

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


app.get('/likes', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/likes.html'));
});

app.get('/orders', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/orders.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
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