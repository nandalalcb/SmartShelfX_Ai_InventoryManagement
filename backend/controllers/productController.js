const { Product, User } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const upload = multer({
    dest: path.join(__dirname, '../uploads/'),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    },
});

exports.uploadMiddleware = upload.single('file');

exports.getAll = async (req, res, next) => {
    try {
        const { category, vendor_id, stock_status, search, page = 1, limit = 20 } = req.query;
        const where = {};
        const offset = (parseInt(page) - 1) * parseInt(limit);

        if (category) where.category = category;
        if (vendor_id) where.vendor_id = vendor_id;
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { sku: { [Op.like]: `%${search}%` } },
            ];
        }
        if (stock_status === 'low') {
            where.current_stock = { [Op.lte]: sequelize.col('reorder_level') };
        } else if (stock_status === 'out') {
            where.current_stock = 0;
        } else if (stock_status === 'ok') {
            where.current_stock = { [Op.gt]: sequelize.col('reorder_level') };
        }

        const { count, rows } = await Product.findAndCountAll({
            where,
            include: [{ model: User, as: 'vendor', attributes: ['id', 'name', 'email'] }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset,
        });

        res.json({
            products: rows,
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
        const product = await Product.findByPk(req.params.id, {
            include: [{ model: User, as: 'vendor', attributes: ['id', 'name', 'email'] }],
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        next(error);
    }
};

exports.create = async (req, res, next) => {
    try {
        const { name, sku, vendor_id, reorder_level, current_stock, category } = req.body;

        const existing = await Product.findOne({ where: { sku } });
        if (existing) {
            return res.status(409).json({ error: 'SKU already exists' });
        }

        const product = await Product.create({
            name, sku, vendor_id, reorder_level, current_stock, category,
        });

        res.status(201).json({ message: 'Product created successfully', product });
    } catch (error) {
        next(error);
    }
};

exports.update = async (req, res, next) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const { name, sku, vendor_id, reorder_level, current_stock, category } = req.body;

        if (sku && sku !== product.sku) {
            const existing = await Product.findOne({ where: { sku } });
            if (existing) {
                return res.status(409).json({ error: 'SKU already exists' });
            }
        }

        await product.update({ name, sku, vendor_id, reorder_level, current_stock, category });
        res.json({ message: 'Product updated successfully', product });
    } catch (error) {
        next(error);
    }
};

exports.delete = async (req, res, next) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        await product.destroy();
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        next(error);
    }
};

exports.importCSV = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'CSV file is required' });
        }

        const results = [];
        const errors = [];
        let rowNum = 0;

        const stream = fs.createReadStream(req.file.path)
            .pipe(csv());

        for await (const row of stream) {
            rowNum++;
            try {
                if (!row.name || !row.sku) {
                    errors.push({ row: rowNum, error: 'name and sku are required' });
                    continue;
                }

                const [product, created] = await Product.findOrCreate({
                    where: { sku: row.sku },
                    defaults: {
                        name: row.name,
                        sku: row.sku,
                        vendor_id: row.vendor_id || null,
                        reorder_level: parseInt(row.reorder_level) || 10,
                        current_stock: parseInt(row.current_stock) || 0,
                        category: row.category || null,
                    },
                });

                if (created) {
                    results.push({ row: rowNum, sku: row.sku, status: 'created' });
                } else {
                    results.push({ row: rowNum, sku: row.sku, status: 'skipped (SKU exists)' });
                }
            } catch (err) {
                errors.push({ row: rowNum, error: err.message });
            }
        }

        // Clean up uploaded file
        fs.unlink(req.file.path, () => { });

        res.json({
            message: `Processed ${rowNum} rows`,
            imported: results.filter((r) => r.status === 'created').length,
            skipped: results.filter((r) => r.status !== 'created').length,
            results,
            errors,
        });
    } catch (error) {
        if (req.file) fs.unlink(req.file.path, () => { });
        next(error);
    }
};

exports.getCategories = async (req, res, next) => {
    try {
        const categories = await Product.findAll({
            attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('category')), 'category']],
            where: { category: { [Op.ne]: null } },
            raw: true,
        });
        res.json(categories.map((c) => c.category));
    } catch (error) {
        next(error);
    }
};
