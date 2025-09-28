import express from 'express';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// 📋 Obtener ventas recientes (para el dashboard)
router.get('/recent', authenticateToken, async (req, res) => {
    try {
        const recentSales = await Sale.find({ status: 'completed' })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('saleNumber total items createdAt')
            .populate('seller', 'name email');

        res.json({
            success: true,
            sales: recentSales
        });

    } catch (error) {
        console.error('Error al obtener ventas recientes:', error);
        res.status(500).json({
            success: false,
            error: 'Error al cargar ventas recientes'
        });
    }
});

// ➕ Ruta para crear nueva venta
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { items, paymentMethod, customer } = req.body;

        // Validar items
        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'La venta debe contener al menos un producto'
            });
        }

        // Calcular total y validar stock
        let total = 0;
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(400).json({
                    success: false,
                    error: `Producto no encontrado: ${item.product}`
                });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    error: `Stock insuficiente para: ${product.name}`
                });
            }

            item.productName = product.name;
            item.price = product.price;
            item.subtotal = item.quantity * product.price;
            total += item.subtotal;
        }

        // Crear la venta
        const sale = new Sale({
            items,
            total,
            paymentMethod: paymentMethod || 'cash',
            customer: customer || {},
            seller: req.user.userId // Del middleware de autenticación
        });

        await sale.save();

        res.status(201).json({
            success: true,
            sale: {
                id: sale._id,
                saleNumber: sale.saleNumber,
                total: sale.total,
                items: sale.items
            }
        });

    } catch (error) {
        console.error('Error al crear venta:', error);
        res.status(500).json({
            success: false,
            error: 'Error al procesar la venta'
        });
    }
});

export default router;