import express from 'express';
import { generateBSAReport } from '../controllers/bsaReportController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/bsa', authenticateToken, generateBSAReport);

export default router;