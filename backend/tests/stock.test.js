/**
 * SmartShelfX – Stock Transaction API Tests
 * Tests: IN/OUT, negative stock prevention, pagination, date filters, role access
 */
const request = require('supertest');
const {
    app,
    generateAdminToken,
    generateManagerToken,
    generateVendorToken,
    randomSKU,
} = require('./setup');

let adminToken, managerToken, vendorToken, testProductId;

beforeAll(async () => {
    adminToken = generateAdminToken();
    managerToken = generateManagerToken();
    vendorToken = generateVendorToken();

    // Create a test product with known stock
    const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
            name: 'Stock Test Product',
            sku: randomSKU(),
            current_stock: 100,
            reorder_level: 20,
            category: 'Test',
        });
    testProductId = res.body.product.id;
});

describe('Stock Transaction API', () => {
    // ─── STOCK IN ───────────────────────────────────────
    describe('POST /api/stock (IN)', () => {
        it('should record stock IN and update product stock', async () => {
            const res = await request(app)
                .post('/api/stock')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ product_id: testProductId, quantity: 25, type: 'IN' });
            expect(res.status).toBe(201);
            expect(res.body.message).toMatch(/stock in recorded/i);
            expect(res.body.newStock).toBe(125); // 100 + 25
        });

        it('MANAGER should record stock IN', async () => {
            const res = await request(app)
                .post('/api/stock')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ product_id: testProductId, quantity: 5, type: 'IN' });
            expect(res.status).toBe(201);
        });

        it('VENDOR should be rejected (403)', async () => {
            const res = await request(app)
                .post('/api/stock')
                .set('Authorization', `Bearer ${vendorToken}`)
                .send({ product_id: testProductId, quantity: 5, type: 'IN' });
            expect(res.status).toBe(403);
        });
    });

    // ─── STOCK OUT ──────────────────────────────────────
    describe('POST /api/stock (OUT)', () => {
        it('should record stock OUT and reduce product stock', async () => {
            const res = await request(app)
                .post('/api/stock')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ product_id: testProductId, quantity: 10, type: 'OUT' });
            expect(res.status).toBe(201);
            expect(res.body.message).toMatch(/stock out recorded/i);
        });

        it('should prevent stock OUT exceeding available stock', async () => {
            const res = await request(app)
                .post('/api/stock')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ product_id: testProductId, quantity: 999999, type: 'OUT' });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/insufficient stock/i);
        });

        it('should reject non-existent product', async () => {
            const res = await request(app)
                .post('/api/stock')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ product_id: 999999, quantity: 1, type: 'OUT' });
            expect(res.status).toBe(404);
        });
    });

    // ─── VALIDATION ─────────────────────────────────────
    describe('Validation', () => {
        it('should reject zero quantity', async () => {
            const res = await request(app)
                .post('/api/stock')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ product_id: testProductId, quantity: 0, type: 'IN' });
            expect(res.status).toBe(400);
        });

        it('should reject negative quantity', async () => {
            const res = await request(app)
                .post('/api/stock')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ product_id: testProductId, quantity: -5, type: 'IN' });
            expect(res.status).toBe(400);
        });

        it('should reject invalid type', async () => {
            const res = await request(app)
                .post('/api/stock')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ product_id: testProductId, quantity: 5, type: 'TRANSFER' });
            expect(res.status).toBe(400);
        });

        it('should reject missing product_id', async () => {
            const res = await request(app)
                .post('/api/stock')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ quantity: 5, type: 'IN' });
            expect(res.status).toBe(400);
        });
    });

    // ─── GET TRANSACTIONS ───────────────────────────────
    describe('GET /api/stock', () => {
        it('should return paginated transactions', async () => {
            const res = await request(app)
                .get('/api/stock?page=1&limit=10')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('transactions');
            expect(res.body).toHaveProperty('total');
            expect(res.body).toHaveProperty('page', 1);
        });

        it('should filter by type', async () => {
            const res = await request(app)
                .get('/api/stock?type=IN')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            res.body.transactions.forEach(t => {
                expect(t.type).toBe('IN');
            });
        });

        it('should filter by product_id', async () => {
            const res = await request(app)
                .get(`/api/stock?product_id=${testProductId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            res.body.transactions.forEach(t => {
                expect(t.product_id).toBe(testProductId);
            });
        });

        it('should filter by date range', async () => {
            const today = new Date().toISOString().split('T')[0];
            const res = await request(app)
                .get(`/api/stock?start_date=${today}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
        });
    });

    // ─── GET BY ID ──────────────────────────────────────
    describe('GET /api/stock/:id', () => {
        it('should return 404 for non-existent transaction', async () => {
            const res = await request(app)
                .get('/api/stock/999999')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(404);
        });
    });
});
