import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import models from '../models/index.js';
import config from '../config/config.js';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

export const login = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const { username, password } = req.body;

      const user = await models.User.findOne({ 
        where: { username, isActive: true } 
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      await user.update({ lastLogin: new Date() });

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          fullName: user.fullName
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  }
];

export const getProfile = async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        fullName: req.user.fullName,
        lastLogin: req.user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
};