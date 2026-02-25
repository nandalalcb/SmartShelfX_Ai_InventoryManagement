const router = require('express').Router();
const stockController = require('../controllers/stockController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const validate = require('../middlewares/validate');

/**
 * @swagger
 * /api/stock:
 *   post:
 *     tags: [Stock Transactions]
 *     summary: Record a stock transaction (IN/OUT)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [product_id, quantity, type]
 *             properties:
 *               product_id: { type: integer }
 *               quantity: { type: integer, minimum: 1 }
 *               type: { type: string, enum: [IN, OUT] }
 *     responses:
 *       201: { description: Transaction recorded }
 */
router.post('/', auth, role('ADMIN', 'MANAGER'), validate({
    product_id: { required: true, type: 'number' },
    quantity: { required: true, type: 'number', min: 1 },
    type: { required: true, isIn: ['IN', 'OUT'] },
}), stockController.create);

router.get('/', auth, stockController.getAll);
router.get('/:id', auth, stockController.getById);

module.exports = router;
