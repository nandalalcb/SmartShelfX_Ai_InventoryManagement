const router = require('express').Router();
const analyticsController = require('../controllers/analyticsController');
const auth = require('../middlewares/auth');

router.get('/dashboard', auth, analyticsController.getDashboardStats);
router.get('/inventory-trend', auth, analyticsController.getInventoryTrend);
router.get('/sales-purchases', auth, analyticsController.getSalesVsPurchases);
router.get('/top-restocked', auth, analyticsController.getTopRestockedItems);
router.get('/export/excel', auth, analyticsController.exportExcel);
router.get('/export/pdf', auth, analyticsController.exportPDF);

module.exports = router;
