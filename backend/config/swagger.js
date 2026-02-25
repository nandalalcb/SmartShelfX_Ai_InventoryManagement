const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SmartShelfX API',
            version: '1.0.0',
            description: 'AI-Powered Inventory Management System API',
            contact: { name: 'SmartShelfX Team' },
        },
        servers: [
            { url: 'http://localhost:5000', description: 'Development' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Products', description: 'Product management' },
            { name: 'Stock Transactions', description: 'Stock IN/OUT operations' },
            { name: 'Purchase Orders', description: 'PO management' },
            { name: 'AI Forecasting', description: 'Demand prediction' },
            { name: 'Alerts', description: 'Notification system' },
            { name: 'Analytics', description: 'Reports and exports' },
        ],
    },
    apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
