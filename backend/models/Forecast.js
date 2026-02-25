const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Forecast = sequelize.define('Forecast', {
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
    forecast_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    predicted_demand: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
    },
    risk_level: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
        allowNull: false,
        defaultValue: 'LOW',
    },
    suggested_reorder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'forecasts',
    timestamps: true,
    indexes: [
        { fields: ['product_id'] },
        { fields: ['forecast_date'] },
        { fields: ['risk_level'] },
    ],
});

module.exports = Forecast;
