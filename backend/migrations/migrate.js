require('dotenv').config();
const sequelize = require('../config/db');
require('../models');

const migrate = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        // Sync all models (create tables if they don't exist)
        await sequelize.sync({ alter: true });
        console.log('✅ Database migration complete. All tables synced.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
};

migrate();
