/**
 * SmartShelfX – Purchase Order API Tests
 * Tests: create, approve (VENDOR), dispatch (VENDOR), receive (MANAGER),
 *        status flow, role access, stock update ONLY on RECEIVED
 */
const request = require('supertest');
const {
    app,
    generateAdminToken,
    generateManagerToken,
    generateVendorToken,
    randomSKU,
} = require('./setup');

let adminToken, managerToken, vendorToken, testProductId, vendorUserId;

beforeAll(async () => {
    adminToken = generateAdminToken();
    managerToken = generateManagerToken();
    vendorToken = generateVendorToken();

    // Get the seeded vendor user ID
    const usersRes = await request(app)
        .get('/api/auth/users?role=VENDOR')
        .set('Authorization', `Bearer ${adminToken}`);
    vendorUserId = usersRes.body[0]?.id;

    // Create a product linked to that vendor
    const prodRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
            name: 'PO Test Product',
            sku: randomSKU(),
            current_stock: 50,
            reorder_level: 20,
            vendor_id: vendorUserId,
        });
    testProductId = prodRes.body.product.id;
});

describe('Purchase Order API', () => {
    let createdPOId;

    // ─── CREATE ─────────────────────────────────────────
    describe('POST /api/purchase-orders', () => {
        it('should create a purchase order (MANAGER)', async () => {
            const res = await request(app)
                .post('/api/purchase-orders')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    product_id: testProductId,
                    vendor_id: vendorUserId,
                    quantity: 100,
                });
            expect(res.status).toBe(201);
            expect(res.body.purchaseOrder.status).toBe('PENDING');
            expect(res.body.purchaseOrder.quantity).toBe(100);
            createdPOId = res.body.purchaseOrder.id;
        });

        it('VENDOR should NOT be able to create a PO (403)', async () => {
            const res = await request(app)
                .post('/api/purchase-orders')
                .set('Authorization', `Bearer ${vendorToken}`)
                .send({
                    product_id: testProductId,
                    vendor_id: vendorUserId,
                    quantity: 10,
                });
            expect(res.status).toBe(403);
        });

        it('should reject non-existent product', async () => {
            const res = await request(app)
                .post('/api/purchase-orders')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ product_id: 999999, vendor_id: vendorUserId, quantity: 10 });
            expect(res.status).toBe(404);
            expect(res.body.error).toMatch(/product not found/i);
        });

        it('should reject non-vendor user', async () => {
            const res = await request(app)
                .post('/api/purchase-orders')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ product_id: testProductId, vendor_id: 1, quantity: 10 });
            expect(res.status).toBe(404);
            expect(res.body.error).toMatch(/vendor not found/i);
        });
    });

    // ─── GET ALL ────────────────────────────────────────
    describe('GET /api/purchase-orders', () => {
        it('should return paginated POs', async () => {
            const res = await request(app)
                .get('/api/purchase-orders?page=1&limit=10')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('purchaseOrders');
            expect(res.body).toHaveProperty('total');
        });

        it('should filter by status', async () => {
            const res = await request(app)
                .get('/api/purchase-orders?status=PENDING')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            res.body.purchaseOrders.forEach(po => {
                expect(po.status).toBe('PENDING');
            });
        });
    });

    // ─── FULL STATUS FLOW: PENDING → APPROVED → DISPATCHED → RECEIVED ───
    describe('Status Flow: PENDING → APPROVED → DISPATCHED → RECEIVED', () => {
        let flowPOId;

        beforeAll(async () => {
            const res = await request(app)
                .post('/api/purchase-orders')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ product_id: testProductId, vendor_id: vendorUserId, quantity: 30 });
            flowPOId = res.body.purchaseOrder.id;
        });

        // ── APPROVE (VENDOR only) ──
        it('MANAGER should NOT be able to approve a PO (403)', async () => {
            const res = await request(app)
                .patch(`/api/purchase-orders/${flowPOId}/approve`)
                .set('Authorization', `Bearer ${managerToken}`);
            expect(res.status).toBe(403);
        });

        it('VENDOR should approve a PENDING PO', async () => {
            const res = await request(app)
                .patch(`/api/purchase-orders/${flowPOId}/approve`)
                .set('Authorization', `Bearer ${vendorToken}`);
            expect(res.status).toBe(200);
            expect(res.body.purchaseOrder.status).toBe('APPROVED');
        });

        it('should NOT approve an already APPROVED PO', async () => {
            const res = await request(app)
                .patch(`/api/purchase-orders/${flowPOId}/approve`)
                .set('Authorization', `Bearer ${vendorToken}`);
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/cannot approve/i);
        });

        // ── DISPATCH (VENDOR only, NO stock change) ──
        it('MANAGER should NOT be able to dispatch a PO (403)', async () => {
            const res = await request(app)
                .patch(`/api/purchase-orders/${flowPOId}/dispatch`)
                .set('Authorization', `Bearer ${managerToken}`);
            expect(res.status).toBe(403);
        });

        it('VENDOR should dispatch an APPROVED PO and stock must NOT change', async () => {
            const productBefore = await request(app)
                .get(`/api/products/${testProductId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            const stockBefore = productBefore.body.current_stock;

            const res = await request(app)
                .patch(`/api/purchase-orders/${flowPOId}/dispatch`)
                .set('Authorization', `Bearer ${vendorToken}`);
            expect(res.status).toBe(200);
            expect(res.body.purchaseOrder.status).toBe('DISPATCHED');

            // Verify stock did NOT change
            const productAfter = await request(app)
                .get(`/api/products/${testProductId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(productAfter.body.current_stock).toBe(stockBefore);
        });

        it('should NOT dispatch a DISPATCHED PO', async () => {
            const res = await request(app)
                .patch(`/api/purchase-orders/${flowPOId}/dispatch`)
                .set('Authorization', `Bearer ${vendorToken}`);
            expect(res.status).toBe(400);
        });

        // ── RECEIVE (MANAGER only, stock INCREASES here) ──
        it('VENDOR should NOT be able to receive a PO (403)', async () => {
            const res = await request(app)
                .patch(`/api/purchase-orders/${flowPOId}/receive`)
                .set('Authorization', `Bearer ${vendorToken}`);
            expect(res.status).toBe(403);
        });

        it('MANAGER should receive a DISPATCHED PO and stock must increase', async () => {
            const productBefore = await request(app)
                .get(`/api/products/${testProductId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            const stockBefore = productBefore.body.current_stock;

            const res = await request(app)
                .patch(`/api/purchase-orders/${flowPOId}/receive`)
                .set('Authorization', `Bearer ${managerToken}`);
            expect(res.status).toBe(200);
            expect(res.body.purchaseOrder.status).toBe('RECEIVED');
            expect(res.body.newStock).toBe(stockBefore + 30);

            // Verify stock actually increased in DB
            const productAfter = await request(app)
                .get(`/api/products/${testProductId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(productAfter.body.current_stock).toBe(stockBefore + 30);
        });

        it('should NOT receive an already RECEIVED PO (duplicate guard)', async () => {
            const res = await request(app)
                .patch(`/api/purchase-orders/${flowPOId}/receive`)
                .set('Authorization', `Bearer ${managerToken}`);
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/already been received/i);
        });
    });

    // ─── CANNOT SKIP STATUS STEPS ───────────────────────
    describe('Cannot skip status steps', () => {
        let skipPOId;

        beforeAll(async () => {
            const res = await request(app)
                .post('/api/purchase-orders')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ product_id: testProductId, vendor_id: vendorUserId, quantity: 15 });
            skipPOId = res.body.purchaseOrder.id;
        });

        it('should NOT dispatch a PENDING PO (must be APPROVED first)', async () => {
            const res = await request(app)
                .patch(`/api/purchase-orders/${skipPOId}/dispatch`)
                .set('Authorization', `Bearer ${vendorToken}`);
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/cannot dispatch/i);
        });

        it('should NOT receive a PENDING PO (must be DISPATCHED first)', async () => {
            const res = await request(app)
                .patch(`/api/purchase-orders/${skipPOId}/receive`)
                .set('Authorization', `Bearer ${managerToken}`);
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/cannot receive/i);
        });

        it('should NOT receive an APPROVED PO (must be DISPATCHED first)', async () => {
            // First approve it
            await request(app)
                .patch(`/api/purchase-orders/${skipPOId}/approve`)
                .set('Authorization', `Bearer ${vendorToken}`);

            const res = await request(app)
                .patch(`/api/purchase-orders/${skipPOId}/receive`)
                .set('Authorization', `Bearer ${managerToken}`);
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/cannot receive/i);
        });
    });

    // ─── REJECT ─────────────────────────────────────────
    describe('Reject PO', () => {
        let rejectPOId;

        beforeAll(async () => {
            const res = await request(app)
                .post('/api/purchase-orders')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ product_id: testProductId, vendor_id: vendorUserId, quantity: 10 });
            rejectPOId = res.body.purchaseOrder.id;
        });

        it('should reject a PENDING PO', async () => {
            const res = await request(app)
                .delete(`/api/purchase-orders/${rejectPOId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body.message).toMatch(/rejected/i);
        });

        it('should return 404 for already-rejected PO', async () => {
            const res = await request(app)
                .delete(`/api/purchase-orders/${rejectPOId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(404);
        });
    });

    // ─── EDGE CASES ─────────────────────────────────────
    describe('Edge Cases', () => {
        it('should return 404 for non-existent PO approve', async () => {
            const res = await request(app)
                .patch('/api/purchase-orders/999999/approve')
                .set('Authorization', `Bearer ${vendorToken}`);
            expect(res.status).toBe(404);
        });

        it('should return 404 for non-existent PO dispatch', async () => {
            const res = await request(app)
                .patch('/api/purchase-orders/999999/dispatch')
                .set('Authorization', `Bearer ${vendorToken}`);
            expect(res.status).toBe(404);
        });

        it('should return 404 for non-existent PO receive', async () => {
            const res = await request(app)
                .patch('/api/purchase-orders/999999/receive')
                .set('Authorization', `Bearer ${managerToken}`);
            expect(res.status).toBe(404);
        });
    });
});
