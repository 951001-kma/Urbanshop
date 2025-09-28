import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: String, // Cache del nombre para reportes
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    subtotal: {
        type: Number,
        required: true
    }
});

const saleSchema = new mongoose.Schema({
    saleNumber: {
        type: String,
        unique: true
    },
    items: [saleItemSchema],
    total: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'transfer'],
        default: 'cash'
    },
    customer: {
        name: String,
        email: String,
        phone: String
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['completed', 'cancelled', 'refunded'],
        default: 'completed'
    }
}, {
    timestamps: true
});

// Generar número de venta automático
saleSchema.pre('save', async function(next) {
    if (!this.saleNumber) {
        const count = await mongoose.model('Sale').countDocuments();
        this.saleNumber = `V${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

// Actualizar stock después de la venta
saleSchema.post('save', async function(doc) {
    if (doc.status === 'completed') {
        for (const item of doc.items) {
            await mongoose.model('Product').findByIdAndUpdate(
                item.product,
                { $inc: { stock: -item.quantity } }
            );
        }
    }
});

export default mongoose.model('Sale', saleSchema);