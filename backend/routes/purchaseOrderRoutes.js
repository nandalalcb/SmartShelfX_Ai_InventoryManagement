const router = require('express').Router();
const poController = require('../controllers/purchaseOrderController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const validate = require('../middlewares/validate');

// Manager/Admin creates a PO
router.post('/', auth, role('ADMIN', 'MANAGER'), validate({
    product_id: { required: true, type: 'number' },
    vendor_id: { required: true, type: 'number' },
    quantity: { required: true, type: 'number', min: 1 },
}), poController.create);

// Anyone authenticated can list/view POs
router.get('/', auth, poController.getAll);
router.get('/:id', auth, poController.getById);

// Vendor approves (PENDING → APPROVED)
router.patch('/:id/approve', auth, role('VENDOR'), poController.approve);

// Vendor dispatches (APPROVED → DISPATCHED)
router.patch('/:id/dispatch', auth, role('VENDOR'), poController.dispatch);

// Manager/Admin receives (DISPATCHED → RECEIVED, stock updated here)
router.patch('/:id/receive', auth, role('ADMIN', 'MANAGER'), poController.receive);

// Manager/Admin rejects a PENDING PO
router.delete('/:id', auth, role('ADMIN', 'MANAGER'), poController.reject);

module.exports = router;
