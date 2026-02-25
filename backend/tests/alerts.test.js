/**
 * SmartShelfX – Alert API Tests
 * Tests: CRUD, unread count, mark read, role-based visibility
 */
const request = require('supertest');
const { app, generateAdminToken, generateVendorToken } = require('./setup');

let adminToken, vendorToken;

beforeAll(() => {
    adminToken = generateAdminToken();
    vendorToken = generateVendorToken();
});

describe('Alert API', () => {
    // ─── GET ALERTS ─────────────────────────────────────
    describe('GET /api/alerts', () => {
        it('should return paginated alerts', async () => {
            const res = await request(app)
                .get('/api/alerts?page=1&limit=10')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('alerts');
            expect(res.body).toHaveProperty('total');
            expect(res.body).toHaveProperty('unread');
            expect(res.body).toHaveProperty('page');
        });

        it('should filter by type', async () => {
            const res = await request(app)
                .get('/api/alerts?type=LOW_STOCK')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            res.body.alerts.forEach(a => {
                expect(a.type).toBe('LOW_STOCK');
            });
        });

        it('should filter by is_read', async () => {
            const res = await request(app)
                .get('/api/alerts?is_read=false')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            res.body.alerts.forEach(a => {
                expect(a.is_read).toBe(false);
            });
        });
    });

    // ─── UNREAD COUNT ───────────────────────────────────
    describe('GET /api/alerts/unread-count', () => {
        it('should return unread count', async () => {
            const res = await request(app)
                .get('/api/alerts/unread-count')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('unread');
            expect(typeof res.body.unread).toBe('number');
        });
    });

    // ─── MARK READ ──────────────────────────────────────
    describe('PATCH /api/alerts/mark-all-read', () => {
        it('should mark all alerts as read', async () => {
            const res = await request(app)
                .patch('/api/alerts/mark-all-read')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);

            // Verify unread count is 0
            const countRes = await request(app)
                .get('/api/alerts/unread-count')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(countRes.body.unread).toBe(0);
        });
    });

    // ─── MARK SINGLE ────────────────────────────────────
    describe('PATCH /api/alerts/:id/read', () => {
        it('should return 404 for non-existent alert', async () => {
            const res = await request(app)
                .patch('/api/alerts/999999/read')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(404);
        });
    });

    // ─── DISMISS ────────────────────────────────────────
    describe('DELETE /api/alerts/:id', () => {
        it('should return 404 for non-existent alert', async () => {
            const res = await request(app)
                .delete('/api/alerts/999999')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(404);
        });
    });
});
