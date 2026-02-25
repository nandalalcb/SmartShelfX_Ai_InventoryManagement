/**
 * SmartShelfX – Test Setup
 * Shared helpers for all backend tests.
 * Uses the live dev database (already seeded) and the running Express app.
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../server');

// ─── Env defaults for testing ────────────────────────────
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_smartshelfx';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// ─── Token Helpers ───────────────────────────────────────
function generateToken(payload, options = {}) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: options.expiresIn || '24h',
    });
}

function generateAdminToken() {
    return generateToken({ id: 1, email: 'admin@smartshelfx.com', role: 'ADMIN', name: 'Admin' });
}

function generateManagerToken() {
    return generateToken({ id: 2, email: 'manager@smartshelfx.com', role: 'MANAGER', name: 'Manager' });
}

function generateVendorToken() {
    return generateToken({ id: 3, email: 'vendor@smartshelfx.com', role: 'VENDOR', name: 'Vendor' });
}

function generateExpiredToken() {
    return generateToken(
        { id: 1, email: 'admin@smartshelfx.com', role: 'ADMIN', name: 'Admin' },
        { expiresIn: '0s' }
    );
}

function generateTamperedToken() {
    return jwt.sign(
        { id: 1, email: 'admin@smartshelfx.com', role: 'ADMIN', name: 'Admin' },
        'wrong_secret_key'
    );
}

// ─── Random Data Helpers ─────────────────────────────────
function randomSKU() {
    return `TEST-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function randomEmail() {
    return `test_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.com`;
}

module.exports = {
    app,
    generateToken,
    generateAdminToken,
    generateManagerToken,
    generateVendorToken,
    generateExpiredToken,
    generateTamperedToken,
    randomSKU,
    randomEmail,
};
