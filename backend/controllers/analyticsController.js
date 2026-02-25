const { StockTransaction, Product, PurchaseOrder } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../config/db');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

exports.getDashboardStats = async (req, res, next) => {
    try {
        const totalProducts = await Product.count();
        const totalStock = await Product.sum('current_stock') || 0;
        const lowStockCount = await Product.count({
            where: { current_stock: { [Op.lte]: col('reorder_level') } },
        });
        const outOfStockCount = await Product.count({
            where: { current_stock: 0 },
        });
        const pendingPOs = await PurchaseOrder.count({
            where: { status: 'PENDING' },
        });
        const approvedPOs = await PurchaseOrder.count({
            where: { status: 'APPROVED' },
        });

        // Today's transactions
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIn = await StockTransaction.sum('quantity', {
            where: { type: 'IN', timestamp: { [Op.gte]: today } },
        }) || 0;
        const todayOut = await StockTransaction.sum('quantity', {
            where: { type: 'OUT', timestamp: { [Op.gte]: today } },
        }) || 0;

        res.json({
            totalProducts,
            totalStock,
            lowStockCount,
            outOfStockCount,
            pendingPOs,
            approvedPOs,
            todayStockIn: todayIn,
            todayStockOut: todayOut,
        });
    } catch (error) {
        next(error);
    }
};

exports.getInventoryTrend = async (req, res, next) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const trend = await StockTransaction.findAll({
            attributes: [
                [fn('DATE', col('timestamp')), 'date'],
                [fn('SUM', literal("CASE WHEN type = 'IN' THEN quantity ELSE 0 END")), 'stock_in'],
                [fn('SUM', literal("CASE WHEN type = 'OUT' THEN quantity ELSE 0 END")), 'stock_out'],
            ],
            where: { timestamp: { [Op.gte]: startDate } },
            group: [fn('DATE', col('timestamp'))],
            order: [[fn('DATE', col('timestamp')), 'ASC']],
            raw: true,
        });

        res.json(trend);
    } catch (error) {
        next(error);
    }
};

exports.getSalesVsPurchases = async (req, res, next) => {
    try {
        const { months = 6 } = req.query;
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - parseInt(months));

        const data = await StockTransaction.findAll({
            attributes: [
                [fn('DATE_FORMAT', col('timestamp'), '%Y-%m'), 'month'],
                [fn('SUM', literal("CASE WHEN type = 'IN' THEN quantity ELSE 0 END")), 'purchases'],
                [fn('SUM', literal("CASE WHEN type = 'OUT' THEN quantity ELSE 0 END")), 'sales'],
            ],
            where: { timestamp: { [Op.gte]: startDate } },
            group: [fn('DATE_FORMAT', col('timestamp'), '%Y-%m')],
            order: [[fn('DATE_FORMAT', col('timestamp'), '%Y-%m'), 'ASC']],
            raw: true,
        });

        res.json(data);
    } catch (error) {
        next(error);
    }
};

exports.getTopRestockedItems = async (req, res, next) => {
    try {
        const { limit = 10 } = req.query;

        const items = await PurchaseOrder.findAll({
            attributes: [
                'product_id',
                [fn('SUM', col('quantity')), 'total_ordered'],
                [fn('COUNT', col('PurchaseOrder.id')), 'order_count'],
            ],
            include: [
                { model: Product, as: 'product', attributes: ['name', 'sku'] },
            ],
            group: ['product_id', 'product.id', 'product.name', 'product.sku'],
            order: [[fn('SUM', col('quantity')), 'DESC']],
            limit: parseInt(limit),
        });

        res.json(items);
    } catch (error) {
        next(error);
    }
};

exports.exportExcel = async (req, res, next) => {
    try {
        const products = await Product.findAll({
            include: [{ model: require('../models').User, as: 'vendor', attributes: ['name'] }],
            order: [['name', 'ASC']],
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Inventory Report');

        sheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'SKU', key: 'sku', width: 15 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Vendor', key: 'vendor', width: 25 },
            { header: 'Current Stock', key: 'current_stock', width: 15 },
            { header: 'Reorder Level', key: 'reorder_level', width: 15 },
            { header: 'Status', key: 'status', width: 12 },
        ];

        // Style header row
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4A90D9' },
        };
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        products.forEach((p) => {
            sheet.addRow({
                id: p.id,
                name: p.name,
                sku: p.sku,
                category: p.category || 'N/A',
                vendor: p.vendor?.name || 'N/A',
                current_stock: p.current_stock,
                reorder_level: p.reorder_level,
                status: p.current_stock <= 0 ? 'OUT OF STOCK' :
                    p.current_stock <= p.reorder_level ? 'LOW STOCK' : 'OK',
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
};

exports.exportPDF = async (req, res, next) => {
    try {
        const products = await Product.findAll({
            include: [{ model: require('../models').User, as: 'vendor', attributes: ['name'] }],
            order: [['name', 'ASC']],
        });

        const doc = new PDFDocument({ margin: 40, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.pdf');
        doc.pipe(res);

        // Title
        doc.fontSize(20).font('Helvetica-Bold').text('SmartShelfX Inventory Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(1);

        // Table headers
        const headers = ['Name', 'SKU', 'Category', 'Stock', 'Reorder', 'Status'];
        const colWidths = [140, 80, 80, 60, 60, 80];
        let x = 40;
        const y = doc.y;

        doc.fontSize(9).font('Helvetica-Bold');
        headers.forEach((header, i) => {
            doc.text(header, x, y, { width: colWidths[i] });
            x += colWidths[i];
        });

        doc.moveDown(0.5);
        doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(0.3);

        // Table rows
        doc.font('Helvetica').fontSize(8);
        products.forEach((p) => {
            if (doc.y > 750) {
                doc.addPage();
                doc.y = 40;
            }

            x = 40;
            const rowY = doc.y;
            const status = p.current_stock <= 0 ? 'OUT OF STOCK' :
                p.current_stock <= p.reorder_level ? 'LOW STOCK' : 'OK';

            const rowData = [p.name, p.sku, p.category || 'N/A', String(p.current_stock), String(p.reorder_level), status];
            rowData.forEach((cell, i) => {
                doc.text(cell, x, rowY, { width: colWidths[i] });
                x += colWidths[i];
            });
            doc.moveDown(0.6);
        });

        doc.end();
    } catch (error) {
        next(error);
    }
};
