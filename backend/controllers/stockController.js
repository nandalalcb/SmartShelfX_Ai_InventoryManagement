const { StockTransaction, Product, User } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

exports.create = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { product_id, quantity, type } = req.body;

        const product = await Product.findByPk(product_id, { transaction: t });
        if (!product) {
            await t.rollback();
            return res.status(404).json({ error: 'Product not found' });
        }

        if (type === 'OUT' && product.current_stock < quantity) {
            await t.rollback();
            return res.status(400).json({
                error: `Insufficient stock. Available: ${product.current_stock}, Requested: ${quantity}`,
            });
        }

        const transaction = await StockTransaction.create({
            product_id,
            quantity,
            type,
            timestamp: new Date(),
            handled_by: req.user.id,
        }, { transaction: t });

        const newStock = type === 'IN'
            ? product.current_stock + quantity
            : product.current_stock - quantity;

        await product.update({ current_stock: newStock }, { transaction: t });

        await t.commit();

        res.status(201).json({
            message: `Stock ${type} recorded successfully`,
            transaction,
            newStock,
        });
    } catch (error) {
        await t.rollback();
        next(error);
    }
};

exports.getAll = async (req, res, next) => {
    try {
        const {
            product_id, type, start_date, end_date,
            page = 1, limit = 20,
        } = req.query;

        const where = {};
        const offset = (parseInt(page) - 1) * parseInt(limit);

        if (product_id) where.product_id = product_id;
        if (type) where.type = type;
        if (start_date || end_date) {
            where.timestamp = {};
            if (start_date) where.timestamp[Op.gte] = new Date(start_date);
            if (end_date) where.timestamp[Op.lte] = new Date(end_date);
        }

        const { count, rows } = await StockTransaction.findAndCountAll({
            where,
            include: [
                { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
                { model: User, as: 'handler', attributes: ['id', 'name'] },
            ],
            order: [['timestamp', 'DESC']],
            limit: parseInt(limit),
            offset,
        });

        res.json({
            transactions: rows,
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit)),
        });
    } catch (error) {
        next(error);
    }
};

exports.getById = async (req, res, next) => {
    try {
        const txn = await StockTransaction.findByPk(req.params.id, {
            include: [
                { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
                { model: User, as: 'handler', attributes: ['id', 'name'] },
            ],
        });
        if (!txn) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json(txn);
    } catch (error) {
        next(error);
    }
};
