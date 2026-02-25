const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No token provided. Authorization denied.' });
        }

        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired. Please login again.' });
        }
        return res.status(401).json({ error: 'Invalid token. Authorization denied.' });
    }
};

module.exports = auth;
