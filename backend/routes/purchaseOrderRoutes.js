const router = require('express').Router();
const poController = require('../controllers/purchaseOrderController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const validate = require('../middlewares/validate');

router.post('/', auth, role('ADMIN', 'MANAGER'), validate({
    product_id: { required: true, type: 'number' },
    vendor_id: { required: true, type: 'number' },
    quantity: { required: true, type: 'number', min: 1 },
}), poController.create);

router.get('/', auth, poController.getAll);
router.get('/:id', auth, poController.getById);
router.patch('/:id/approve', auth, role('ADMIN', 'MANAGER'), poController.approve);
router.patch('/:id/dispatch', auth, role('ADMIN', 'MANAGER'), poController.dispatch);
router.delete('/:id', auth, role('ADMIN', 'MANAGER'), poController.reject);

module.exports = router;
