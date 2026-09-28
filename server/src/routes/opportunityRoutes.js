import { Router } from 'express';
import { getOpportunity, listOpportunities } from '../controllers/opportunityController.js';
import { protectedAccess } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protectedAccess);

router.get('/', listOpportunities);
router.get('/:id', getOpportunity);

export default router;
