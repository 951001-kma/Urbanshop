import express from 'express';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// 📊 KPIs del Dashboard
router.get('/kpis', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Ventas del día
        const dailySales = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: today, $lt: tomorrow },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$total' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Total de stock
        const stockInfo = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalStock: { $sum: '$stock' },
                    totalProducts: { $sum: 1 }
                }
            }
        ]);

        // Alertas de bajo stock
        const lowStockAlerts = await Product.find({
            stock: { $lte: 5 } // Stock menor o igual a 5
        }).countDocuments();

        // Productos más vendidos (últimos 7 días)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const topProducts = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo },
                    status: 'completed'
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    productName: { $first: '$items.productName' },
                    totalSold: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.subtotal' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            }
        ]);

        res.json({
            success: true,
            kpis: {
                dailySales: dailySales[0]?.total || 0,
                salesCount: dailySales[0]?.count || 0,
                totalStock: stockInfo[0]?.totalStock || 0,
                totalProducts: stockInfo[0]?.totalProducts || 0,
                lowStockAlerts: lowStockAlerts
            },
            topProducts: topProducts
        });

    } catch (error) {
        console.error('Error en KPIs:', error);
        res.status(500).json({
            success: false,
            error: 'Error al cargar los KPIs'
        });
    }
});

// 📈 Ventas por día (últimos 30 días)
router.get('/sales-trend', authenticateToken, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const salesTrend = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt'
                        }
                    },
                    total: { $sum: '$total' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            salesTrend: salesTrend
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al cargar tendencia de ventas'
        });
    }
});

// ⚠️ Productos con bajo stock
router.get('/low-stock', authenticateToken, async (req, res) => {
    try {
        const lowStockProducts = await Product.find({
            stock: { $lte: 5 }
        }).sort({ stock: 1 }).limit(10);

        res.json({
            success: true,
            lowStockProducts: lowStockProducts
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al cargar productos con bajo stock'
        });
    }
});

export default router;