import express from 'express';
import Product from '../models/Product.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// GET /api/products - Listar productos con paginación
router.get('/', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const skip = (page - 1) * limit;

        let query = {};
        
        if (search) {
            if (search === 'low-stock') {
                query.stock = { $lte: 5 };
            } else {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { category: { $regex: search, $options: 'i' } },
                    { sku: { $regex: search, $options: 'i' } }
                ];
            }
        }

        const products = await Product.find(query)
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit);

        const total = await Product.countDocuments(query);

        res.json({
            success: true,
            products,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/products/:id - Obtener un producto
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, error: 'Producto no encontrado' });
        }
        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/products - Crear producto
router.post('/', authenticateToken, async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json({ success: true, product });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ success: false, error: 'El SKU ya existe' });
        } else {
            res.status(400).json({ success: false, error: error.message });
        }
    }
});

// PUT /api/products/:id - Actualizar producto
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        res.json({ success: true, product });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// DELETE /api/products/:id - Eliminar producto
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Producto eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;