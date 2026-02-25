const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PurchaseOrder = sequelize.define('PurchaseOrder', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    product_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id',
        },
    },
    vendor_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: { args: [1], msg: 'Quantity must be at least 1' },
        },
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'DISPATCHED'),
        allowNull: false,
        defaultValue: 'PENDING',
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'purchase_orders',
    timestamps: true,
    indexes: [
        { fields: ['product_id'] },
        { fields: ['vendor_id'] },
        { fields: ['status'] },
        { fields: ['created_at'] },
    ],
});

module.exports = PurchaseOrder;
