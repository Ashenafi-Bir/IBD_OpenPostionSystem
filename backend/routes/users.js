import express from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  searchLdapUsers,
  getLdapUser
} from '../controllers/userController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// LDAP routes (accessible to admins)
router.get('/ldap/search', authorize(['admin']), searchLdapUsers);
router.get('/ldap/user/:username', authorize(['admin']), getLdapUser);

// User management routes (only admins)
router.get('/', authorize(['admin']), getUsers);
router.get('/:id', authorize(['admin']), getUser);
router.post('/', authorize(['admin']), createUser);
router.put('/:id', authorize(['admin']), updateUser);
router.delete('/:id', authorize(['admin']), deleteUser);

export default router;