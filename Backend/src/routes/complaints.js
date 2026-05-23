import { Router } from 'express';
import { createComplaint, getMyComplaints } from '../controllers/complaints.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, createComplaint);
router.get('/my', requireAuth, getMyComplaints);

export default router;
