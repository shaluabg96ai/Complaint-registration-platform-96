import { Router } from 'express';
import { getAllComplaints } from '../controllers/complaints.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/complaints', requireAuth, requireAdmin, getAllComplaints);

export default router;
