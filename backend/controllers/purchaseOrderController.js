const { PurchaseOrder, Product, User } = require('../models');
const { Op } = require('sequelize');

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
        res.json(po);
    } catch (error) {
        next(error);
    }
};

exports.approve = async (req, res, next) => {
    try {
        const po = await PurchaseOrder.findByPk(req.params.id);
        if (!po) {
            return res.status(404).json({ error: 'Purchase order not found' });
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

exports.dispatch = async (req, res, next) => {
    try {
        const po = await PurchaseOrder.findByPk(req.params.id, {
            include: [{ model: Product, as: 'product' }],
        });
        if (!po) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }
        if (po.status !== 'APPROVED') {
            return res.status(400).json({ error: `Cannot dispatch. Current status: ${po.status}` });
        }

        // Update stock when dispatched (goods received)
        await po.product.update({
            current_stock: po.product.current_stock + po.quantity,
        });

        await po.update({ status: 'DISPATCHED' });

        res.json({
            message: 'Purchase order dispatched and stock updated',
            purchaseOrder: po,
            newStock: po.product.current_stock + po.quantity,
        });
    } catch (error) {
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
