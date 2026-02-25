const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    // Sequelize validation errors
    if (err.name === 'SequelizeValidationError') {
        const messages = err.errors.map((e) => e.message);
        return res.status(400).json({ error: 'Validation failed', details: messages });
    }

    // Sequelize unique constraint errors
    if (err.name === 'SequelizeUniqueConstraintError') {
        const messages = err.errors.map((e) => e.message);
        return res.status(409).json({ error: 'Duplicate entry', details: messages });
    }

    // Sequelize FK constraint errors
    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ error: 'Referenced record does not exist' });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
    }

    // Multer file errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Max size is 5MB.' });
    }

    // Default
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
    });
};

module.exports = errorHandler;
