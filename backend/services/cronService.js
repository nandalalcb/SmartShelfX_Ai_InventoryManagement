const cron = require('node-cron');
const { evaluateAndGeneratePOs } = require('../controllers/restockController');
const { generateLowStockAlerts } = require('../controllers/alertController');

function initCronJobs() {
    // Run auto-restock check every hour
    cron.schedule('0 * * * *', async () => {
        console.log('[CRON] Running auto-restock check...');
        try {
            const results = await evaluateAndGeneratePOs();
            console.log(`[CRON] Auto-restock complete. Generated ${results.length} POs.`);
        } catch (error) {
            console.error('[CRON] Auto-restock error:', error.message);
        }
    });

    // Run low stock alert check every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        console.log('[CRON] Checking low stock levels...');
        try {
            await generateLowStockAlerts();
            console.log('[CRON] Low stock alerts generated.');
        } catch (error) {
            console.error('[CRON] Low stock alert error:', error.message);
        }
    });

    console.log('✅ Cron jobs initialized (auto-restock: hourly, low-stock alerts: every 30min)');
}

module.exports = { initCronJobs };
