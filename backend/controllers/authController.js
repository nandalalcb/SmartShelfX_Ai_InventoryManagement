const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

exports.register = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        const existing = await User.findOne({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || 'VENDOR',
        });

        const token = generateToken(user);

        res.status(201).json({
            message: 'User registered successfully',
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            token,
        });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = generateToken(user);

        res.json({
            message: 'Login successful',
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            token,
        });
    } catch (error) {
        next(error);
    }
};

exports.refreshToken = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const token = generateToken(user);
        res.json({ token });
    } catch (error) {
        next(error);
    }
};

exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
};

exports.getAllUsers = async (req, res, next) => {
    try {
        const { role } = req.query;
        const where = {};
        if (role) where.role = role;

        const users = await User.findAll({
            where,
            attributes: { exclude: ['password'] },
            order: [['created_at', 'DESC']],
        });
        res.json(users);
    } catch (error) {
        next(error);
    }
};
