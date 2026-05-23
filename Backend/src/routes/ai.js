import { Router } from 'express';
import { getAiQuestion } from '../controllers/complaints.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/question', requireAuth, getAiQuestion);

export default router;
