const { StockTransaction, Product, Forecast } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../config/db');

exports.getForecast = async (req, res, next) => {
    try {
        const { product_id } = req.params;

        const product = await Product.findByPk(product_id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Get aggregated daily OUT transactions (last 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const dailySales = await StockTransaction.findAll({
            attributes: [
                [fn('DATE', col('timestamp')), 'date'],
                [fn('SUM', col('quantity')), 'total_quantity'],
            ],
            where: {
                product_id,
                type: 'OUT',
                timestamp: { [Op.gte]: ninetyDaysAgo },
            },
            group: [fn('DATE', col('timestamp'))],
            order: [[fn('DATE', col('timestamp')), 'ASC']],
            raw: true,
        });

        // Call AI service
        const dailySalesArray = dailySales.map((d) => parseFloat(d.total_quantity));

        let prediction;
        try {
            const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
            const response = await fetch(`${aiUrl}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: parseInt(product_id),
                    daily_sales: dailySalesArray,
                    current_stock: product.current_stock,
                    reorder_level: product.reorder_level,
                }),
            });

            if (!response.ok) throw new Error('AI service returned error');
            prediction = await response.json();
        } catch (aiError) {
            // Graceful fallback: use simple moving average
            console.warn('AI service unavailable, using fallback prediction:', aiError.message);
            prediction = calculateFallbackPrediction(dailySalesArray, product.current_stock, product.reorder_level);
        }

        // Store forecast in DB
        const today = new Date().toISOString().split('T')[0];
        await Forecast.upsert({
            product_id: parseInt(product_id),
            forecast_date: today,
            predicted_demand: prediction.predicted_demand,
            risk_level: prediction.risk_level,
            suggested_reorder: prediction.suggested_reorder,
        });

        res.json({
            product: { id: product.id, name: product.name, sku: product.sku },
            current_stock: product.current_stock,
            reorder_level: product.reorder_level,
            historical_data: dailySales,
            forecast: prediction,
        });
    } catch (error) {
        next(error);
    }
};

exports.getAllForecasts = async (req, res, next) => {
    try {
        const forecasts = await Forecast.findAll({
            include: [{
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'sku', 'current_stock', 'reorder_level', 'category'],
            }],
            order: [['created_at', 'DESC']],
            limit: 100,
        });

        res.json(forecasts);
    } catch (error) {
        next(error);
    }
};

exports.batchForecast = async (req, res, next) => {
    try {
        const products = await Product.findAll();
        const results = [];

        for (const product of products) {
            try {
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

                const dailySales = await StockTransaction.findAll({
                    attributes: [
                        [fn('DATE', col('timestamp')), 'date'],
                        [fn('SUM', col('quantity')), 'total_quantity'],
                    ],
                    where: {
                        product_id: product.id,
                        type: 'OUT',
                        timestamp: { [Op.gte]: ninetyDaysAgo },
                    },
                    group: [fn('DATE', col('timestamp'))],
                    order: [[fn('DATE', col('timestamp')), 'ASC']],
                    raw: true,
                });

                const dailySalesArray = dailySales.map((d) => parseFloat(d.total_quantity));
                let prediction;

                try {
                    const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
                    const response = await fetch(`${aiUrl}/predict`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            product_id: product.id,
                            daily_sales: dailySalesArray,
                            current_stock: product.current_stock,
                            reorder_level: product.reorder_level,
                        }),
                    });
                    if (!response.ok) throw new Error('AI error');
                    prediction = await response.json();
                } catch {
                    prediction = calculateFallbackPrediction(dailySalesArray, product.current_stock, product.reorder_level);
                }

                const today = new Date().toISOString().split('T')[0];
                await Forecast.upsert({
                    product_id: product.id,
                    forecast_date: today,
                    predicted_demand: prediction.predicted_demand,
                    risk_level: prediction.risk_level,
                    suggested_reorder: prediction.suggested_reorder,
                });

                results.push({
                    product_id: product.id,
                    sku: product.sku,
                    name: product.name,
                    ...prediction,
                });
            } catch (err) {
                results.push({ product_id: product.id, error: err.message });
            }
        }

        res.json({ message: `Forecasted ${results.length} products`, results });
    } catch (error) {
        next(error);
    }
};

function calculateFallbackPrediction(dailySales, currentStock, reorderLevel) {
    if (!dailySales || dailySales.length === 0) {
        return {
            predicted_demand: 0,
            risk_level: currentStock <= reorderLevel ? 'MEDIUM' : 'LOW',
            suggested_reorder: currentStock <= reorderLevel ? reorderLevel * 2 : 0,
            weekly_forecast: [0, 0, 0, 0, 0, 0, 0],
            method: 'fallback_no_data',
        };
    }

    // 7-day moving average
    const recentSales = dailySales.slice(-7);
    const avgDailySales = recentSales.reduce((a, b) => a + b, 0) / recentSales.length;
    const predictedWeeklyDemand = Math.ceil(avgDailySales * 7);

    let riskLevel = 'LOW';
    if (currentStock <= 0) riskLevel = 'CRITICAL';
    else if (currentStock < predictedWeeklyDemand) riskLevel = 'HIGH';
    else if (currentStock < reorderLevel) riskLevel = 'MEDIUM';

    const suggestedReorder = riskLevel === 'LOW' ? 0 : Math.ceil(predictedWeeklyDemand * 1.5);

    return {
        predicted_demand: predictedWeeklyDemand,
        risk_level: riskLevel,
        suggested_reorder: suggestedReorder,
        weekly_forecast: Array(7).fill(Math.ceil(avgDailySales)),
        method: 'fallback_moving_average',
    };
}
