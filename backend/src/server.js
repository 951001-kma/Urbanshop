const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Conexión a MongoDB (IMPORTANTE para Docker)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/urbanshop', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

app.get('/', (req, res) => {
    res.json({ message: 'Backend funcionando!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
});