const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StockTransaction = sequelize.define('StockTransaction', {
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
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: { args: [1], msg: 'Quantity must be at least 1' },
        },
    },
    type: {
        type: DataTypes.ENUM('IN', 'OUT'),
        allowNull: false,
        validate: {
            isIn: {
                args: [['IN', 'OUT']],
                msg: 'Type must be IN or OUT',
            },
        },
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    handled_by: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
}, {
    tableName: 'stock_transactions',
    timestamps: true,
    indexes: [
        { fields: ['product_id'] },
        { fields: ['timestamp'] },
        { fields: ['type'] },
        { fields: ['handled_by'] },
    ],
});

module.exports = StockTransaction;
