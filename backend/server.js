import express from 'express';
import cors from 'cors';
import connectDB from './config/database.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import productsRoutes from './routes/productsRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar a MongoDB
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Rutas
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/reports', reportsRoutes);

// Servir el frontend
app.get('/', (req, res) => {
    res.sendFile('frontend/index.html', { root: '.' });
});

// Ruta para dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile('frontend/dashboard.html', { root: '.' });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});