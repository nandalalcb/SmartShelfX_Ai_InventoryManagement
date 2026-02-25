const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Product name is required' },
            len: { args: [2, 100], msg: 'Name must be between 2 and 100 characters' },
        },
    },
    sku: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: { msg: 'SKU must be unique' },
        validate: {
            notEmpty: { msg: 'SKU is required' },
        },
    },
    vendor_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    reorder_level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
        validate: {
            min: { args: [0], msg: 'Reorder level cannot be negative' },
        },
    },
    current_stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: { args: [0], msg: 'Stock cannot be negative' },
        },
    },
    category: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
}, {
    tableName: 'products',
    timestamps: true,
    indexes: [
        { fields: ['sku'], unique: true },
        { fields: ['vendor_id'] },
        { fields: ['category'] },
        { fields: ['current_stock'] },
    ],
});

module.exports = Product;
