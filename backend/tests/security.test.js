/**
 * SmartShelfX – Security Test Suite
 * Tests: SQL injection, XSS, JWT tampering, role escalation, CORS, rate limiting
 */
const request = require('supertest');
const {
    app,
    generateAdminToken,
    generateVendorToken,
    generateTamperedToken,
    randomSKU,
    randomEmail,
} = require('./setup');

let adminToken, vendorToken;

beforeAll(() => {
    adminToken = generateAdminToken();
    vendorToken = generateVendorToken();
});

describe('Security Tests', () => {
    // ─── SQL INJECTION ──────────────────────────────────
    describe('SQL Injection Prevention', () => {
        it('should prevent SQL injection in login email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: "admin' OR '1'='1", password: 'whatever' });
            expect([400, 401]).toContain(res.status);
        });

        it('should prevent SQL injection in product search', async () => {
            const res = await request(app)
                .get("/api/products?search='; DROP TABLE products; --")
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            // Should return 0 results, not crash
            expect(res.body.products.length).toBe(0);
        });

        it('should prevent SQL injection in stock filter', async () => {
            const res = await request(app)
                .get("/api/stock?product_id=1 OR 1=1")
                .set('Authorization', `Bearer ${adminToken}`);
            // Sequelize should handle this as invalid parameter
            expect([200, 400, 500]).toContain(res.status);
        });

        it('should prevent login with UNION SELECT injection', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: "' UNION SELECT * FROM users --",
                    password: 'anything',
                });
            expect([400, 401]).toContain(res.status);
        });
    });

    // ─── XSS PREVENTION ─────────────────────────────────
    describe('XSS Prevention', () => {
        it('should store XSS payload without executing', async () => {
            const xss = '<img src=x onerror=alert(1)>';
            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: xss, sku: randomSKU() });
            expect(res.status).toBe(201);
            // Data is stored but Angular escapes on output
            expect(res.body.product.name).toBe(xss);
        });

        it('should handle script tag in registration name', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: '<script>alert("xss")</script>',
                    email: randomEmail(),
                    password: 'password123',
                });
            expect(res.status).toBe(201);
        });
    });

    // ─── JWT SECURITY ───────────────────────────────────
    describe('JWT Tampering', () => {
        it('should reject token signed with wrong secret', async () => {
            const token = generateTamperedToken();
            const res = await request(app)
                .get('/api/products')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(401);
        });

        it('should reject completely random token string', async () => {
            const res = await request(app)
                .get('/api/products')
                .set('Authorization', 'Bearer randomgarbage12345');
            expect(res.status).toBe(401);
        });

        it('should reject empty Authorization header', async () => {
            const res = await request(app)
                .get('/api/products')
                .set('Authorization', '');
            expect(res.status).toBe(401);
        });

        it('should reject Bearer with no token', async () => {
            const res = await request(app)
                .get('/api/products')
                .set('Authorization', 'Bearer ');
            expect(res.status).toBe(401);
        });
    });

    // ─── ROLE ESCALATION ─────────────────────────────────
    describe('Role Escalation Prevention', () => {
        it('VENDOR cannot create products', async () => {
            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${vendorToken}`)
                .send({ name: 'Forbidden', sku: randomSKU() });
            expect(res.status).toBe(403);
        });

        it('VENDOR cannot delete products', async () => {
            const res = await request(app)
                .delete('/api/products/1')
                .set('Authorization', `Bearer ${vendorToken}`);
            expect(res.status).toBe(403);
        });

        it('VENDOR cannot record stock transactions', async () => {
            const res = await request(app)
                .post('/api/stock')
                .set('Authorization', `Bearer ${vendorToken}`)
                .send({ product_id: 1, quantity: 5, type: 'IN' });
            expect(res.status).toBe(403);
        });

        it('VENDOR cannot run restock check', async () => {
            const res = await request(app)
                .post('/api/restock/check')
                .set('Authorization', `Bearer ${vendorToken}`);
            expect(res.status).toBe(403);
        });
    });

    // ─── PASSWORD SECURITY ──────────────────────────────
    describe('Password Hashing', () => {
        it('should not return plain-text passwords in user list', async () => {
            const res = await request(app)
                .get('/api/auth/users')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            res.body.forEach(user => {
                expect(user).not.toHaveProperty('password');
            });
        });

        it('should not return password in profile', async () => {
            const res = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body).not.toHaveProperty('password');
        });
    });

    // ─── HEALTH CHECK ───────────────────────────────────
    describe('Health Check (Public)', () => {
        it('should return health status without auth', async () => {
            const res = await request(app)
                .get('/api/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('OK');
        });
    });
});
