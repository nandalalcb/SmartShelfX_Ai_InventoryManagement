const router = require('express').Router();
const aiController = require('../controllers/aiController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');

router.get('/forecast/:product_id', auth, aiController.getForecast);
router.get('/forecasts', auth, aiController.getAllForecasts);
router.post('/forecast/batch', auth, role('ADMIN', 'MANAGER'), aiController.batchForecast);

module.exports = router;
