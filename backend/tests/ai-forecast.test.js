/**
 * SmartShelfX – AI Forecast API Tests
 * Tests: single forecast, batch forecast, fallback prediction, getAllForecasts
 */
const request = require('supertest');
const { app, generateAdminToken, randomSKU } = require('./setup');

let adminToken, testProductId;

beforeAll(async () => {
    adminToken = generateAdminToken();

    // Create a test product
    const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
            name: 'Forecast Test Product',
            sku: randomSKU(),
            current_stock: 30,
            reorder_level: 15,
        });
    testProductId = res.body.product.id;
});

describe('AI Forecast API', () => {
    // ─── SINGLE FORECAST ────────────────────────────────
    describe('GET /api/ai/forecast/:product_id', () => {
        it('should return forecast for a product', async () => {
            const res = await request(app)
                .get(`/api/ai/forecast/${testProductId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('forecast');
            expect(res.body).toHaveProperty('current_stock');
            expect(res.body).toHaveProperty('reorder_level');
            expect(res.body.forecast).toHaveProperty('predicted_demand');
            expect(res.body.forecast).toHaveProperty('risk_level');
            expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(res.body.forecast.risk_level);
        });

        it('should return 404 for non-existent product', async () => {
            const res = await request(app)
                .get('/api/ai/forecast/999999')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(404);
        });

        it('should handle product with no transactions (fallback)', async () => {
            const res = await request(app)
                .get(`/api/ai/forecast/${testProductId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            // With no OUT transactions, fallback should return 0 demand or use fallback method
            expect(res.body.forecast.predicted_demand).toBeGreaterThanOrEqual(0);
        });
    });

    // ─── BATCH FORECAST ─────────────────────────────────
    describe('POST /api/ai/forecast/batch', () => {
        it('should forecast all products', async () => {
            const res = await request(app)
                .post('/api/ai/forecast/batch')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('results');
            expect(Array.isArray(res.body.results)).toBe(true);
            expect(res.body.results.length).toBeGreaterThan(0);

            // Each result should have prediction fields
            const firstResult = res.body.results[0];
            expect(firstResult).toHaveProperty('product_id');
            expect(firstResult).toHaveProperty('predicted_demand');
            expect(firstResult).toHaveProperty('risk_level');
        });
    });

    // ─── GET ALL FORECASTS ──────────────────────────────
    describe('GET /api/ai/forecasts', () => {
        it('should return all saved forecasts', async () => {
            // First generate some forecasts
            await request(app)
                .post('/api/ai/forecast/batch')
                .set('Authorization', `Bearer ${adminToken}`);

            const res = await request(app)
                .get('/api/ai/forecasts')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);

            if (res.body.length > 0) {
                const forecast = res.body[0];
                expect(forecast).toHaveProperty('predicted_demand');
                expect(forecast).toHaveProperty('risk_level');
                expect(forecast).toHaveProperty('product');
            }
        });
    });
});
