import bcrypt from 'bcryptjs';
import models from '../models/index.js';
import { body, validationResult } from 'express-validator';

export const getUsers = async (req, res) => {
  try {
    const users = await models.User.findAll({
      attributes: { exclude: ['password'] }, // Don't return passwords
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await models.User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const createUser = [
  body('username')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters')
    .custom(async (value) => {
      const user = await models.User.findOne({ where: { username: value } });
      if (user) {
        throw new Error('Username already exists');
      }
    }),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .custom(async (value) => {
      const user = await models.User.findOne({ where: { email: value } });
      if (user) {
        throw new Error('Email already exists');
      }
    }),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('fullName')
    .notEmpty()
    .withMessage('Full name is required'),
  body('role')
    .isIn(['maker', 'authorizer', 'admin'])
    .withMessage('Invalid role'),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: errors.array()[0].msg 
        });
      }

      const { username, email, password, fullName, role, isActive = true } = req.body;

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await models.User.create({
        username,
        email,
        password: hashedPassword,
        fullName,
        role,
        isActive
      });

      // Don't return password
      const userResponse = { ...user.toJSON() };
      delete userResponse.password;

      res.status(201).json({
        success: true,
        data: userResponse,
        message: 'User created successfully'
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
];

export const updateUser = [
  body('username')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters')
    .custom(async (value, { req }) => {
      const user = await models.User.findOne({ where: { username: value } });
      if (user && user.id !== parseInt(req.params.id)) {
        throw new Error('Username already exists');
      }
    }),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .custom(async (value, { req }) => {
      const user = await models.User.findOne({ where: { email: value } });
      if (user && user.id !== parseInt(req.params.id)) {
        throw new Error('Email already exists');
      }
    }),
  body('fullName')
    .notEmpty()
    .withMessage('Full name is required'),
  body('role')
    .isIn(['maker', 'authorizer', 'admin'])
    .withMessage('Invalid role'),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: errors.array()[0].msg 
        });
      }

      const { username, email, fullName, role, isActive, password } = req.body;

      const user = await models.User.findByPk(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent users from modifying their own role/status
      if (req.user.id === user.id) {
        if (role !== user.role) {
          return res.status(400).json({ error: 'You cannot change your own role' });
        }
        if (isActive !== user.isActive) {
          return res.status(400).json({ error: 'You cannot change your own status' });
        }
      }

      const updateData = {
        username,
        email,
        fullName,
        role,
        isActive
      };

      // Only update password if provided
      if (password) {
        updateData.password = await bcrypt.hash(password, 12);
      }

      await user.update(updateData);

      // Don't return password
      const userResponse = { ...user.toJSON() };
      delete userResponse.password;

      res.json({
        success: true,
        data: userResponse,
        message: 'User updated successfully'
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
];

export const deleteUser = async (req, res) => {
  try {
    const user = await models.User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent users from deleting themselves
    if (req.user.id === user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};