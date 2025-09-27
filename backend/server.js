import express from 'express';
import cors from 'cors';
import connectDB from './config/database.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar a MongoDB
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Rutas
app.use('/api', userRoutes);

// Servir el frontend
app.get('/', (req, res) => {
    res.sendFile('frontend/index.html', { root: '.' });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});