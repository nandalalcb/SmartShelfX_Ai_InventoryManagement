const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Alert = sequelize.define('Alert', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    type: {
        type: DataTypes.ENUM('LOW_STOCK', 'EXPIRY', 'VENDOR_PENDING', 'RESTOCK', 'SYSTEM'),
        allowNull: false,
    },
    message: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    product_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'products',
            key: 'id',
        },
    },
}, {
    tableName: 'alerts',
    timestamps: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['is_read'] },
        { fields: ['type'] },
        { fields: ['product_id'] },
    ],
});

module.exports = Alert;
