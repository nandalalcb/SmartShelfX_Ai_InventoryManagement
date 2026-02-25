require('dotenv').config();
const sequelize = require('../config/db');
const { User, Product, StockTransaction, PurchaseOrder, Forecast, Alert } = require('../models');
const bcrypt = require('bcryptjs');

const seed = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        // Force sync (drops tables)
        await sequelize.sync({ force: true });
        console.log('Tables recreated.');

        // ─── USERS ──────────────────────────────────
        const hashedPassword = await bcrypt.hash('password123', 12);
        const adminPassword = await bcrypt.hash('admin123', 12);

        const admin = await User.create({ name: 'Admin User', email: 'admin@smartshelfx.com', password: adminPassword, role: 'ADMIN' });
        const manager = await User.create({ name: 'Manager User', email: 'manager@smartshelfx.com', password: hashedPassword, role: 'MANAGER' });
        const vendor1 = await User.create({ name: 'Acme Supplies', email: 'vendor1@smartshelfx.com', password: hashedPassword, role: 'VENDOR' });
        const vendor2 = await User.create({ name: 'Global Parts Inc', email: 'vendor2@smartshelfx.com', password: hashedPassword, role: 'VENDOR' });
        const vendor3 = await User.create({ name: 'Quick Electronics', email: 'vendor3@smartshelfx.com', password: hashedPassword, role: 'VENDOR' });

        console.log('✅ Users seeded.');

        // ─── PRODUCTS ───────────────────────────────
        const products = await Product.bulkCreate([
            { name: 'Wireless Mouse', sku: 'WM-001', vendor_id: vendor1.id, reorder_level: 20, current_stock: 45, category: 'Electronics' },
            { name: 'USB-C Cable', sku: 'USB-002', vendor_id: vendor1.id, reorder_level: 50, current_stock: 12, category: 'Electronics' },
            { name: 'Mechanical Keyboard', sku: 'KB-003', vendor_id: vendor2.id, reorder_level: 15, current_stock: 8, category: 'Electronics' },
            { name: 'Monitor Stand', sku: 'MS-004', vendor_id: vendor2.id, reorder_level: 10, current_stock: 25, category: 'Accessories' },
            { name: 'Webcam HD', sku: 'WC-005', vendor_id: vendor3.id, reorder_level: 12, current_stock: 3, category: 'Electronics' },
            { name: 'Desk Lamp LED', sku: 'DL-006', vendor_id: vendor1.id, reorder_level: 15, current_stock: 35, category: 'Lighting' },
            { name: 'Ergonomic Chair', sku: 'EC-007', vendor_id: vendor2.id, reorder_level: 5, current_stock: 0, category: 'Furniture' },
            { name: 'Noise Cancelling Headphones', sku: 'NC-008', vendor_id: vendor3.id, reorder_level: 10, current_stock: 22, category: 'Electronics' },
            { name: 'Laptop Stand', sku: 'LS-009', vendor_id: vendor1.id, reorder_level: 8, current_stock: 15, category: 'Accessories' },
            { name: 'Power Strip 6-Outlet', sku: 'PS-010', vendor_id: vendor2.id, reorder_level: 25, current_stock: 60, category: 'Electronics' },
            { name: 'Whiteboard Markers (Pack)', sku: 'WB-011', vendor_id: vendor3.id, reorder_level: 30, current_stock: 18, category: 'Office Supplies' },
            { name: 'A4 Paper Ream', sku: 'AP-012', vendor_id: vendor1.id, reorder_level: 40, current_stock: 100, category: 'Office Supplies' },
            { name: 'HDMI Cable 2m', sku: 'HD-013', vendor_id: vendor2.id, reorder_level: 20, current_stock: 30, category: 'Electronics' },
            { name: 'USB Flash Drive 64GB', sku: 'UF-014', vendor_id: vendor3.id, reorder_level: 15, current_stock: 5, category: 'Electronics' },
            { name: 'Wireless Charger', sku: 'WC-015', vendor_id: vendor1.id, reorder_level: 10, current_stock: 28, category: 'Electronics' },
            { name: 'Cable Management Kit', sku: 'CM-016', vendor_id: vendor2.id, reorder_level: 12, current_stock: 42, category: 'Accessories' },
            { name: 'Desk Organizer', sku: 'DO-017', vendor_id: vendor3.id, reorder_level: 8, current_stock: 14, category: 'Office Supplies' },
            { name: 'Bluetooth Speaker', sku: 'BS-018', vendor_id: vendor1.id, reorder_level: 6, current_stock: 9, category: 'Electronics' },
            { name: 'Screen Protector', sku: 'SP-019', vendor_id: vendor2.id, reorder_level: 20, current_stock: 55, category: 'Accessories' },
            { name: 'External SSD 1TB', sku: 'ES-020', vendor_id: vendor3.id, reorder_level: 5, current_stock: 7, category: 'Electronics' },
        ]);

        console.log('✅ Products seeded (20 items).');

        // ─── STOCK TRANSACTIONS ────────────────────
        const transactions = [];
        const now = new Date();

        for (let i = 0; i < products.length; i++) {
            // Generate 10 transactions per product over the last 60 days
            for (let j = 0; j < 10; j++) {
                const daysAgo = Math.floor(Math.random() * 60);
                const date = new Date(now);
                date.setDate(date.getDate() - daysAgo);

                const type = Math.random() > 0.4 ? 'OUT' : 'IN';
                const quantity = type === 'IN'
                    ? Math.floor(Math.random() * 30) + 10
                    : Math.floor(Math.random() * 15) + 1;

                transactions.push({
                    product_id: products[i].id,
                    quantity,
                    type,
                    timestamp: date,
                    handled_by: [admin.id, manager.id][Math.floor(Math.random() * 2)],
                });
            }
        }

        await StockTransaction.bulkCreate(transactions);
        console.log(`✅ Stock transactions seeded (${transactions.length} records).`);

        // ─── PURCHASE ORDERS ────────────────────────
        const poData = [
            { product_id: products[1].id, vendor_id: vendor1.id, quantity: 100, status: 'PENDING' },
            { product_id: products[2].id, vendor_id: vendor2.id, quantity: 30, status: 'APPROVED' },
            { product_id: products[4].id, vendor_id: vendor3.id, quantity: 25, status: 'PENDING' },
            { product_id: products[6].id, vendor_id: vendor2.id, quantity: 10, status: 'DISPATCHED' },
            { product_id: products[13].id, vendor_id: vendor3.id, quantity: 20, status: 'PENDING' },
        ];

        for (const po of poData) {
            await PurchaseOrder.create({ ...po, created_at: new Date() });
        }
        console.log('✅ Purchase orders seeded (5 records).');

        // ─── FORECASTS ──────────────────────────────
        const today = new Date().toISOString().split('T')[0];
        const forecastData = products.slice(0, 10).map((p, i) => ({
            product_id: p.id,
            forecast_date: today,
            predicted_demand: Math.floor(Math.random() * 50) + 10,
            risk_level: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.min(i % 4, 3)],
            suggested_reorder: Math.floor(Math.random() * 40) + 5,
        }));

        await Forecast.bulkCreate(forecastData);
        console.log('✅ Forecasts seeded (10 records).');

        // ─── ALERTS ─────────────────────────────────
        const alertData = [
            { type: 'LOW_STOCK', message: 'Low stock: USB-C Cable (SKU: USB-002) has 12 units, below reorder level of 50', product_id: products[1].id },
            { type: 'LOW_STOCK', message: 'Low stock: Webcam HD (SKU: WC-005) has 3 units, below reorder level of 12', product_id: products[4].id },
            { type: 'LOW_STOCK', message: 'Out of stock: Ergonomic Chair (SKU: EC-007)', product_id: products[6].id },
            { type: 'RESTOCK', message: 'Auto-restock PO generated for Mechanical Keyboard (SKU: KB-003)', product_id: products[2].id },
            { type: 'VENDOR_PENDING', message: 'Vendor Acme Supplies has not responded to PO #1 for 3 days' },
            { type: 'SYSTEM', message: 'Welcome to SmartShelfX! Your inventory management system is ready.' },
        ];

        await Alert.bulkCreate(alertData);
        console.log('✅ Alerts seeded (6 records).');

        console.log('\n🎉 Database seeded successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('   Admin:   admin@smartshelfx.com / admin123');
        console.log('   Manager: manager@smartshelfx.com / password123');
        console.log('   Vendor:  vendor1@smartshelfx.com / password123\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
};

seed();
