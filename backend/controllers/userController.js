import bcrypt from 'bcryptjs';
import models from '../models/index.js';
import { body, validationResult } from 'express-validator';
import ldapService from '../services/ldapService.js';

export const getUsers = async (req, res) => {
  try {
    const users = await models.User.findAll({
      attributes: { exclude: ['password'] },
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

      const { username, email, password, fullName, role, isActive = true, authType = 'local', ldapUsername } = req.body;

      let hashedPassword = null;
      if (authType === 'local' && password) {
        hashedPassword = await bcrypt.hash(password, 12);
      } else if (authType === 'local' && !password) {
        return res.status(400).json({ error: 'Password is required for local users' });
      }

      const user = await models.User.create({
        username,
        email,
        password: hashedPassword,
        fullName,
        role,
        isActive,
        authType,
        ldapUsername: authType === 'ldap' ? ldapUsername : null
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

      const { username, email, fullName, role, isActive, password, authType, ldapUsername } = req.body;

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

      // Prevent changing role for LDAP users
      if (user.authType === 'ldap' && role !== user.role) {
        return res.status(400).json({ error: 'Cannot change role for LDAP users' });
      }

      const updateData = {
        username,
        email,
        fullName,
        role,
        isActive,
        authType: user.authType, // Don't allow changing auth type
        ldapUsername: user.ldapUsername // Don't allow changing ldap username
      };

      // Only update password if provided and user is local
      if (password && user.authType === 'local') {
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

// New LDAP endpoints
export const searchLdapUsers = async (req, res) => {
  try {
    const { searchTerm } = req.query;
    
    if (!searchTerm || searchTerm.length < 3) {
      return res.status(400).json({ error: 'Search term must be at least 3 characters' });
    }

    const users = await ldapService.searchUsers(searchTerm);
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error searching LDAP users:', error);
    res.status(500).json({ error: 'Failed to search LDAP users' });
  }
};

export const getLdapUser = async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await ldapService.getUserByUsername(username);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error getting LDAP user:', error);
    res.status(500).json({ error: 'Failed to get LDAP user' });
  }
};