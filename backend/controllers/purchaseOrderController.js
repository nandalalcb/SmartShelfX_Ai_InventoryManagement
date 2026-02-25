const { PurchaseOrder, Product, User, StockTransaction } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

exports.create = async (req, res, next) => {
    try {
        const { product_id, vendor_id, quantity } = req.body;

        const product = await Product.findByPk(product_id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const vendor = await User.findOne({ where: { id: vendor_id, role: 'VENDOR' } });
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        const po = await PurchaseOrder.create({
            product_id,
            vendor_id,
            quantity,
            status: 'PENDING',
            created_at: new Date(),
        });

        res.status(201).json({ message: 'Purchase order created', purchaseOrder: po });
    } catch (error) {
        next(error);
    }
};

exports.getAll = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const where = {};
        const offset = (parseInt(page) - 1) * parseInt(limit);

        if (status) where.status = status;
        if (req.user.role === 'VENDOR') where.vendor_id = req.user.id;

        const { count, rows } = await PurchaseOrder.findAndCountAll({
            where,
            include: [
                { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'current_stock'] },
                { model: User, as: 'vendor', attributes: ['id', 'name', 'email'] },
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset,
        });

        res.json({
            purchaseOrders: rows,
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
        const po = await PurchaseOrder.findByPk(req.params.id, {
            include: [
                { model: Product, as: 'product' },
                { model: User, as: 'vendor', attributes: { exclude: ['password'] } },
            ],
        });
        if (!po) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }
        if (req.user.role === 'VENDOR' && po.vendor_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(po);
    } catch (error) {
        next(error);
    }
};

// VENDOR approves a PENDING PO → APPROVED (no stock change)
exports.approve = async (req, res, next) => {
    try {
        const po = await PurchaseOrder.findByPk(req.params.id);
        if (!po) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }
        if (req.user.role === 'VENDOR' && po.vendor_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (po.status !== 'PENDING') {
            return res.status(400).json({ error: `Cannot approve. Current status: ${po.status}` });
        }
        await po.update({ status: 'APPROVED' });
        res.json({ message: 'Purchase order approved', purchaseOrder: po });
    } catch (error) {
        next(error);
    }
};

// VENDOR dispatches an APPROVED PO → DISPATCHED (no stock change)
exports.dispatch = async (req, res, next) => {
    try {
        const po = await PurchaseOrder.findByPk(req.params.id);
        if (!po) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }
        if (req.user.role === 'VENDOR' && po.vendor_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (po.status !== 'APPROVED') {
            return res.status(400).json({ error: `Cannot dispatch. Current status: ${po.status}` });
        }

        await po.update({ status: 'DISPATCHED' });

        res.json({
            message: 'Purchase order dispatched',
            purchaseOrder: po,
        });
    } catch (error) {
        next(error);
    }
};

// MANAGER receives a DISPATCHED PO → RECEIVED (stock increases here)
exports.receive = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const po = await PurchaseOrder.findByPk(req.params.id, {
            include: [{ model: Product, as: 'product' }],
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        if (!po) {
            await t.rollback();
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        if (po.status === 'RECEIVED') {
            await t.rollback();
            return res.status(400).json({ error: 'Purchase order has already been received' });
        }

        if (po.status !== 'DISPATCHED') {
            await t.rollback();
            return res.status(400).json({ error: `Cannot receive. Current status: ${po.status}` });
        }

        // Lock and fetch the product row for update
        const product = await Product.findByPk(po.product_id, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        if (!product) {
            await t.rollback();
            return res.status(404).json({ error: 'Product linked to PO not found' });
        }

        // Increase stock
        const newStock = product.current_stock + po.quantity;
        await product.update({ current_stock: newStock }, { transaction: t });

        // Log the stock transaction
        await StockTransaction.create({
            product_id: po.product_id,
            quantity: po.quantity,
            type: 'IN',
            timestamp: new Date(),
            handled_by: req.user.id,
        }, { transaction: t });

        // Update PO status
        await po.update({ status: 'RECEIVED' }, { transaction: t });

        await t.commit();

        res.json({
            message: 'Purchase order received and stock updated',
            purchaseOrder: po,
            newStock,
        });
    } catch (error) {
        await t.rollback();
        next(error);
    }
};

exports.reject = async (req, res, next) => {
    try {
        const po = await PurchaseOrder.findByPk(req.params.id);
        if (!po) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }
        if (po.status !== 'PENDING') {
            return res.status(400).json({ error: `Cannot reject. Current status: ${po.status}` });
        }
        await po.destroy();
        res.json({ message: 'Purchase order rejected and removed' });
    } catch (error) {
        next(error);
    }
};
