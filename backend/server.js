require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const sequelize = require('./config/db');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middlewares/errorHandler');
const { initCronJobs } = require('./services/cronService');

// Import models to register associations
require('./models');

const app = express();

// ─── MIDDLEWARE ──────────────────────────────────────────
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many login attempts, please try again later.' },
});
app.use('/api/auth/login', authLimiter);

// ─── API DOCS ───────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SmartShelfX API Docs',
}));

// ─── ROUTES ─────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/stock', require('./routes/stockRoutes'));
app.use('/api/purchase-orders', require('./routes/purchaseOrderRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/restock', require('./routes/restockRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'SmartShelfX Backend' });
});

// ─── ERROR HANDLER ──────────────────────────────────────
app.use(errorHandler);

// ─── DATABASE & SERVER START ────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established.');

        await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
        console.log('✅ Database synced.');

        initCronJobs();

        app.listen(PORT, () => {
            console.log(`\n🚀 SmartShelfX Backend running on port ${PORT}`);
            console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
            console.log(`🏥 Health: http://localhost:${PORT}/api/health\n`);
        });
    } catch (error) {
        console.error('❌ Unable to start server:', error.message);
        process.exit(1);
    }
};

startServer();

module.exports = app;
