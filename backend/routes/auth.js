import express from 'express';
import { login, getProfile } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/profile', authenticateToken, getProfile);

export default router;