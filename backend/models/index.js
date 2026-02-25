const User = require('./User');
const Product = require('./Product');
const StockTransaction = require('./StockTransaction');
const PurchaseOrder = require('./PurchaseOrder');
const Forecast = require('./Forecast');
const Alert = require('./Alert');

// User <-> Product (Vendor)
User.hasMany(Product, { foreignKey: 'vendor_id', as: 'products' });
Product.belongsTo(User, { foreignKey: 'vendor_id', as: 'vendor' });

// Product <-> StockTransaction
Product.hasMany(StockTransaction, { foreignKey: 'product_id', as: 'transactions' });
StockTransaction.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User <-> StockTransaction (handled_by)
User.hasMany(StockTransaction, { foreignKey: 'handled_by', as: 'handledTransactions' });
StockTransaction.belongsTo(User, { foreignKey: 'handled_by', as: 'handler' });

// Product <-> PurchaseOrder
Product.hasMany(PurchaseOrder, { foreignKey: 'product_id', as: 'purchaseOrders' });
PurchaseOrder.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User <-> PurchaseOrder (Vendor)
User.hasMany(PurchaseOrder, { foreignKey: 'vendor_id', as: 'vendorOrders' });
PurchaseOrder.belongsTo(User, { foreignKey: 'vendor_id', as: 'vendor' });

// Product <-> Forecast
Product.hasMany(Forecast, { foreignKey: 'product_id', as: 'forecasts' });
Forecast.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User <-> Alert
User.hasMany(Alert, { foreignKey: 'user_id', as: 'alerts' });
Alert.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Product <-> Alert
Product.hasMany(Alert, { foreignKey: 'product_id', as: 'alerts' });
Alert.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

module.exports = {
    User,
    Product,
    StockTransaction,
    PurchaseOrder,
    Forecast,
    Alert,
};
