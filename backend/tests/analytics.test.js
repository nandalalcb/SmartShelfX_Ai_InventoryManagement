/**
 * SmartShelfX – Analytics API Tests
 * Tests: dashboard stats, trends, sales/purchases, exports
 */
const request = require('supertest');
const { app, generateAdminToken } = require('./setup');

let adminToken;

beforeAll(() => {
    adminToken = generateAdminToken();
});

describe('Analytics API', () => {
    // ─── DASHBOARD ──────────────────────────────────────
    describe('GET /api/analytics/dashboard', () => {
        it('should return dashboard statistics', async () => {
            const res = await request(app)
                .get('/api/analytics/dashboard')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('totalProducts');
            expect(res.body).toHaveProperty('totalStock');
            expect(res.body).toHaveProperty('lowStockCount');
            expect(res.body).toHaveProperty('outOfStockCount');
            expect(res.body).toHaveProperty('pendingPOs');
            expect(res.body).toHaveProperty('approvedPOs');
            expect(res.body).toHaveProperty('todayStockIn');
            expect(res.body).toHaveProperty('todayStockOut');
            expect(typeof res.body.totalProducts).toBe('number');
        });
    });

    // ─── INVENTORY TREND ────────────────────────────────
    describe('GET /api/analytics/trend', () => {
        it('should return inventory trend data', async () => {
            const res = await request(app)
                .get('/api/analytics/trend?days=30')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            if (res.body.length > 0) {
                expect(res.body[0]).toHaveProperty('date');
                expect(res.body[0]).toHaveProperty('stock_in');
                expect(res.body[0]).toHaveProperty('stock_out');
            }
        });

        it('should accept custom days parameter', async () => {
            const res = await request(app)
                .get('/api/analytics/trend?days=7')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
        });
    });

    // ─── SALES VS PURCHASES ─────────────────────────────
    describe('GET /api/analytics/sales-purchases', () => {
        it('should return monthly sales vs purchases', async () => {
            const res = await request(app)
                .get('/api/analytics/sales-purchases?months=6')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            if (res.body.length > 0) {
                expect(res.body[0]).toHaveProperty('month');
                expect(res.body[0]).toHaveProperty('purchases');
                expect(res.body[0]).toHaveProperty('sales');
            }
        });
    });

    // ─── TOP RESTOCKED ──────────────────────────────────
    describe('GET /api/analytics/top-restocked', () => {
        it('should return top restocked items', async () => {
            const res = await request(app)
                .get('/api/analytics/top-restocked?limit=5')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    // ─── EXPORTS ────────────────────────────────────────
    describe('GET /api/analytics/export/excel', () => {
        it('should export Excel file', async () => {
            const res = await request(app)
                .get('/api/analytics/export/excel')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/spreadsheetml/);
            expect(res.headers['content-disposition']).toMatch(/inventory_report\.xlsx/);
        });
    });

    describe('GET /api/analytics/export/pdf', () => {
        it('should export PDF file', async () => {
            const res = await request(app)
                .get('/api/analytics/export/pdf')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/pdf/);
            expect(res.headers['content-disposition']).toMatch(/inventory_report\.pdf/);
        });
    });
});
