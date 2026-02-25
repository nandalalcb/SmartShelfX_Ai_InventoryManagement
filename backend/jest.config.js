module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    setupFilesAfterSetup: ['./tests/setup.js'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'text-summary', 'lcov'],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/tests/',
        '/seeds/',
        '/migrations/',
        '/uploads/',
    ],
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 70,
            lines: 75,
            statements: 75,
        },
    },
    testTimeout: 30000,
    verbose: true,
    forceExit: true,
    detectOpenHandles: true,
};
