import express from 'express';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// GET /api/reports/sales - Reporte de ventas por período
router.get('/sales', authenticateToken, async (req, res) => {
    try {
        const from = new Date(req.query.from || new Date().setDate(new Date().getDate() - 30));
        const to = new Date(req.query.to || new Date());
        
        const salesData = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: from, $lte: to },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    total: { $sum: '$total' },
                    transactions: { $sum: 1 },
                    productsSold: { $sum: { $size: '$items' } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const dailySales = salesData.map(item => ({
            date: item._id,
            total: item.total,
            transactions: item.transactions,
            productsSold: item.productsSold
        }));

        const totalSales = dailySales.reduce((sum, day) => sum + day.total, 0);
        const totalTransactions = dailySales.reduce((sum, day) => sum + day.transactions, 0);
        const totalProductsSold = dailySales.reduce((sum, day) => sum + day.productsSold, 0);

        res.json({
            success: true,
            dailySales,
            totalSales,
            totalTransactions,
            totalProductsSold
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/reports/top-products - Productos más vendidos
router.get('/top-products', authenticateToken, async (req, res) => {
    try {
        const topProducts = await Sale.aggregate([
            { $match: { status: 'completed' } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    productName: { $first: '$items.productName' },
                    quantitySold: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                }
            },
            { $sort: { quantitySold: -1 } },
            { $limit: 10 }
        ]);

        res.json({ success: true, topProducts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/reports/inventory - Estadísticas de inventario
router.get('/inventory', authenticateToken, async (req, res) => {
    try {
        const categoryStats = await Product.aggregate([
            {
                $group: {
                    _id: '$category',
                    totalStock: { $sum: '$stock' },
                    productCount: { $sum: 1 },
                    averagePrice: { $avg: '$price' }
                }
            }
        ]);

        res.json({ success: true, categoryStats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;