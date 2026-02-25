const router = require('express').Router();
const productController = require('../controllers/productController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const validate = require('../middlewares/validate');

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Get all products with filtering and pagination
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: category, schema: { type: string } }
 *       - { in: query, name: vendor_id, schema: { type: integer } }
 *       - { in: query, name: stock_status, schema: { type: string, enum: [low, out, ok] } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *     responses:
 *       200: { description: List of products }
 */
router.get('/', auth, productController.getAll);
router.get('/categories', auth, productController.getCategories);
router.get('/:id', auth, productController.getById);

router.post('/', auth, role('ADMIN', 'MANAGER'), validate({
    name: { required: true, minLength: 2 },
    sku: { required: true },
}), productController.create);

router.put('/:id', auth, role('ADMIN', 'MANAGER'), productController.update);
router.delete('/:id', auth, role('ADMIN'), productController.delete);

router.post('/import-csv', auth, role('ADMIN', 'MANAGER'),
    productController.uploadMiddleware, productController.importCSV);

module.exports = router;
