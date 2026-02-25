/**
 * SmartShelfX – Auth API Tests
 * Tests: register, login, JWT validation, role access, token expiry, SQL injection
 */
const request = require('supertest');
const {
    app,
    generateAdminToken,
    generateExpiredToken,
    generateTamperedToken,
    randomEmail,
} = require('./setup');

describe('Auth API', () => {
    // ─── REGISTER ───────────────────────────────────────
    describe('POST /api/auth/register', () => {
        it('should register a new user with valid data', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: randomEmail(),
                    password: 'password123',
                    role: 'VENDOR',
                });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toHaveProperty('id');
            expect(res.body.user.role).toBe('VENDOR');
            expect(res.body.user).not.toHaveProperty('password');
        });

        it('should reject duplicate email', async () => {
            const email = randomEmail();
            await request(app)
                .post('/api/auth/register')
                .send({ name: 'First', email, password: 'password123' });

            const res = await request(app)
                .post('/api/auth/register')
                .send({ name: 'Second', email, password: 'password456' });
            expect(res.status).toBe(409);
            expect(res.body.error).toMatch(/already registered/i);
        });

        it('should reject missing required fields', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ name: 'No Email' });
            expect(res.status).toBe(400);
        });

        it('should reject short password', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ name: 'Test', email: randomEmail(), password: '12' });
            expect(res.status).toBe(400);
        });

        it('should reject invalid email format', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ name: 'Test', email: 'not_an_email', password: 'password123' });
            expect(res.status).toBe(400);
        });

        it('should default role to VENDOR if not specified', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ name: 'Default Role', email: randomEmail(), password: 'password123' });
            expect(res.status).toBe(201);
            expect(res.body.user.role).toBe('VENDOR');
        });
    });

    // ─── LOGIN ──────────────────────────────────────────
    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'admin@smartshelfx.com', password: 'password123' });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user.email).toBe('admin@smartshelfx.com');
            expect(res.body.user.role).toBe('ADMIN');
        });

        it('should reject invalid password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'admin@smartshelfx.com', password: 'wrongpassword' });
            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/invalid/i);
        });

        it('should reject non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nobody@example.com', password: 'password123' });
            expect(res.status).toBe(401);
        });

        it('should reject SQL injection in email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: "' OR 1=1; --", password: 'password123' });
            expect([400, 401]).toContain(res.status);
        });

        it('should reject missing email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ password: 'password123' });
            expect(res.status).toBe(400);
        });
    });

    // ─── JWT / PROTECTED ROUTES ─────────────────────────
    describe('JWT Token Validation', () => {
        it('should reject access without token', async () => {
            const res = await request(app).get('/api/auth/profile');
            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/no token/i);
        });

        it('should reject expired token', async () => {
            const token = generateExpiredToken();
            // Small delay to ensure token is expired
            await new Promise(r => setTimeout(r, 1500));
            const res = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/expired/i);
        });

        it('should reject tampered token', async () => {
            const token = generateTamperedToken();
            const res = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/invalid/i);
        });

        it('should reject malformed Bearer header', async () => {
            const res = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', 'NotBearer sometoken');
            expect(res.status).toBe(401);
        });

        it('should access profile with valid token', async () => {
            const token = generateAdminToken();
            const res = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body).not.toHaveProperty('password');
        });
    });

    // ─── GET USERS ──────────────────────────────────────
    describe('GET /api/auth/users', () => {
        it('should list all users', async () => {
            const token = generateAdminToken();
            const res = await request(app)
                .get('/api/auth/users')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            // Should not expose passwords
            res.body.forEach(user => {
                expect(user).not.toHaveProperty('password');
            });
        });

        it('should filter users by role', async () => {
            const token = generateAdminToken();
            const res = await request(app)
                .get('/api/auth/users?role=VENDOR')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            res.body.forEach(user => {
                expect(user.role).toBe('VENDOR');
            });
        });
    });
});
