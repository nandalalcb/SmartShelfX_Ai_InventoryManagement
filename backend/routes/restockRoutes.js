const router = require('express').Router();
const restockController = require('../controllers/restockController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');

router.post('/check', auth, role('ADMIN', 'MANAGER'), restockController.checkAndRestock);

module.exports = router;
