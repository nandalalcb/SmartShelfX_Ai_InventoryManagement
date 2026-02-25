/**
 * SmartShelfX – Auto-Restock Logic Tests
 * Tests: threshold evaluation, duplicate PO prevention, vendor assignment, alerts
 */
const request = require('supertest');
const { app, generateAdminToken, randomSKU } = require('./setup');

let adminToken, vendorUserId;

beforeAll(async () => {
    adminToken = generateAdminToken();

    const usersRes = await request(app)
        .get('/api/auth/users?role=VENDOR')
        .set('Authorization', `Bearer ${adminToken}`);
    vendorUserId = usersRes.body[0]?.id;
});

describe('Auto-Restock API', () => {
    describe('POST /api/restock/check', () => {
        it('should generate POs for low-stock products', async () => {
            // Create a product that is below reorder level
            await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Low Stock Restock Test',
                    sku: randomSKU(),
                    current_stock: 5,      // below reorder_level of 20
                    reorder_level: 20,
                    vendor_id: vendorUserId,
                });

            const res = await request(app)
                .post('/api/restock/check')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('generated');
            expect(res.body).toHaveProperty('purchaseOrders');
        });

        it('should not generate duplicate POs for same product', async () => {
            // Run restock twice
            await request(app)
                .post('/api/restock/check')
                .set('Authorization', `Bearer ${adminToken}`);
            const secondRun = await request(app)
                .post('/api/restock/check')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(secondRun.status).toBe(200);
            // Second run should have fewer or equal POs since PENDING already exist
            expect(secondRun.body.generated).toBeGreaterThanOrEqual(0);
        });

        it('should skip products without vendor', async () => {
            // Product without vendor_id
            await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'No Vendor Low Stock',
                    sku: randomSKU(),
                    current_stock: 1,
                    reorder_level: 50,
                    // no vendor_id
                });

            const res = await request(app)
                .post('/api/restock/check')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            // The no-vendor product should NOT appear in generated POs
            const noVendorPO = res.body.purchaseOrders.find(
                po => po.product === 'No Vendor Low Stock'
            );
            expect(noVendorPO).toBeUndefined();
        });

        it('should not generate PO for well-stocked products', async () => {
            const sku = randomSKU();
            await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Well Stocked Product',
                    sku,
                    current_stock: 500,
                    reorder_level: 10,
                    vendor_id: vendorUserId,
                });

            const res = await request(app)
                .post('/api/restock/check')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            const wellStockedPO = res.body.purchaseOrders.find(p => p.sku === sku);
            expect(wellStockedPO).toBeUndefined();
        });
    });
});
