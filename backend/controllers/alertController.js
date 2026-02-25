const { Alert, Product } = require('../models');
const { Op } = require('sequelize');

exports.getAll = async (req, res, next) => {
    try {
        const { type, is_read, page = 1, limit = 20 } = req.query;
        const where = {};
        const offset = (parseInt(page) - 1) * parseInt(limit);

        if (type) where.type = type;
        if (is_read !== undefined) where.is_read = is_read === 'true';

        // Show alerts for the user or global alerts (user_id is null)
        if (req.user.role !== 'ADMIN') {
            where[Op.or] = [
                { user_id: req.user.id },
                { user_id: null },
            ];
        }

        const { count, rows } = await Alert.findAndCountAll({
            where,
            include: [
                { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset,
        });

        res.json({
            alerts: rows,
            total: count,
            unread: await Alert.count({ where: { ...where, is_read: false } }),
            page: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit)),
        });
    } catch (error) {
        next(error);
    }
};

exports.markRead = async (req, res, next) => {
    try {
        const alert = await Alert.findByPk(req.params.id);
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        await alert.update({ is_read: true });
        res.json({ message: 'Alert marked as read' });
    } catch (error) {
        next(error);
    }
};

exports.markAllRead = async (req, res, next) => {
    try {
        const where = { is_read: false };
        if (req.user.role !== 'ADMIN') {
            where[Op.or] = [
                { user_id: req.user.id },
                { user_id: null },
            ];
        }

        await Alert.update({ is_read: true }, { where });
        res.json({ message: 'All alerts marked as read' });
    } catch (error) {
        next(error);
    }
};

exports.dismiss = async (req, res, next) => {
    try {
        const alert = await Alert.findByPk(req.params.id);
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        await alert.destroy();
        res.json({ message: 'Alert dismissed' });
    } catch (error) {
        next(error);
    }
};

exports.getUnreadCount = async (req, res, next) => {
    try {
        const where = { is_read: false };
        if (req.user.role !== 'ADMIN') {
            where[Op.or] = [
                { user_id: req.user.id },
                { user_id: null },
            ];
        }

        const count = await Alert.count({ where });
        res.json({ unread: count });
    } catch (error) {
        next(error);
    }
};

exports.generateLowStockAlerts = async () => {
    try {
        const products = await Product.findAll({
            where: {
                current_stock: { [Op.lte]: require('sequelize').col('reorder_level') },
            },
        });

        for (const product of products) {
            const existing = await Alert.findOne({
                where: {
                    product_id: product.id,
                    type: 'LOW_STOCK',
                    is_read: false,
                },
            });

            if (!existing) {
                await Alert.create({
                    type: 'LOW_STOCK',
                    message: `Low stock alert: ${product.name} (SKU: ${product.sku}) has ${product.current_stock} units, below reorder level of ${product.reorder_level}`,
                    is_read: false,
                    product_id: product.id,
                });
            }
        }
    } catch (error) {
        console.error('Error generating low stock alerts:', error);
    }
};
