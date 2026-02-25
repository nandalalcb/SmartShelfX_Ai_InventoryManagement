const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Name is required' },
            len: { args: [2, 100], msg: 'Name must be between 2 and 100 characters' },
        },
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: { msg: 'Email already registered' },
        validate: {
            isEmail: { msg: 'Must be a valid email address' },
            notEmpty: { msg: 'Email is required' },
        },
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Password is required' },
            len: { args: [6, 255], msg: 'Password must be at least 6 characters' },
        },
    },
    role: {
        type: DataTypes.ENUM('ADMIN', 'MANAGER', 'VENDOR'),
        allowNull: false,
        defaultValue: 'VENDOR',
        validate: {
            isIn: {
                args: [['ADMIN', 'MANAGER', 'VENDOR']],
                msg: 'Role must be ADMIN, MANAGER, or VENDOR',
            },
        },
    },
}, {
    tableName: 'users',
    timestamps: true,
});

module.exports = User;
