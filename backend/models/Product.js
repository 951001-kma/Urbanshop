import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    stock: {
        type: Number,
        required: true,
        min: 0
    },
    sku: {
        type: String,
        unique: true
    },
    lowStockAlert: {
        type: Number,
        default: 5
    }
}, {
    timestamps: true
});

// Índices para búsquedas eficientes
productSchema.index({ name: 'text', category: 'text' });
productSchema.index({ stock: 1 }); // Para alertas de bajo stock

export default mongoose.model('Product', productSchema);