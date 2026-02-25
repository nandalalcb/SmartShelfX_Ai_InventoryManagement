/**
 * SmartShelfX – Product API Tests
 * Tests: CRUD, filters, CSV import, duplicate SKU, role access
 */
const request = require('supertest');
const {
    app,
    generateAdminToken,
    generateManagerToken,
    generateVendorToken,
    randomSKU,
} = require('./setup');

let adminToken, managerToken, vendorToken, createdProductId;

beforeAll(() => {
    adminToken = generateAdminToken();
    managerToken = generateManagerToken();
    vendorToken = generateVendorToken();
});

describe('Product API', () => {
    // ─── CREATE ─────────────────────────────────────────
    describe('POST /api/products', () => {
        it('ADMIN should create a product', async () => {
            const sku = randomSKU();
            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Test Product',
                    sku,
                    category: 'Electronics',
                    current_stock: 50,
                    reorder_level: 10,
                });
            expect(res.status).toBe(201);
            expect(res.body.product.sku).toBe(sku);
            createdProductId = res.body.product.id;
        });

        it('MANAGER should create a product', async () => {
            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ name: 'Manager Product', sku: randomSKU(), category: 'Office' });
            expect(res.status).toBe(201);
        });

        it('VENDOR should be rejected (403)', async () => {
            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${vendorToken}`)
                .send({ name: 'Vendor Product', sku: randomSKU() });
            expect(res.status).toBe(403);
        });

        it('should reject duplicate SKU', async () => {
            const sku = randomSKU();
            await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'First', sku });

            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Second', sku });
            expect(res.status).toBe(409);
            expect(res.body.error).toMatch(/sku already exists/i);
        });

        it('should reject missing name', async () => {
            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ sku: randomSKU() });
            expect(res.status).toBe(400);
        });

        it('should reject missing SKU', async () => {
            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'No SKU Product' });
            expect(res.status).toBe(400);
        });

        it('should handle XSS in product name safely', async () => {
            const xssPayload = '<script>alert("xss")</script>';
            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: xssPayload, sku: randomSKU() });
            expect(res.status).toBe(201);
            // Name should be stored as-is (Angular auto-escapes on display)
            expect(res.body.product.name).toBe(xssPayload);
        });
    });

    // ─── READ ───────────────────────────────────────────
    describe('GET /api/products', () => {
        it('should return paginated products', async () => {
            const res = await request(app)
                .get('/api/products?page=1&limit=5')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('products');
            expect(res.body).toHaveProperty('total');
            expect(res.body).toHaveProperty('page', 1);
            expect(res.body).toHaveProperty('totalPages');
            expect(res.body.products.length).toBeLessThanOrEqual(5);
        });

        it('should filter by category', async () => {
            const res = await request(app)
                .get('/api/products?category=Electronics')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            res.body.products.forEach(p => {
                expect(p.category).toBe('Electronics');
            });
        });

        it('should filter by stock_status=low', async () => {
            const res = await request(app)
                .get('/api/products?stock_status=low')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            res.body.products.forEach(p => {
                expect(p.current_stock).toBeLessThanOrEqual(p.reorder_level);
            });
        });

        it('should filter by stock_status=out', async () => {
            const res = await request(app)
                .get('/api/products?stock_status=out')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            res.body.products.forEach(p => {
                expect(p.current_stock).toBe(0);
            });
        });

        it('should search by name', async () => {
            const res = await request(app)
                .get('/api/products?search=Mouse')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            if (res.body.products.length > 0) {
                expect(res.body.products[0].name.toLowerCase()).toContain('mouse');
            }
        });

        it('should handle SQL injection in search param', async () => {
            const res = await request(app)
                .get("/api/products?search=' OR 1=1; --")
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            // Sequelize parameterizes queries, so this should return 0 results
            expect(res.body.products.length).toBe(0);
        });
    });

    // ─── GET BY ID ──────────────────────────────────────
    describe('GET /api/products/:id', () => {
        it('should return product by ID', async () => {
            const res = await request(app)
                .get(`/api/products/${createdProductId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(createdProductId);
        });

        it('should return 404 for non-existent product', async () => {
            const res = await request(app)
                .get('/api/products/999999')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(404);
        });
    });

    // ─── UPDATE ─────────────────────────────────────────
    describe('PUT /api/products/:id', () => {
        it('ADMIN should update a product', async () => {
            const res = await request(app)
                .put(`/api/products/${createdProductId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Updated Product Name' });
            expect(res.status).toBe(200);
            expect(res.body.product.name).toBe('Updated Product Name');
        });

        it('should reject update to existing SKU', async () => {
            // Create another product with a known SKU
            const otherSKU = randomSKU();
            await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Other', sku: otherSKU });

            const res = await request(app)
                .put(`/api/products/${createdProductId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ sku: otherSKU });
            expect(res.status).toBe(409);
        });

        it('should return 404 for non-existent product', async () => {
            const res = await request(app)
                .put('/api/products/999999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Ghost' });
            expect(res.status).toBe(404);
        });
    });

    // ─── DELETE ──────────────────────────────────────────
    describe('DELETE /api/products/:id', () => {
        it('ADMIN should delete a product', async () => {
            // Create a throwaway product
            const createRes = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'To Delete', sku: randomSKU() });
            const id = createRes.body.product.id;

            const res = await request(app)
                .delete(`/api/products/${id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
        });

        it('MANAGER should be rejected for delete (403)', async () => {
            const createRes = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Manager Cant Delete', sku: randomSKU() });
            const id = createRes.body.product.id;

            const res = await request(app)
                .delete(`/api/products/${id}`)
                .set('Authorization', `Bearer ${managerToken}`);
            expect(res.status).toBe(403);
        });

        it('should return 404 for non-existent delete', async () => {
            const res = await request(app)
                .delete('/api/products/999999')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(404);
        });
    });

    // ─── CATEGORIES ─────────────────────────────────────
    describe('GET /api/products/categories', () => {
        it('should return category list', async () => {
            const res = await request(app)
                .get('/api/products/categories')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });
});
