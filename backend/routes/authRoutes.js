const router = require('express').Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               role: { type: string, enum: [ADMIN, MANAGER, VENDOR] }
 *     responses:
 *       201: { description: User registered }
 *       409: { description: Email already registered }
 */
router.post('/register', validate({
    name: { required: true, minLength: 2, maxLength: 100 },
    email: { required: true, type: 'email' },
    password: { required: true, minLength: 6 },
}), authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 */
router.post('/login', validate({
    email: { required: true, type: 'email' },
    password: { required: true },
}), authController.login);

router.post('/refresh', auth, authController.refreshToken);
router.get('/profile', auth, authController.getProfile);
router.get('/users', auth, authController.getAllUsers);

module.exports = router;
