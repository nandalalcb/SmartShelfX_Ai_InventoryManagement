const { Product, PurchaseOrder, Forecast, Alert, User } = require('../models');
const { Op } = require('sequelize');

exports.checkAndRestock = async (req, res, next) => {
    try {
        const results = await evaluateAndGeneratePOs();
        res.json({
            message: `Auto-restock check complete`,
            generated: results.length,
            purchaseOrders: results,
        });
    } catch (error) {
        next(error);
    }
};

async function evaluateAndGeneratePOs() {
    const products = await Product.findAll({
        include: [
            { model: User, as: 'vendor', attributes: ['id', 'name', 'email'] },
            {
                model: Forecast,
                as: 'forecasts',
                limit: 1,
                order: [['created_at', 'DESC']],
            },
        ],
    });

    const results = [];

    for (const product of products) {
        if (!product.vendor_id) continue;

        const latestForecast = product.forecasts?.[0];
        const predictedDemand = latestForecast?.predicted_demand || 0;

        const needsRestock =
            product.current_stock < product.reorder_level ||
            product.current_stock < predictedDemand;

        if (!needsRestock) continue;

        // Check if there's already a PENDING PO for this product
        const existingPO = await PurchaseOrder.findOne({
            where: {
                product_id: product.id,
                status: 'PENDING',
            },
        });

        if (existingPO) continue;

        // Calculate reorder quantity
        const targetStock = Math.max(product.reorder_level * 2, Math.ceil(predictedDemand * 1.5));
        const orderQuantity = Math.max(targetStock - product.current_stock, product.reorder_level);

        const po = await PurchaseOrder.create({
            product_id: product.id,
            vendor_id: product.vendor_id,
            quantity: orderQuantity,
            status: 'PENDING',
            created_at: new Date(),
        });

        // Create alert
        await Alert.create({
            type: 'RESTOCK',
            message: `Auto-restock PO #${po.id} generated for ${product.name} (SKU: ${product.sku}). Order qty: ${orderQuantity}`,
            is_read: false,
            product_id: product.id,
        });

        results.push({
            po_id: po.id,
            product: product.name,
            sku: product.sku,
            vendor: product.vendor?.name,
            quantity: orderQuantity,
            reason: product.current_stock < product.reorder_level
                ? 'Below reorder level'
                : 'Below forecasted demand',
        });
    }

    return results;
}

module.exports.evaluateAndGeneratePOs = evaluateAndGeneratePOs;
module.exports.checkAndRestock = exports.checkAndRestock;
