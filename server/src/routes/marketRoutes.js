import { Router } from 'express';
import { getMarketSnapshot, syncMarkets } from '../controllers/marketController.js';
import { protectedAccess } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protectedAccess);

router.get('/', getMarketSnapshot);
router.post('/sync', syncMarkets);

export default router;
